"""Security headers middleware - add security headers to all responses."""
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Add browser micro-cache headers for GET requests to achieve 0ms browser latency
        if request.method == "GET" and "/api/v1/" in request.url.path:
            response.headers["Cache-Control"] = "private, max-age=5, stale-while-revalidate=15"

        return response
