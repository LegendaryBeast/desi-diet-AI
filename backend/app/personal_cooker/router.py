"""Personal Cooker API routes."""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from app.dependencies import get_current_user
from app.personal_cooker.service import PersonalCookerService
from app.personal_cooker.models import ChatRequest, ChatResponse, HistoryResponse, ConditionsResponse

router = APIRouter(prefix="/personal-cooker", tags=["Personal Cooker"])


@router.post("/chat", response_model=ChatResponse)
async def personal_cooker_chat(
    req: ChatRequest,
    current_user=Depends(get_current_user),
):
    """Send a message to the Personal Cooker (NutriSaathi) and get a reply."""
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    if not req.session_id:
        raise HTTPException(status_code=400, detail="session_id is required")

    result = await PersonalCookerService.chat(
        user_id=current_user.id,
        message=req.message.strip(),
        condition=req.condition,
        session_id=req.session_id,
    )
    return ChatResponse(reply=result["reply"], context_used=result["context_used"])


@router.get("/history", response_model=HistoryResponse)
async def get_history(
    session_id: str,
    current_user=Depends(get_current_user),
):
    """Get chat history for a personal-cooker session."""
    history = await PersonalCookerService.get_history(current_user.id, session_id)
    return HistoryResponse(history=history)


@router.delete("/history")
async def clear_history(
    session_id: str,
    current_user=Depends(get_current_user),
):
    """Clear chat history for a personal-cooker session."""
    await PersonalCookerService.clear_history(current_user.id, session_id)
    return {"success": True}


@router.get("/conditions", response_model=ConditionsResponse)
async def get_conditions(
    current_user=Depends(get_current_user),
):
    """List all supported medical conditions."""
    conditions = PersonalCookerService.get_conditions()
    return ConditionsResponse(conditions=conditions)
