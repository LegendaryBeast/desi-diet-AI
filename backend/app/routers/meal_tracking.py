"""Meal tracking routes — text log for unplanned / self-eaten meals."""

import json
import base64
import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from app.db import prisma
from app.dependencies import get_current_user
from app.schemas import MealTrackingRequest, MealTrackingResponse, MealTrackingListItem, ParsedFoodItem
from app.core.llm_client import llm_client
from app.utils import safe_list, safe_dict, to_json_string, from_json_string
from datetime import datetime, timedelta
from typing import List, Optional

router = APIRouter()
logger = logging.getLogger(__name__)

MEAL_TRACKING_SYSTEM_PROMPT = """You are a clinical nutritionist AI. The user will describe what they ate in natural language.
Your job is to:
1. Identify each food item and estimate the quantity.
2. Look up or estimate calories and macros (protein, carbs, fat) per item.
3. Total them up.
4. Give ONE short paragraph of constructive, personalized, encouraging feedback.

IMPORTANT: Return ONLY valid JSON in this exact structure, nothing else:
{
  "parsed_items": [
    {"name": "Rice", "amount_g": 200, "calories": 260, "protein_g": 5.4, "carbs_g": 57, "fat_g": 0.4}
  ],
  "total_calories": 260,
  "macros": {"protein_g": 5.4, "carbs_g": 57, "fat_g": 0.4},
  "ai_feedback": "Your feedback here."
}"""


@router.post("", response_model=MealTrackingResponse)
async def log_meal(req: MealTrackingRequest, current_user=Depends(get_current_user)):
    """Log an unplanned / self-eaten meal using AI text analysis."""

    # Fetch user profile for personalized feedback
    profile = await prisma.profile.find_unique(where={"userId": current_user.id})
    conditions = safe_list(profile.medicalConditions) if profile else []
    goal = profile.goal if profile else "maintain"
    target_cals = 2000  # fallback

    # Try to get real calorie target from a recent meal plan
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    plan = await prisma.mealplan.find_first(
        where={
            "userId": current_user.id,
            "planDate": {"gte": today, "lt": today + timedelta(days=1)},
        }
    )
    if plan:
        target_cals = plan.calorieTarget

    # Build LLM prompt
    user_context = (
        f"User conditions: {', '.join(conditions) or 'None'}. "
        f"Goal: {goal}. Daily calorie target: {target_cals} kcal. "
        f"Meal slot: {req.meal_slot or 'unspecified'}."
    )
    messages = [
        {"role": "system", "content": MEAL_TRACKING_SYSTEM_PROMPT},
        {"role": "user", "content": f"{user_context}\n\nUser ate: {req.input}"},
    ]

    raw = await llm_client.chat_completion(
        messages=messages,
        temperature=0.3,
        max_tokens=1024,
        response_format={"type": "json_object"},
    )

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned invalid JSON. Please try again.",
        )

    parsed_items = data.get("parsed_items", [])
    total_calories = data.get("total_calories", 0)
    macros = data.get("macros", {"protein_g": 0, "carbs_g": 0, "fat_g": 0})
    ai_feedback = data.get("ai_feedback", "")

    # Save to DB
    record = await prisma.mealtracking.create(
        data={
            "userId": current_user.id,
            "inputText": req.input,
            "parsedItems": to_json_string(parsed_items),
            "totalCals": int(total_calories),
            "macros": to_json_string(macros),
            "feedback": ai_feedback,
            "mealSlot": req.meal_slot,
            "language": req.language,
        }
    )

    return MealTrackingResponse(
        id=record.id,
        parsed_items=[ParsedFoodItem(**item) for item in parsed_items],
        total_calories=int(total_calories),
        macros=macros,
        ai_feedback=ai_feedback,
        meal_slot=req.meal_slot,
        logged_at=record.loggedAt,
    )


@router.post("/from-image", response_model=MealTrackingResponse)
async def log_meal_from_image(
    file: UploadFile = File(...),
    meal_slot: Optional[str] = Form(default=None),
    language: str = Form(default="en"),
    note: Optional[str] = Form(default=None),
    current_user=Depends(get_current_user),
):
    """Log a meal by analyzing a food photo with the vision LLM.

    The image is sent to OpenAI as a base64 data-URL. The model returns the same
    JSON structure as the text-based meal-tracking endpoint, so the response
    schema is identical.
    """
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image upload")
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image exceeds 10 MB limit")

    mime = (file.content_type or "image/jpeg").lower()
    if not mime.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Not an image: {mime}")

    data_url = f"data:{mime};base64,{base64.b64encode(image_bytes).decode('ascii')}"

    # Fetch user profile for personalized feedback
    profile = await prisma.profile.find_unique(where={"userId": current_user.id})
    conditions = safe_list(profile.medicalConditions) if profile else []
    goal = profile.goal if profile else "maintain"
    target_cals = 2000

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    plan = await prisma.mealplan.find_first(
        where={
            "userId": current_user.id,
            "planDate": {"gte": today, "lt": today + timedelta(days=1)},
        }
    )
    if plan:
        target_cals = plan.calorieTarget

    user_context = (
        f"User conditions: {', '.join(conditions) or 'None'}. "
        f"Goal: {goal}. Daily calorie target: {target_cals} kcal. "
        f"Meal slot: {meal_slot or 'unspecified'}."
    )

    vision_instruction = (
        "The user has attached a photo of a meal. Identify every visible food item, "
        "estimate the portion (grams or count), and produce the JSON described below. "
        "If portion is ambiguous, use a reasonable Bangladeshi serving size. "
        + (f"User note: {note}. " if note else "")
        + "Use Bangladeshi food names where appropriate. "
        "Reply field `ai_feedback` in Bangla if language=bn, else English."
        f" (language={language})"
    )

    messages = [
        {"role": "system", "content": MEAL_TRACKING_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": f"{user_context}\n\n{vision_instruction}"},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        },
    ]

    try:
        raw = await llm_client.chat_completion(
            messages=messages,
            temperature=0.3,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        logger.exception("Vision meal-tracking failed")
        raise HTTPException(status_code=502, detail=f"Vision analysis failed: {exc}")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned invalid JSON. Please retry with a clearer photo.",
        )

    parsed_items = data.get("parsed_items", [])
    total_calories = data.get("total_calories", 0)
    macros = data.get("macros", {"protein_g": 0, "carbs_g": 0, "fat_g": 0})
    ai_feedback = data.get("ai_feedback", "")

    # Use parsed item names as the inputText so the log list shows something readable.
    input_text = (
        (", ".join(item.get("name", "?") for item in parsed_items) or "Photo meal log")
        + (f" — {note}" if note else "")
    )

    record = await prisma.mealtracking.create(
        data={
            "userId": current_user.id,
            "inputText": input_text,
            "parsedItems": to_json_string(parsed_items),
            "totalCals": int(total_calories),
            "macros": to_json_string(macros),
            "feedback": ai_feedback,
            "mealSlot": meal_slot,
            "language": language,
        }
    )

    return MealTrackingResponse(
        id=record.id,
        parsed_items=[ParsedFoodItem(**item) for item in parsed_items],
        total_calories=int(total_calories),
        macros=macros,
        ai_feedback=ai_feedback,
        meal_slot=meal_slot,
        logged_at=record.loggedAt,
    )


@router.get("/today", response_model=List[MealTrackingListItem])
async def get_today_logs(current_user=Depends(get_current_user)):
    """Get all unplanned meal logs for today."""
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    records = await prisma.mealtracking.find_many(
        where={
            "userId": current_user.id,
            "loggedAt": {"gte": today, "lt": today + timedelta(days=1)},
        },
        order={"loggedAt": "asc"},
    )
    return [
        MealTrackingListItem(
            id=r.id,
            input_text=r.inputText,
            total_calories=r.totalCals,
            macros=safe_dict(from_json_string(r.macros)),
            meal_slot=r.mealSlot,
            logged_at=r.loggedAt,
        )
        for r in records
    ]


@router.delete("/{log_id}")
async def delete_logged_meal(log_id: str, current_user=Depends(get_current_user)):
    """Delete a logged meal by its ID."""
    record = await prisma.mealtracking.find_first(
        where={
            "id": log_id,
            "userId": current_user.id
        }
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Logged meal not found."
        )
    await prisma.mealtracking.delete(where={"id": log_id})
    return {"message": "Logged meal successfully deleted."}

