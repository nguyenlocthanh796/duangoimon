import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'scripts'))
from scripts.orchestrator import run_pipeline
import asyncio

# Example execution if run directly
if __name__ == "__main__":
    asyncio.run(run_pipeline("Fix all console errors in the project."))
