import asyncio
import json
import os
import uuid
from pathlib import Path
from datetime import datetime
from openai import AsyncOpenAI
from patcher import CodePatcher
from linter import run_linter

client = AsyncOpenAI(
    api_key="YOUR_KEY",  # Expects environment variable or fallback
    base_url="https://api.deepseek.com/v1"
)

STATE_FILE = Path(".agents/teamwork_state.json")

def load_state() -> dict | None:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            STATE_FILE.unlink()
            return None
    return None

def save_state(state: dict):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")

def append_log(state: dict, message: str):
    ts = datetime.now().strftime("%H:%M")
    state.setdefault("fast_logs", []).append(f"[{ts}] {message}")
    if len(state["fast_logs"]) > 20:
        state["fast_logs"] = state["fast_logs"][-20:]
    save_state(state)

def _update_project_plan(state: dict):
    """Append completion summary to implementation_plan.md"""
    tasks = state.get("tasks", {})
    if not tasks or state.get("step") not in ("done", "failed"):
        return
    brain_dir = Path(os.environ.get("ANTIGRAVITY_BRAIN_DIR", 
        r"C:\Users\locthanhit\.gemini\antigravity\brain"))
    conv_id = os.environ.get("ANTIGRAVITY_CONVERSATION_ID", "")
    plan_file = brain_dir / conv_id / "implementation_plan.md"
    if not plan_file.exists():
        # fallback: search state for conversation_id
        sid = state.get("session", "")
        if sid:
            for p in brain_dir.glob("*/implementation_plan.md"):
                plan_file = p
                break
    if not plan_file.exists():
        append_log(state, "plan: no implementation_plan.md found, skip update")
        return

    ok = sum(1 for t in tasks.values() if t.get("status") in ("done", "linter_pass"))
    fail = sum(1 for t in tasks.values() if t.get("status") == "failed")
    lines = []
    for tid, t in tasks.items():
        if t.get("status") in ("done", "linter_pass"):
            lines.append(f"- {tid}: {t.get('file','?')} — {t.get('desc','')[:80]}")
    bullet = "\n".join(lines)

    section = (
        f"\n## {datetime.now().strftime('%Y-%m-%d')} {state.get('plan','Pipeline run')}\n\n"
        f"### Done\n"
        f"Status: {ok}/{ok+fail} tasks done{f' ({fail} failed)' if fail else ''}\n"
        f"{bullet}\n\n"
    )
    if fail:
        failed_ids = [tid for tid, t in tasks.items() if t.get("status") == "failed"]
        section += "### Blockers\n" + "\n".join(f"- {tid}" for tid in failed_ids) + "\n\n"

    current = plan_file.read_text(encoding="utf-8")
    plan_file.write_text(current + section, encoding="utf-8")
    append_log(state, f"plan: updated {plan_file.name}")

def get_log_context(state: dict) -> str:
    logs = state.get("fast_logs", [])[-5:]
    return "\n".join(logs)

def get_relevant_snippet(content: str, keyword: str, window: int = 50) -> str:
    lines = content.splitlines()
    idx = next((i for i, l in enumerate(lines) if keyword in l), len(lines) // 2)
    start = max(0, idx - window)
    end = min(len(lines), idx + window)
    prefix = f"# ... (lines 1-{start} omitted)\n" if start > 0 else ""
    suffix = f"\n# ... (lines {end}-{len(lines)} omitted)" if end < len(lines) else ""
    return prefix + "\n".join(lines[start:end]) + suffix

async def call_llm(
    prompt: str,
    system_msg: str = "",
    require_json: bool = False,
    model: str = "deepseek-chat",
    max_tokens: int = 1000,
) -> dict | str:
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

    try:
        resp = await client.chat.completions.create(**kwargs)
        content = resp.choices[0].message.content
        if require_json:
            return json.loads(content)
        return content
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse error: {e}", "raw": content[:200]}
    except Exception as e:
        return {"error": str(e)} if require_json else f"API_ERROR: {e}"

def serialize_same_file_tasks(tasks: list) -> list:
    """
    Groups tasks by file path, and serializes their execution to avoid race conditions.
    If t1 and t2 both modify 'src/main.py', t2 will depend on t1.
    """
    file_groups = {}
    for task in tasks:
        file_path = task.get("file")
        if file_path:
            file_groups.setdefault(file_path, []).append(task)

    for file_path, group_tasks in file_groups.items():
        if len(group_tasks) > 1:
            # Add dependency sequentially
            for i in range(1, len(group_tasks)):
                prev_id = group_tasks[i-1]["id"]
                if "dep" not in group_tasks[i]:
                    group_tasks[i]["dep"] = []
                if prev_id not in group_tasks[i]["dep"]:
                    group_tasks[i]["dep"].append(prev_id)
    return tasks

async def execute_task(task_id: str, state: dict, linter_cmd: str | None):
    task = state["tasks"][task_id]
    file_path = task["file"]
    action = task.get("action", "modify")
    desc = task["desc"]

    # Wait for dependencies
    for dep_id in task.get("dep", []):
        for _ in range(120):  # max 60s wait
            if state["tasks"].get(dep_id, {}).get("status") in ("done", "failed"):
                break
            await asyncio.sleep(0.5)

    original = ""
    if action == "modify" and Path(file_path).exists():
        original = Path(file_path).read_text(encoding="utf-8")
        snippet = get_relevant_snippet(original, desc.split()[0], window=50)
    else:
        snippet = "(new file)"

    state["tasks"][task_id]["status"] = "running"
    save_state(state)

    user_prompt = (
        f"<context>{get_log_context(state)}</context>\n"
        f"<file path=\"{file_path}\">\n{snippet}\n</file>\n"
        f"<task>Action: {action}\nFile: {file_path}\nDescription: {desc}</task>\n"
        f"<format>{'<<<< SEARCH...====...>>>> REPLACE' if action=='modify' else f'<<<< CREATE {file_path}...>>>> END CREATE'}</format>"
    )
    coder_system = (
        "You are an Expert Coder. Output ONLY search/replace or create blocks. "
        "No explanation. No markdown. Match whitespace exactly. If unsure: UNCLEAR: <reason>."
    )

    for attempt in range(3):
        agent_resp = await call_llm(user_prompt, system_msg=coder_system, require_json=False, max_tokens=800)

        if agent_resp.startswith("API_ERROR"):
            append_log(state, f"{task_id} API error attempt {attempt+1}")
            continue

        success, new_content, msg = CodePatcher.apply_patch(original, agent_resp)

        if not success:
            append_log(state, f"{task_id} patch fail attempt {attempt+1}: {msg[:60]}")
            user_prompt += f"\n<error>Previous attempt failed: {msg}\nFix the SEARCH block to match exactly.</error>"
            continue

        CodePatcher.write_result(file_path, new_content, action)

        lint_pass, lint_msg = run_linter(file_path, linter_cmd)
        if lint_pass:
            state["tasks"][task_id]["status"] = "linter_pass"
            state["tasks"][task_id]["output"] = agent_resp[:200]
            append_log(state, f"{task_id} Done (lint PASS)")
            save_state(state)
            return {"id": task_id, "status": "done"}

        append_log(state, f"{task_id} lint FAIL attempt {attempt+1}: {lint_msg[:60]}")
        original = new_content
        user_prompt += f"\n<lint_error>{lint_msg}</lint_error>\nFix the lint errors above."

    state["tasks"][task_id]["status"] = "failed"
    state["failed"].append(task_id)
    append_log(state, f"{task_id} FAILED after 3 attempts")
    save_state(state)
    return {"id": task_id, "status": "failed"}

async def run_review_loop(state: dict, linter_cmd: str | None):
    linter_summary = "\n".join(f"{tid}: {t.get('status','?')}" for tid, t in state["tasks"].items())
    changes_summary = "\n".join(
        t.get("output", "") for t in state["tasks"].values() if t.get("status") == "linter_pass"
    )
    reviewer_system = (
        "You are a Code Reviewer. Output JSON only: {\"status\":\"PASS|FAIL\",\"issues\":[...]}. "
        "Only report REAL bugs. If all good → PASS."
    )

    for loop_idx in range(5):
        reviewer_prompt = (
            f"<task_summary>{state.get('plan','')}</task_summary>\n"
            f"<changes>{changes_summary[:1500]}</changes>\n"
            f"<lint>{linter_summary}</lint>\n"
            f"<history>{get_log_context(state)}</history>"
        )
        review = await call_llm(reviewer_prompt, system_msg=reviewer_system, require_json=True, max_tokens=600)

        if review.get("status") == "PASS":
            append_log(state, f"Review PASS (loop {loop_idx+1})")
            state["step"] = "done"
            _update_project_plan(state)
            save_state(state)
            return

        issues = review.get("issues", [])
        append_log(state, f"Review FAIL loop {loop_idx+1}: {len(issues)} issues")

        if loop_idx < 3 and issues:
            for issue in issues:
                tid = issue.get("task_id")
                if tid and tid in state["tasks"]:
                    state["tasks"][tid]["status"] = "pending"
                    state["tasks"][tid].pop("output", None)
            broken_tasks = [i["task_id"] for i in issues if i.get("task_id")]
            if broken_tasks:
                await asyncio.gather(*[execute_task(tid, state, linter_cmd) for tid in set(broken_tasks) if tid in state["tasks"]])

    append_log(state, "Review FAIL after 5 loops — escalate")
    state["step"] = "failed"
    _update_project_plan(state)
    save_state(state)

async def run_pipeline(raw_prompt: str, project_context: dict = None):
    state = {
        "session": str(uuid.uuid4())[:8],
        "step": "detect_context",
        "plan": "",
        "tasks": {},
        "failed": [],
        "fast_logs": [],
    }
    append_log(state, "Pipeline started")

    # Step 1: Detect project context first to guide Refiner
    if not project_context:
        root_files = [f.name for f in Path(".").iterdir() if f.is_file()]
        project_context = await call_llm(
            f"<files>{root_files}</files>",
            system_msg="You are a Project Context Detector. Output JSON.",
            require_json=True
        )
    linter_cmd = project_context.get("linter_cmd")
    append_log(state, f"Context detected: {project_context.get('language', 'unknown')}")

    # Step 2: Refine prompt with codebase context
    state["step"] = "refine"
    refined = await call_llm(
        f"<context>{json.dumps(project_context)}</context>\n<request>{raw_prompt}</request>",
        system_msg="You are a Prompt Refiner. Normalize the request into structured JSON incorporating codebase context. Output JSON only.",
        require_json=True
    )
    if "error" in refined:
        append_log(state, f"Refine failed: {refined['error']}")
        state["step"] = "failed"
        return state
    state["step"] = "plan"
    append_log(state, f"Refine OK: {refined.get('summary','')[:60]}")

    # Step 3: Plan
    plan = await call_llm(
        json.dumps({"context": project_context, "request": refined}),
        system_msg="You are an Expert Planner. Output a JSON plan. No new frameworks.",
        require_json=True,
        max_tokens=600
    )
    state["step"] = "task_break"
    state["plan"] = plan.get("plan", [""])[0][:80]
    append_log(state, f"Plan: {len(plan.get('plan', []))} steps")

    # Step 4: Task breakdown
    task_list = await call_llm(
        json.dumps(plan),
        system_msg="You are an Expert Task-Breaker. Output JSON array of tasks. No text outside JSON.",
        require_json=True,
        max_tokens=600
    )
    if isinstance(task_list, dict) and "error" in task_list:
        append_log(state, f"Task-break failed: {task_list['error']}")
        state["step"] = "failed"
        return state

    # Step 4.5: Serialize tasks modifying the same file to prevent conflicts (Race Conditions)
    task_list = serialize_same_file_tasks(task_list)

    state["tasks"] = {t["id"]: {**t, "status": "pending"} for t in task_list}
    state["step"] = "executing"
    append_log(state, f"Tasks initialized: {len(task_list)} (serialized same-file tasks)")
    save_state(state)

    done_set = set()
    all_ids = set(state["tasks"].keys())

    while done_set != all_ids:
        ready = {
            tid for tid in all_ids
            if tid not in done_set
            and state["tasks"][tid]["status"] == "pending"
            and all(state["tasks"].get(d, {}).get("status") in ("done","linter_pass","failed") for d in state["tasks"][tid].get("dep", []))
        }
        if not ready:
            await asyncio.sleep(0.5)
            still_pending = {tid for tid in all_ids if state["tasks"][tid]["status"] == "pending"}
            if not still_pending:
                break
            continue

        results = await asyncio.gather(*[execute_task(tid, state, linter_cmd) for tid in ready])
        for r in results:
            done_set.add(r["id"])

    await run_review_loop(state, linter_cmd)
    return state
