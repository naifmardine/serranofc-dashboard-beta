from fastapi import Header, HTTPException

from app.core.config import settings


def require_internal_key(x_internal_api_key: str = Header(default="")):
    expected = (settings.internal_api_key or "").strip()
    received = (x_internal_api_key or "").strip()

    if received != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")