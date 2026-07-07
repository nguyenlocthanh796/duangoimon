"""Structured logging configuration using structlog.

ponytail: adds JSON logging. Install structlog: pip install structlog.
When Sentry is configured, logs go to both stdout + Sentry.
"""
import structlog
import logging
import sys


def configure_logging(log_level: str = "INFO", json_output: bool = True):
    """Configure structlog with JSON or console output."""
    processors = [
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if json_output:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Root logger
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper(), logging.INFO),
    )


def get_logger(name: str | None = None):
    """Get a structured logger."""
    return structlog.get_logger(name or __name__)
