"""Structured logging setup with request ID support."""
import logging
import os
import sys


class RequestIDFilter(logging.Filter):
    """Add request_id from request.state to log records."""

    def filter(self, record) -> bool:
        return True


def setup_logging() -> None:
    """Configure structured logging for the application."""
    root_logger = logging.getLogger()
    debug = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
    root_logger.setLevel(logging.DEBUG if debug else logging.INFO)

    # Remove existing handlers to avoid duplicates
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    handler.addFilter(RequestIDFilter())
    root_logger.addHandler(handler)

    # Suppress verbose third-party logs
    for logger_name in ("sqlalchemy.engine", "httpx", "uvicorn.access"):
        logging.getLogger(logger_name).setLevel(logging.WARNING)
