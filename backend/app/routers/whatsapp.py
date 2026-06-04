"""WhatsApp integration routes — opt-in and webhook handlers."""

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from app.db import prisma
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter()


@router.post("/optin")
async def whatsapp_optin(current_user=Depends(get_current_user)):
    """Called by the frontend when the user confirms they want to chat on WhatsApp.
    Reads the phone number from the authenticated user's DB record (trusted source)
    and forwards it to the n8n webhook."""
    if not current_user.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No phone number on your account. Please update your profile first.",
        )

    if not settings.n8n_optin_webhook_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WhatsApp integration is not configured on the server.",
        )

    async with httpx.AsyncClient() as client:
        try:
            await client.post(
                settings.n8n_optin_webhook_url,
                json={
                    "user_id": current_user.id,
                    "phone": current_user.phone,
                    "name": current_user.email.split("@")[0] if current_user.email else "User",
                    "language": current_user.language or "bn",
                },
                timeout=10.0,
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not reach messaging service. Try again.",
            )

    return {"success": True, "phone": current_user.phone}
