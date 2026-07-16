"""Request ID middleware - assign unique ID to each request."""
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Assign a short request ID to each request for tracing in logs."""

    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        logger.info("[%s] -> %s %s", request_id, request.method, request.url.path)

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        logger.info("[%s] <- %s", request_id, response.status_code)
        return response
