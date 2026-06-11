"""Hardcoded admin password auth for business dashboard."""

from fastapi import HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db import prisma
from datetime import datetime, timedelta
import os

# Hardcoded admin password — can be overridden via env var
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "desidiet_admin_2026")

security = HTTPBearer(auto_error=False)


async def verify_admin_password(password: str | None) -> bool:
    """Verify admin password and log attempt."""
    success = password == ADMIN_PASSWORD
    try:
        await prisma.adminaccesslog.create(
            data={
                "success": success,
                "password": password[:20] + "..." if password and len(password) > 20 else (password or ""),
            }
        )
    except Exception:
        pass
    return success


async def require_admin(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = None,
) -> bool:
    """Dependency to enforce admin password on protected endpoints.
    Checks X-Admin-Password header first, then Authorization Bearer token.
    """
    # Priority 1: X-Admin-Password header
    password = request.headers.get("X-Admin-Password")
    
    # Priority 2: Authorization Bearer token (for session-based auth)
    if not password and credentials:
        password = credentials.credentials
    
    if not password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin password required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not await verify_admin_password(password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin password",
        )
    
    return True
