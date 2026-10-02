"""
app/core/security.py
Shared-secret authentication: only callers that send the X-Internal-Key header
(the backend) may use the AI service. /health stays open for container checks.
"""

import hmac

from fastapi import Header, HTTPException

from app.core.config import settings


def require_internal_key(x_internal_key: str | None = Header(default=None)) -> None:
    expected = settings.INTERNAL_API_KEY
    if not expected:
        # Fail closed: never run unauthenticated because the key was forgotten
        raise HTTPException(status_code=503, detail="AI service authentication is not configured")
    if not x_internal_key or not hmac.compare_digest(x_internal_key, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing internal API key")
