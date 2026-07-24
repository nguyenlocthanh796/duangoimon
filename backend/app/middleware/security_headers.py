"""Security headers middleware - add security headers to all responses."""
from starlette.middleware.base import BaseHTTPMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)

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

        # Force browser to always revalidate API requests so table state updates immediately on screen navigation
        if "/api/v1/" in request.url.path:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"

        return response
