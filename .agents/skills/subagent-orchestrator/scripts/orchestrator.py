"""
Multi-Agent Orchestrator — routes tasks to specialized subagents using function calling.
DeepSeek V4 Flash decides which agent to call based on the task.
"""

import asyncio
import json
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime
from openai import AsyncOpenAI

from shared_memory import SharedMemory
from context_manager import ContextManager
from agents import run_subagent

# --- Logging ---
LOG_FILE = Path(".agents/subagent_orchestrator_debug.log")
LOG_FILE.parent.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, mode="w", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# --- 9Router Client ---
NINEROUTER_URL = os.environ.get("NINEROUTER_URL", "http://localhost:20128")
NINEROUTER_KEY = os.environ.get("NINEROUTER_KEY", "")


def _create_client() -> AsyncOpenAI:
    headers = {}
    if NINEROUTER_KEY:
        headers["Authorization"] = f"Bearer {NINEROUTER_KEY}"
    return AsyncOpenAI(
        api_key=NINEROUTER_KEY or "sk-no-key",
        base_url=f"{NINEROUTER_URL}/v1",
        default_headers=headers,
    )


# --- Model Configuration (Simplified: 2 models only) ---
# Use environment variable DEFAULT_MODEL to switch between:
#   "oc/deepseek-v4-flash-free"  - 100% free, nhanh, reliable
#   "gc/gemini-2.5-pro"          - chất lượng cao hơn (cần Gemini API key)
DEFAULT_MODEL = os.environ.get("DEFAULT_MODEL", "oc/deepseek-v4-flash-free")
FALLBACK_MODEL = "oc/deepseek-v4-flash-free" if DEFAULT_MODEL == "gc/gemini-2.5-pro" else "gc/gemini-2.5-pro"

MODEL_TIERS = {
    "orchestrator": {"primary": DEFAULT_MODEL, "fallback": FALLBACK_MODEL},
    "context":      {"primary": DEFAULT_MODEL, "fallback": FALLBACK_MODEL},
    "planning":     {"primary": DEFAULT_MODEL, "fallback": FALLBACK_MODEL},
    "code":         {"primary": DEFAULT_MODEL, "fallback": FALLBACK_MODEL},
    "review":       {"primary": DEFAULT_MODEL, "fallback": FALLBACK_MODEL},
    "research":     {"primary": DEFAULT_MODEL, "fallback": FALLBACK_MODEL},
    "synthesize":   {"primary": DEFAULT_MODEL, "fallback": FALLBACK_MODEL},
}

# --- Orchestrator Tools ---
ORCHESTRATOR_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "research_task",
            "description": "Delegate a research/investigation task to a Research Agent. Use when you need analysis, exploration, or gathering information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "task": {"type": "string", "description": "The research question or topic to investigate"},
                    "context": {"type": "string", "description": "Relevant context for the research"},
                    "key_questions": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Specific questions to answer",
                    },
                },
                "required": ["task"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "code_task",
            "description": "Delegate a code generation/modification task to a Code Agent. Use when you need to write, modify, or generate code.",
            "parameters": {
                "type": "object",
                "properties": {
                    "specification": {"type": "string", "description": "Detailed code specification"},
                    "language": {"type": "string", "description": "Programming language"},
                    "file_path": {"type": "string", "description": "Target file path"},
                    "action": {"type": "string", "enum": ["create", "modify"], "description": "Create new file or modify existing"},
                    "existing_code": {"type": "string", "description": "Current file content (for modify)"},
                },
                "required": ["specification", "language", "file_path", "action"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "review_task",
            "description": "Delegate a code review task to a Review Agent. Use when code needs checking for bugs, security, or quality.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Path to file being reviewed"},
                    "code": {"type": "string", "description": "Code content to review"},
                    "focus": {
                        "type": "string",
                        "enum": ["bugs", "security", "performance", "general"],
                        "description": "Review focus area",
                    },
                },
                "required": ["file_path", "code", "focus"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "synthesize",
            "description": "Combine results from multiple agents into a final coherent output. Use at the end to produce the final result.",
            "parameters": {
                "type": "object",
                "properties": {
                    "agent_results": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Results from agents to synthesize",
                    },
                    "format": {
                        "type": "string",
                        "enum": ["report", "code", "summary"],
                        "description": "Output format",
                    },
                },
                "required": ["agent_results", "format"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "final_response",
            "description": "Submit the final response. Call this when all work is complete and you have a final result.",
            "parameters": {
                "type": "object",
                "properties": {
                    "result": {"type": "string", "description": "The final response to the user"},
                    "summary": {"type": "string", "description": "Brief summary of what was done"},
                },
                "required": ["result", "summary"],
            },
        },
    },
]


class SubagentOrchestrator:
    """Multi-agent orchestrator using function calling routing."""

    def __init__(self):
        self.client = _create_client()
        self.memory = SharedMemory()
        self.ctx = ContextManager()
        self.session = str(uuid.uuid4())[:8]
        self.round = 0
        self.max_rounds = 20
        self.failures = {}  # model -> fail_count for circuit breaker
        self.results = {}  # Track agent results

    def _get_model(self, tier: str) -> str:
        """Get model for a tier, with circuit breaker fallback."""
        config = MODEL_TIERS.get(tier, MODEL_TIERS["orchestrator"])
        primary = config["primary"]
        if self.failures.get(primary, 0) >= 3:
            logger.warning(f"Circuit breaker: {primary} failed 3+ times, using fallback")
            return config["fallback"]
        return primary

    def _record_failure(self, model: str):
        """Record a model failure for circuit breaker."""
        self.failures[model] = self.failures.get(model, 0) + 1
        logger.info(f"Circuit breaker: {model} failures = {self.failures[model]}")

    def _record_success(self, model: str):
        """Reset failure count on success."""
        self.failures[model] = 0

    async def call_llm(self, messages: list, tier: str = "orchestrator",
                        tools: list = None, tool_choice: str = "auto",
                        max_tokens: int = 4000, temperature: float = 0.1,
                        require_json: bool = False):
        """Call LLM with model tier routing and circuit breaker."""
        model = self._get_model(tier)

        for attempt in range(2):  # primary then fallback
            try:
                kwargs = {
                    "model": model,
                    "messages": self.ctx.truncate(messages, 8000),
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                }
                if require_json:
                    # Gemini models don't support json_object response_format
                    # Use tool-based parsing instead with fallback models
                    # Avoid gc/ models for JSON mode
                    pass
                if tools:
                    kwargs["tools"] = tools
                    kwargs["tool_choice"] = tool_choice

                resp = await self.client.chat.completions.create(**kwargs)
                self._record_success(model)
                return resp

            except Exception as e:
                logger.warning(f"LLM call failed ({model}): {e}")
                self._record_failure(model)
                if attempt == 0:
                    model = MODEL_TIERS.get(tier, MODEL_TIERS["orchestrator"])["fallback"]
                    logger.info(f"Fallback to: {model}")
                    continue
                raise

    async def analyze_request(self, user_request: str) -> dict:
        """Phase 1: Use context detector to understand the request."""
        logger.info(f"[{self.session}] Analyzing request: {user_request[:80]}...")

        messages = [
            {
                "role": "system",
                "content": "You are a Context Analyzer. Extract structured info from user requests. "
                           "Respond with JSON only. Keys: task_type, language, complexity, requires_research, requires_code, requires_review.",
            },
            {"role": "user", "content": f"Analyze this request and return JSON:\n{user_request}"},
        ]

        analysis = {}
        for attempt_tier in ["context", "planning", "orchestrator"]:
            try:
                resp = await self.call_llm(messages, tier=attempt_tier, max_tokens=1000)
                content = resp.choices[0].message.content
                if content:
                    try:
                        analysis = json.loads(content)
                        break
                    except json.JSONDecodeError:
                        # Try to extract JSON from text (Gemini often wraps in ```json)
                        import re
                        json_match = re.search(r'\{[^{}]*"task_type"[^{}]*\}', content, re.DOTALL)
                        if json_match:
                            analysis = json.loads(json_match.group())
                            break
                        block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
                        if block_match:
                            analysis = json.loads(block_match.group(1))
                            break
                        logger.warning(f"Analysis attempt ({attempt_tier}) not JSON: {content[:100]}")
                        continue
            except Exception as e:
                logger.warning(f"Analysis attempt ({attempt_tier}) failed: {e}")
                continue

        if not analysis:
            analysis = {
                "task_type": "general",
                "language": "python",
                "complexity": "medium",
                "requires_research": False,
                "requires_code": True,
                "requires_review": True,
            }

        self.memory.set("user_request", user_request)
        self.memory.set("analysis", analysis)
        logger.info(f"Analysis: {json.dumps(analysis)}")
        return analysis

    async def plan_tasks(self, analysis: dict, user_request: str) -> list:
        """Phase 2: Use planner to break down into subtasks."""
        logger.info("[Planner] Breaking down into subtasks...")

        messages = [
            {
                "role": "system",
                "content": "You are a Task Planner. Break down the user request into specific subtasks. "
                           "Respond with JSON only. Format: {\"tasks\": [{\"agent\": \"code|research|review|synthesize\", "
                           "\"description\": \"...\", \"priority\": 1-5}]}. "
                           "Do NOT include depends_on - dependency serialization will be handled automatically. "
                           "Each task should be independent (can run in parallel). "
                           "List ALL tasks needed to complete the request.",
            },
            {"role": "user", "content": f"Request: {user_request}\nAnalysis: {json.dumps(analysis)}"},
        ]

        resp = None
        for attempt_tier in ["planning", "orchestrator", "context"]:
            try:
                resp = await self.call_llm(messages, tier=attempt_tier, max_tokens=2000)
                content = resp.choices[0].message.content
                if content:
                    try:
                        tasks_data = json.loads(content)
                    except json.JSONDecodeError:
                        import re
                        # Try extracting array
                        arr_match = re.search(r'\[[\s\S]*\]', content)
                        if arr_match:
                            tasks_data = json.loads(arr_match.group())
                        else:
                            # Try extracting from JSON block
                            block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
                            if block_match:
                                inner = json.loads(block_match.group(1))
                                tasks_data = inner.get("tasks", [inner])
                            else:
                                raise
                    if isinstance(tasks_data, list):
                        tasks = tasks_data
                    elif isinstance(tasks_data, dict):
                        tasks = tasks_data.get("tasks", [tasks_data])
                    else:
                        tasks = []
                    if tasks:
                        break
            except Exception as e:
                logger.warning(f"Plan attempt ({attempt_tier}) failed: {e}")
                continue

        if not tasks:
            tasks = [
                {"agent": "code", "description": f"Implement: {user_request[:200]}", "priority": 1},
            ]

        if not isinstance(tasks, list):
            tasks = [tasks]

        # Assign sequential IDs, no dependencies (parallel by default)
        for i, t in enumerate(tasks):
            t["id"] = f"task_{i}"
            t["depends_on"] = []

        self.memory.set("plan", {"tasks": tasks, "total": len(tasks)})
        logger.info(f"Plan: {len(tasks)} subtasks")
        for i, t in enumerate(tasks):
            logger.info(f"  [{i}] {t['agent']}: {t['description'][:60]}")
        return tasks

    async def execute_tasks(self, tasks: list) -> list:
        """Phase 3: Execute subtasks in parallel (all independent)."""
        logger.info(f"[{self.session}] Executing {len(tasks)} tasks...")

        completed = {}
        results = []

        async def run_task(task):
            logger.info(f"  -> Running {task['agent']}: {task['description'][:60]}...")
            context = self.memory.get_recent(3)

            result = await run_subagent(
                self.client, self._get_model(task["agent"]),
                task["agent"], task["description"], context,
            )

            # Store in shared memory
            self.memory.set(f"result_{task['id']}", result)
            return {"task_id": task["id"], "agent": task["agent"], "result": result}

        # Run ALL tasks in parallel (no dependencies)
        batch_results = await asyncio.gather(*[run_task(t) for t in tasks])
        for r in batch_results:
            completed[r["task_id"]] = r
            results.append(r)
            logger.info(f"  ✓ {r['agent']}: {r['task_id']} done")

        self.memory.set("execution_complete", True)
        logger.info(f"Completed {len(completed)}/{len(tasks)} tasks")
        return results

    async def orchestrate(self, analysis: dict, user_request: str) -> dict:
        """Full orchestration loop: analyze -> plan -> execute -> synthesize."""
        logger.info(f"[{self.session}] ===== Multi-Agent Orchestration Start =====")

        # Phase 1: Plan
        tasks = await self.plan_tasks(analysis, user_request)

        # Phase 2: Execute (parallel subagents)
        results = await self.execute_tasks(tasks)

        # Phase 3: Synthesize all results into final response
        logger.info("[Orchestrator] Synthesizing final response...")

        # Build synthesis from all agent results
        synthesis_parts = []
        for r in results:
            agent_name = r["agent"]
            agent_result = r["result"].get("result", "")
            files = r["result"].get("files_created", [])
            part = f"=== {agent_name.upper()} ({r['task_id']}) ===\n{agent_result}"
            if files:
                part += f"\nFiles: {', '.join(files)}"
            synthesis_parts.append(part)

        combined = "\n\n".join(synthesis_parts)

        synthesis_prompt = f"""Synthesize the following agent results into a coherent final response.

User Request: {user_request}

Full Results from all agents:
{combined[:5000]}

Provide a complete, well-organized final response. Include all code and analysis.
Use the final_response tool when done."""

        messages = [
            {
                "role": "system",
                "content": "You are the Orchestrator. Review results from your sub-agents and produce the final output. "
                           "If code was generated, present it clearly with file paths. "
                           "If research was done, summarize findings. "
                           "Always call final_response tool with the complete result.",
            },
            {"role": "user", "content": synthesis_prompt},
        ]

        final_resp = await self.call_llm(
            messages, tier="orchestrator",
            tools=ORCHESTRATOR_TOOLS, max_tokens=8000,
        )

        # Extract final result
        msg = final_resp.choices[0].message
        final_result = {
            "session": self.session,
            "tasks_completed": len(results),
            "tasks_total": len(tasks),
            "agent_results": results,
            "response": "",
            "summary": "",
        }

        if msg.tool_calls:
            for tc in msg.tool_calls:
                if tc.function.name == "final_response":
                    try:
                        args = json.loads(tc.function.arguments)
                        final_result["response"] = args.get("result", "")
                        final_result["summary"] = args.get("summary", "")
                    except json.JSONDecodeError:
                        final_result["response"] = msg.content or ""

        # Fallback: if no final_response tool call, use combined results
        if not final_result["response"]:
            final_result["response"] = combined[:10000]
            final_result["summary"] = f"Completed {len(results)}/{len(tasks)} tasks via multi-agent orchestration"

        self.memory.set("final_result", final_result)
        logger.info(f"[{self.session}] ===== Orchestration Complete =====")
        return final_result

    async def run(self, user_request: str) -> dict:
        """Main entry point: full orchestration pipeline."""
        try:
            # Step 1: Analyze
            analysis = await self.analyze_request(user_request)

            # Step 2: Orchestrate (plan → execute → synthesize)
            result = await self.orchestrate(analysis, user_request)

            return result

        except Exception as e:
            logger.error(f"Orchestration failed: {e}", exc_info=True)
            return {
                "error": str(e),
                "session": self.session,
                "partial_results": self.results,
            }
