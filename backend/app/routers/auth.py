"""Authentication routes: register, login, refresh, me, service-token."""

from fastapi import APIRouter, HTTPException, status, Depends
from app.db import prisma
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.schemas import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest
from app.dependencies import get_current_user
from app.config import settings
from datetime import timedelta

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    """Register a new user with phone or email."""
    if not req.phone and not req.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either phone or email is required",
        )

    # Check for existing user
    existing = None
    if req.phone:
        existing = await prisma.user.find_unique(where={"phone": req.phone})
    if not existing and req.email:
        existing = await prisma.user.find_unique(where={"email": req.email})

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists",
        )

    # Create user
    user_data = {
        "phone": req.phone,
        "email": req.email,
        "passwordHash": get_password_hash(req.password),
        "language": req.language,
    }
    user = await prisma.user.create(data=user_data)

    # Create tokens
    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    """Login with phone or email."""
    # Try to find user by phone or email
    user = await prisma.user.find_unique(where={"phone": req.identifier})
    if not user:
        user = await prisma.user.find_unique(where={"email": req.identifier})

    if not user or not verify_password(req.password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(req: RefreshRequest):
    """Exchange a refresh token for a new access token."""
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    user = await prisma.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token({"sub": user.id})

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    """Get current authenticated user."""
    return {
        "id": current_user.id,
        "phone": current_user.phone,
        "email": current_user.email,
        "language": current_user.language,
        "createdAt": current_user.createdAt,
    }


from pydantic import BaseModel

class ServiceTokenRequest(BaseModel):
    user_id: str
    secret: str

@router.post("/service-token", include_in_schema=False)
async def service_token(payload: ServiceTokenRequest):
    """Generate a server-to-server access token for a given user.
    Called by n8n / internal services only. Never exposed to the browser."""
    if not settings.service_secret or payload.secret != settings.service_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    user = await prisma.user.find_unique(where={"id": payload.user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    token = create_access_token(data={"sub": user.id})
    return {"access_token": token}
