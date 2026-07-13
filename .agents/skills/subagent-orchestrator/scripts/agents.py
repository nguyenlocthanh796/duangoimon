"""
Subagents — each subagent is a specialized LLM call with its own role and tools.
Uses function calling internally for structured communication back to orchestrator.
"""

import json
import logging
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)


SUBAGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "agent_response",
            "description": "Submit your final response back to the orchestrator",
            "parameters": {
                "type": "object",
                "properties": {
                    "result": {"type": "string", "description": "Your detailed output/result"},
                    "confidence": {"type": "number", "description": "Confidence 0-1"},
                    "needs_review": {"type": "boolean", "description": "Whether this needs another agent to review"},
                    "next_agent": {
                        "type": "string",
                        "enum": ["review", "code", "research", "synthesize", "none"],
                        "description": "Suggested next agent to process this",
                    },
                    "files_created": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Files created or modified",
                    },
                },
                "required": ["result", "confidence"],
            },
        }
    }
]


def _make_system_prompt(role: str, context: str = "") -> str:
    """Generate system prompt for a subagent role."""
    prompts = {
        "research": f"""You are a Research Agent. You MUST output the actual research findings, not a plan.

Rules:
- Be thorough and structured in your analysis
- Output the COMPLETE research result with all details
- Use agent_response tool when done
- Your 'result' field MUST contain the full research content, not a description

Context: {context}""",

        "code": f"""You are a Code Agent. You MUST write actual code files using CREATE/SEARCH blocks.

Rules:
- Write CLEAN, COMPLETE, PRODUCTION-READY code - not just a plan
- Your 'result' field MUST contain the FULL code content
- Include complete file contents with all imports, classes, functions
- Follow this format for each file:
  <<<< CREATE path/to/file.py
  <complete file content with imports, code, everything>
  >>>> END CREATE
- For each file created, add the path to files_created array
- DO NOT say "I'll create" - actually CREATE the code in your result

Context: {context}""",

        "review": f"""You are a Review Agent. You MUST review actual code and provide specific feedback.

Rules:
- Check for: logic errors, edge cases, security issues, performance
- If bugs found -> output SEARCH/REPLACE blocks with specific fixes
- If OK -> reply "REVIEW_OK: [summary of what was reviewed]"
- Your 'result' field MUST contain the full review analysis
- Be specific about line numbers and issues found

Context: {context}""",

        "synthesize": f"""You are a Synthesis Agent. Combine multiple agent outputs into a coherent final result.

Rules:
- Integrate all code and research results
- Your 'result' field MUST contain the complete synthesized output
- Present code in organized sections
- Include file paths and descriptions

Context: {context}""",
    }
    return prompts.get(role, prompts["research"])


async def run_subagent(
    client: AsyncOpenAI,
    model: str,
    role: str,
    task: str,
    context: str = "",
    temperature: float = 0.1,
    max_tokens: int = 4000,
) -> dict:
    """Run a subagent with a specific role.

    Args:
        client: OpenAI-compatible client (9Router)
        model: Model ID (e.g., "oc/deepseek-v4-flash-free")
        role: "research" | "code" | "review" | "synthesize"
        task: The specific task for this subagent
        context: Additional context from shared memory or orchestrator
        temperature: LLM temperature
        max_tokens: Max tokens for response

    Returns:
        Dict with result from agent_response tool call or fallback content
    """
    system_prompt = _make_system_prompt(role, context)
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": task},
    ]

    for attempt in range(3):
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=messages,
                tools=SUBAGENT_TOOLS,
                tool_choice="auto",
                temperature=temperature,
                max_tokens=max_tokens,
            )
            msg = resp.choices[0].message

            # Check for tool calls
            if msg.tool_calls:
                for tc in msg.tool_calls:
                    if tc.function.name == "agent_response":
                        try:
                            args = json.loads(tc.function.arguments)
                            logger.info(f"[{role}] agent_response: confidence={args.get('confidence')}, "
                                        f"needs_review={args.get('needs_review')}")
                            return args
                        except json.JSONDecodeError as e:
                            logger.warning(f"[{role}] agent_response parse fail: {e}")
                            return {
                                "result": msg.content or "Tool call parse error",
                                "confidence": 0.5,
                                "needs_review": True,
                                "next_agent": "none",
                                "files_created": [],
                            }

            # Plain text response (no tool call)
            content = msg.content or ""
            return {
                "result": content,
                "confidence": 0.7,
                "needs_review": False,
                "next_agent": "none",
                "files_created": [],
            }

        except Exception as e:
            logger.warning(f"[{role}] Attempt {attempt+1} failed: {e}")
            if attempt == 2:
                return {
                    "result": f"Error after 3 attempts: {e}",
                    "confidence": 0.0,
                    "needs_review": True,
                    "next_agent": "none",
                    "files_created": [],
                }

    return {
        "result": "Max retries exhausted",
        "confidence": 0.0,
        "needs_review": True,
        "next_agent": "none",
        "files_created": [],
    }
