"""Pydantic models for Personal Cooker API."""

from pydantic import BaseModel
from typing import Optional, List


class ChatRequest(BaseModel):
    message: str
    condition: str = "None"
    session_id: str


class ChatResponse(BaseModel):
    reply: str
    context_used: List[str]


class HistoryResponse(BaseModel):
    history: List[dict]


class ConditionsResponse(BaseModel):
    conditions: List[str]
