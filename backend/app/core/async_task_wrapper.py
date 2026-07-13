"""Safe async task wrapper with error handling."""
import asyncio
import logging
from typing import Awaitable, Callable

logger = logging.getLogger(__name__)


async def safe_task(
    coro: Awaitable,
    task_name: str = "background_task",
) -> None:
    """Wrap async task with error handling and logging.
    
    Args:
        coro: Coroutine to execute
        task_name: Name for logging
    """
    try:
        await coro
        logger.info("[%s] completed", task_name)
    except asyncio.CancelledError:
        logger.warning("[%s] was cancelled", task_name)
        raise
    except Exception as e:
        logger.error("[%s] failed: %s", task_name, e, exc_info=True)
        # Re-raise so caller knows task failed
        raise


def create_safe_task(
    coro: Awaitable,
    task_name: str = "background_task",
) -> asyncio.Task:
    """Create async task with exception wrapping.
    
    Usage:
        task = create_safe_task(my_coroutine(), "my_job")
    """
    wrapped = safe_task(coro, task_name)
    return asyncio.create_task(wrapped)
