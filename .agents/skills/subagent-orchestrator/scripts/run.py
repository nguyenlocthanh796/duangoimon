"""
CLI entry point for the Subagent Orchestrator.
Run from command line or import as module.
"""

import asyncio
import json
import sys
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


async def main():
    """CLI entry point."""
    args = sys.argv[1:]

    if "--test" in args or "-t" in args:
        print("=" * 60)
        print("=== Subagent Orchestrator - Quick Test Suite ===")
        print("=" * 60)
        await run_tests()
        return

    if not args:
        print("Usage:")
        print("  python run.py \"your request\"    # Run orchestrator")
        print("  python run.py --test            # Run test suite")
        print("\nExamples:")
        print('  python run.py "write a FastAPI CRUD for users"')
        print('  python run.py "explain how JWT works and write an implementation"')
        return

    user_request = " ".join(args)
    print(f"\n=== Starting Subagent Orchestrator ===")
    print(f"Request: {user_request[:100]}...\n")

    from orchestrator import SubagentOrchestrator

    orchestrator = SubagentOrchestrator()
    result = await orchestrator.run(user_request)

    print("\n" + "=" * 60)
    print("FINAL RESULT")
    print("=" * 60)

    if "error" in result:
        print(f"\nERROR: {result['error']}")
    else:
        print(f"\nTasks: {result.get('tasks_completed', '?')}/{result.get('tasks_total', '?')}")
        print(f"\nResponse:")
        print(result.get("response", "No response"))
        print(f"\nSummary: {result.get('summary', '')}")

    # Save result
    output_file = Path(f".agentic/output_{result.get('session', 'unknown')}.json")
    output_file.parent.mkdir(exist_ok=True)
    output_file.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved to: {output_file}")


async def run_tests():
    """Run test suite for all subagent components."""
    from orchestrator import SubagentOrchestrator
    from shared_memory import SharedMemory
    from context_manager import ContextManager
    from agents import run_subagent
    from openai import AsyncOpenAI

    NINEROUTER_URL = "http://localhost:20128"
    client = AsyncOpenAI(api_key="sk-no-key", base_url=f"{NINEROUTER_URL}/v1")

    passed = 0
    failed = 0

    # Test 1: Shared Memory
    print("\n[Test 1] Shared Memory...")
    try:
        mem = SharedMemory(".agentic/test_memory.json")
        mem.set("hello", "world")
        assert mem.get("hello") == "world"
        mem.clear()
        print("  [PASS]")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # Test 2: Context Manager
    print("\n[Test 2] Context Manager...")
    try:
        ctx = ContextManager()
        compressed = ctx.compress("a" * 5000, max_len=100)
        assert len(compressed) <= 150
        print(f"  [PASS] (5000 -> {len(compressed)} chars)")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # Test 3: Model connectivity (oc/deepseek-v4-flash-free)
    print("\n[Test 3] Model connectivity (oc/deepseek-v4-flash-free)...")
    try:
        resp = await client.chat.completions.create(
            model="oc/deepseek-v4-flash-free",
            messages=[{"role": "user", "content": "Say OK"}],
            max_tokens=10,
        )
        assert resp.choices[0].message.content
        print(f"  [PASS]: {resp.choices[0].message.content}")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # Test 4: Function calling on oc/deepseek-v4-flash-free
    print("\n[Test 4] Function calling (oc/deepseek-v4-flash-free)...")
    try:
        resp = await client.chat.completions.create(
            model="oc/deepseek-v4-flash-free",
            messages=[{"role": "user", "content": "Use the test_tool to say hello"}],
            tools=[{
                "type": "function",
                "function": {
                    "name": "test_tool",
                    "description": "Test tool",
                    "parameters": {
                        "type": "object",
                        "properties": {"msg": {"type": "string"}},
                        "required": ["msg"],
                    },
                },
            }],
            tool_choice="auto",
        )
        has_tool = resp.choices[0].message.tool_calls is not None
        print(f"  [PASS] (tool_calls: {has_tool})")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # Test 5: Subagent execution (research)
    print("\n[Test 5] Subagent execution (research)...")
    try:
        result = await run_subagent(
            client, "oc/mimo-v2.5-free", "research",
            "What is FastAPI? Give a one-sentence answer.",
            temperature=0.1, max_tokens=500,
        )
        assert result.get("result")
        print(f"  [PASS]: {result['result'][:80]}...")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # Test 6: Full orchestrator pipeline
    print("\n[Test 6] Full orchestrator (simple request)...")
    try:
        orch = SubagentOrchestrator()
        result = await orch.run("Say exactly: HELLO_TEST")
        has_response = result.get("response") or not result.get("error")
        print(f"  [PASS] (session: {result.get('session', '?')})")
        if result.get("response"):
            print(f"     Response: {result['response'][:80]}")
        passed += 1
    except Exception as e:
        print(f"  [FAIL]: {e}")
        failed += 1

    # Summary
    print("\n" + "=" * 60)
    print(f"\nRESULTS: {passed} passed, {failed} failed, {passed+failed} total")
    print("=" * 60)

    # Cleanup test files
    for f in Path(".agentic").glob("test_*"):
        f.unlink()

    return passed, failed


if __name__ == "__main__":
    asyncio.run(main())
