import sys
import os
import asyncio
sys.path.append(os.path.join(os.path.dirname(__file__), 'scripts'))
from orchestrator import run_pipeline

if __name__ == "__main__":
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Fix all console errors in the project."
    asyncio.run(run_pipeline(prompt))
