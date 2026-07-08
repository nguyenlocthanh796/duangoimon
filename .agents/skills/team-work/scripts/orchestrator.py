import asyncio
import json
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime
from openai import AsyncOpenAI
from patcher import CodePatcher
from linter import run_linter

# --- Logging Setup ---
LOG_FILE = Path(".agents/teamwork_debug.log")
LOG_FILE.parent.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, mode='w', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logging.info("Orchestrator script started.")

# --- Model Tiers (100% Free via 9Router + opencode) ---
# Benchmark-optimized per step:
#   detect/refine        hy3-free                (JSON nhanh 2.6s)
#   plan/breakdown       north-mini-code-free    (output dai, tranh sot task)
#   coder                big-pickle              (code chat nhat)
#   reviewer             deepseek-v4-flash-free  (consistency, ban quen)
#   linter fix           north-mini-code-free    (can bang)
#   fallback             deepseek-v4-flash-free
TIER = {
    "fast":    os.environ.get("TEAMWORK_MODEL_FAST",    "oc/hy3-free"),
    "medium":  os.environ.get("TEAMWORK_MODEL_MEDIUM",  "oc/north-mini-code-free"),
    "strong":  os.environ.get("TEAMWORK_MODEL_STRONG",  "oc/big-pickle"),
    "review":  os.environ.get("TEAMWORK_MODEL_REVIEW",  "oc/deepseek-v4-flash-free"),
    "fix":     os.environ.get("TEAMWORK_MODEL_FIX",     "oc/north-mini-code-free"),
    "fallback": os.environ.get("TEAMWORK_MODEL_FALLBACK","oc/deepseek-v4-flash-free"),
}

# --- API Client (9Router) ---
NINEROUTER_URL = os.environ.get("NINEROUTER_URL", "http://localhost:20128")
NINEROUTER_KEY = os.environ.get("NINEROUTER_KEY", "")

try:
    headers = {}
    if NINEROUTER_KEY:
        headers["Authorization"] = f"Bearer {NINEROUTER_KEY}"
    client = AsyncOpenAI(
        api_key=NINEROUTER_KEY or "sk-no-key",
        base_url=f"{NINEROUTER_URL}/v1",
        default_headers=headers,
    )
    logging.info(f"9Router client: {NINEROUTER_URL}/v1")
except Exception as e:
    logging.error(f"9Router init failed: {e}")
    client = None

# --- State Management ---
STATE_FILE = Path(".agents/teamwork_state.json")

def load_state() -> dict | None:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception as e:
            logging.error(f"State load failed: {e}")
            STATE_FILE.unlink()
            return None
    return None

def save_state(state: dict):
    try:
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception as e:
        logging.error(f"State save failed: {e}")

def append_log(state: dict, message: str):
    ts = datetime.now().strftime("%H:%M")
    log = f"[{ts}] {message}"
    state.setdefault("fast_logs", []).append(log)
    if len(state["fast_logs"]) > 20:
        state["fast_logs"] = state["fast_logs"][-20:]
    logging.info(f"Log: {message}")
    save_state(state)

# --- Helpers ---

def _update_project_plan(state: dict):
    brain = os.environ.get("ANTIGRAVITY_BRAIN_DIR",
        rf"C:\Users\locthanhit\.gemini\antigravity\brain\{os.environ.get('ANTIGRAVITY_CONVERSATION_ID', 'unknown')}")
    plan = Path(brain) / "implementation_plan.md"
    if not plan.exists():
        return
    try:
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        sec = f"\n## [{now}] Teamwork Pipeline\nStatus: {state.get('step','?')}\n"
        if state.get("failed"):
            sec += f"Failed: {', '.join(state['failed'])}\n"
        for l in state.get("fast_logs", [])[-5:]:
            sec += f"- {l}\n"
        with open(plan, "a", encoding="utf-8") as f:
            f.write(sec)
    except Exception as e:
        logging.error(f"Plan update failed: {e}")

def get_log_context(state: dict) -> str:
    return "\n".join(state.get("fast_logs", [])[-5:])

def get_relevant_snippet(content: str, keyword: str, window: int = 50) -> str:
    i = content.lower().find(keyword.lower())
    if i == -1:
        return ""
    s = max(0, i - window)
    e = min(len(content), i + len(keyword) + window)
    return content[s:e]


async def call_llm(
    prompt: str,
    system_msg: str = "",
    require_json: bool = False,
    tier: str = "fast",
    max_tokens: int = 4000,
) -> dict | str:
    if not client:
        return {"error": "NINEROUTER_URL not set"} if require_json else "API_ERROR: NINEROUTER_URL not set"

    model = TIER.get(tier, TIER["fallback"])
    messages = []
    if system_msg:
        messages.append({"role": "system", "content": system_msg})
    messages.append({"role": "user", "content": prompt})

    kwargs = {
        "model": model,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": max_tokens,
    }
    if require_json:
        kwargs["response_format"] = {"type": "json_object"}

    for attempt in range(2):
        try:
            resp = await client.chat.completions.create(**kwargs)
            content = resp.choices[0].message.content
            if require_json:
                return json.loads(content)
            return content
        except json.JSONDecodeError as e:
            return {"error": f"JSON parse: {e}", "raw": content[:200]}
        except Exception as e:
            if attempt == 0:
                logging.warning(f"LLM error (retry fallback): {e}")
                kwargs["model"] = TIER["fallback"]
                continue
            return {"error": str(e)} if require_json else f"API_ERROR: {e}"
    return {"error": "max retries"} if require_json else "API_ERROR: max retries"


def serialize_same_file_tasks(tasks: list) -> list:
    """Add dep edges to serialize same-file tasks."""
    fm = {}
    for t in tasks:
        f = t.get("file", "")
        fm.setdefault(f, []).append(t["id"])
    for t in tasks:
        f = t.get("file", "")
        sibs = [x for x in fm.get(f, []) if x != t["id"] and x < t["id"]]
        if sibs:
            existing = set(t.get("dep", []))
            existing.update(sibs)
            t["dep"] = list(existing)
    return tasks


async def execute_task(tid: str, prompt: str, file_path: str, action: str, state: dict, linter_cmd: str | None) -> bool:
    append_log(state, f"Exec {tid} ({action}: {file_path})")

    for attempt in range(3):
        original = ""
        if action == "modify":
            try:
                original = Path(file_path).read_text(encoding="utf-8")
            except Exception as e:
                append_log(state, f"{tid}: read fail: {e}")
                state.setdefault("failed", []).append(tid)
                return False

        sys = f"Coder agent. File: {file_path}. Action: {action}."
        if action == "create":
            sys += f"\nFormat:\n<<<< CREATE {file_path}\n<content>\n>>>> END CREATE"
        else:
            sys += "\nFormat:\n<<<< SEARCH\n<exact lines>\n====\n<new lines>\n>>>> REPLACE"

        cp = f"Task: {prompt}\n"
        if original:
            cp += f"Current:\n```\n{original}\n```\n"

        resp = await call_llm(cp, system_msg=sys, tier="strong", max_tokens=8000)
        if isinstance(resp, dict) and "error" in resp:
            append_log(state, f"{tid} LLM err attempt {attempt+1}: {resp['error']}")
            continue

        ok, new_content, msg = CodePatcher.apply_patch(original, resp)
        if not ok:
            append_log(state, f"{tid} patch fail attempt {attempt+1}: {msg}")
            continue

        CodePatcher.write_result(file_path, new_content, action)

        lint_ok, lint_msg = run_linter(file_path, linter_cmd)
        if lint_ok:
            append_log(state, f"{tid} OK (attempt {attempt+1})")
            state.setdefault("changes", []).append({"file": file_path, "tid": tid})
            return True

        append_log(state, f"{tid} lint fail attempt {attempt+1}")
        if attempt < 2:
            fix = await call_llm(
                f"Fix lint in {file_path}:\n{lint_msg}\n\n```\n{new_content}\n```",
                system_msg="Fix lint. Output SEARCH/REPLACE.",
                tier="fix", max_tokens=4000)
            if isinstance(fix, str):
                _, new_content, _ = CodePatcher.apply_patch(new_content, fix)
                CodePatcher.write_result(file_path, new_content, action)

    append_log(state, f"{tid} FAILED after 3 attempts")
    state.setdefault("failed", []).append(tid)
    return False


async def run_review_loop(state: dict, linter_cmd: str | None) -> bool:
    append_log(state, "Review start")
    for loop in range(5):
        changes = state.get("changes", [])
        if not changes:
            break
        fixed_any = False
        for ch in changes:
            fp = ch.get("file", "")
            try:
                content = Path(fp).read_text(encoding="utf-8")
            except:
                continue
            review = await call_llm(
                f"Review:\n{fp}\n```\n{content}\n```",
                system_msg="Code reviewer. If bugs found, output SEARCH/REPLACE. If OK, reply 'REVIEW_OK'.",
                tier="review", max_tokens=4000)
            if isinstance(review, str) and "REVIEW_OK" not in review and ("<<<<" in review):
                try:
                    orig = Path(fp).read_text(encoding="utf-8")
                    ok, nc, _ = CodePatcher.apply_patch(orig, review)
                    if ok:
                        CodePatcher.write_result(fp, nc, "modify")
                        fixed_any = True
                        append_log(state, f"Review fix: {fp}")
                except:
                    pass
        if not fixed_any:
            append_log(state, "Review passed")
            return True
        append_log(state, f"Review loop {loop+1}: fixed")
    append_log(state, "Review max loops")
    return False


async def run_pipeline(raw_prompt: str, project_context: dict = None):
    logging.info("--- Pipeline Start ---")
    state = {
        "session": str(uuid.uuid4())[:8],
        "step": "init", "plan": "", "tasks": {},
        "failed": [], "changes": [], "fast_logs": [],
    }
    append_log(state, "Pipeline started")

    # 1. Detect context
    state["step"] = "detect_context"
    if not project_context:
        try:
            root = [f.name for f in Path(".").iterdir() if f.is_file()]
            project_context = await call_llm(
                f"<files>{root}</files>",
                system_msg="Detect project context. JSON keys: language, framework, build_system, linter_cmd.",
                require_json=True, tier="fast")
            if "error" in project_context:
                raise Exception(project_context["error"])
        except Exception as e:
            append_log(state, f"Context fail: {e}")
            state["step"] = "failed"
            save_state(state)
            return state
    linter_cmd = project_context.get("linter_cmd")
    append_log(state, f"Context: {project_context.get('language','?')}")

    # 2. Refine
    state["step"] = "refine"
    try:
        refined = await call_llm(
            f"<ctx>{json.dumps(project_context)}</ctx>\n<req>{raw_prompt}</req>",
            system_msg="Normalize into JSON. Keys: summary, tasks (array of {id,action,file,desc}).",
            require_json=True, tier="medium")
        if "error" in refined:
            raise Exception(refined["error"])
        append_log(state, f"Refine: {str(refined.get('summary',''))[:60]}")
    except Exception as e:
        append_log(state, f"Refine fail: {e}")
        state["step"] = "failed"
        save_state(state)
        return state

    # 3. Breakdown
    state["step"] = "breakdown"
    tasks = refined.get("tasks", [])
    if not tasks:
        tasks = [{"id":"t1","action":"modify","file":"","desc":raw_prompt[:100]}]
    tasks = serialize_same_file_tasks(tasks)
    state["tasks"] = {t["id"]: {**t, "status":"pending"} for t in tasks}
    append_log(state, f"Tasks: {len(tasks)}")

    # 4. Execute
    state["step"] = "execute"
    tm = {t["id"]:t for t in tasks}
    done = set()
    for _ in range(30):
        ready = [t for tid,t in tm.items()
                 if tid not in done and tid not in state.get("failed",[])
                 and all(d in done for d in t.get("dep",[]))]
        if not ready:
            break
        for t in ready:
            fp = t.get("file","") or f"tmp_{t['id']}.txt"
            await execute_task(t["id"], t.get("desc",""), fp, t.get("action","modify"), state, linter_cmd)
            done.add(t["id"])
    append_log(state, f"Done: {len(done)}/{len(tm)} tasks")

    # 5. Review
    if not state.get("failed"):
        state["step"] = "review"
        await run_review_loop(state, linter_cmd)

    state["step"] = "done" if not state.get("failed") else "partial_fail"
    append_log(state, f"Finish: {state['step']}")
    _update_project_plan(state)
    save_state(state)
    logging.info("--- Pipeline End ---")
    return state


async def main():
    import sys
    if len(sys.argv) > 1:
        raw_prompt = sys.argv[1]
    else:
        exist = load_state()
        if exist and exist.get("step") not in ("done","failed"):
            ans = input(f"Resume pipeline at step={exist.get('step')}? [y/n]: ").lower()
            if ans == "y":
                logging.info("Resume NYI, starting fresh")
        conv = os.environ.get("ANTIGRAVITY_CONVERSATION_ID", "00613fdb-d6a9-455c-933b-0d3cef205416")
        plan = Path(rf"C:\Users\locthanhit\.gemini\antigravity\brain\{conv}\implementation_plan.md")
        if not plan.exists():
            logging.error("implementation_plan.md not found")
            return
        raw_prompt = plan.read_text(encoding="utf-8")

    final = await run_pipeline(raw_prompt)
    logging.info(f"Done: {final.get('step')}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        logging.error(f"Fatal: {e}", exc_info=True)
