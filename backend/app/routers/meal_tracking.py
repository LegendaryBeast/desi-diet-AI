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
from app.routers.foods import _get_rag

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
    """Log a meal using Graph-RAG database matching with LLM fallback and visual disclaimers."""

    if req.direct_calories is not None:
        # Direct log from meal plan! Skip LLM/search analysis to ensure perfect plan mapping
        parsed_items = [{
            "name": req.direct_name or req.input,
            "amount_g": req.direct_amount_g or 100.0,
            "calories": req.direct_calories,
            "protein_g": req.direct_protein or 0.0,
            "carbs_g": req.direct_carbs or 0.0,
            "fat_g": req.direct_fat or 0.0
        }]
        total_calories = req.direct_calories
        macros = {
            "protein_g": req.direct_protein or 0.0,
            "carbs_g": req.direct_carbs or 0.0,
            "fat_g": req.direct_fat or 0.0
        }
        ai_feedback = "পরিকল্পিত খাবারটি সফলভাবে আপনার দৈনন্দিন ট্র্যাকিংয়ে যুক্ত করা হয়েছে।"
        input_text_display = f"📋 [Plan] {req.direct_name or req.input}"
    else:
        # Hybrid Graph-RAG + LLM fallback parser!
        # 1. Ask LLM to parse the user's text into query terms and fallback estimations
        HYBRID_PARSE_PROMPT = """You are a professional clinical dietitian food parser.
The user will describe what they ate in natural language (Bangla or English).
Your job is to identify each distinct food item and parse the input.
For each food item, output:
1. "query": The best English keyword(s) to search for this food in a Neo4j Graph-RAG database (e.g. "rice", "egg", "dal", "fish", "potato", "banana"). Keep it simple and focused.
2. "portion_g": The estimated portion size in grams. If unspecified, assume a standard Bangladeshi serving size (e.g. 150g for rice, 50g for an egg, 100g for banana, 60g for cooked dal).
3. "fallback_name": A friendly name in the requested language (e.g., "সিদ্ধ ডিম" or "Boiled Egg").
4. "fallback_calories": Fallback estimated calories per 100g if the database search yields no match.
5. "fallback_protein": Fallback estimated protein (grams) per 100g.
6. "fallback_carbs": Fallback estimated carbs (grams) per 100g.
7. "fallback_fat": Fallback estimated fat (grams) per 100g.

Return ONLY valid JSON in this exact structure:
{
  "items": [
    {
      "query": "egg",
      "portion_g": 50.0,
      "fallback_name": "সিদ্ধ ডিম",
      "fallback_calories": 155.0,
      "fallback_protein": 13.0,
      "fallback_carbs": 1.1,
      "fallback_fat": 11.0
    }
  ]
}"""

        messages = [
            {"role": "system", "content": HYBRID_PARSE_PROMPT},
            {"role": "user", "content": f"User ate: {req.input}"},
        ]

        try:
            raw = await llm_client.chat_completion(
                messages=messages,
                temperature=0.3,
                max_tokens=1024,
                response_format={"type": "json_object"},
            )
            parsed_data = json.loads(raw)
            items_to_process = parsed_data.get("items", [])
        except Exception as exc:
            logger.exception("Failed to parse meal input via LLM parser")
            raise HTTPException(status_code=502, detail=f"Failed to analyze meal: {exc}")

        if not items_to_process:
            raise HTTPException(status_code=400, detail="Could not identify any food items in your description.")

        # 2. Connect to Graph-RAG singleton connection
        rag = _get_rag()
        
        parsed_items = []
        total_calories = 0.0
        protein_total = 0.0
        carbs_total = 0.0
        fat_total = 0.0
        
        unverified_foods = []
        verified_foods = []

        for item in items_to_process:
            query_term = item.get("query", "")
            portion_g = float(item.get("portion_g") or 100.0)
            scale = portion_g / 100.0
            
            # Search Neo4j Graph-RAG!
            db_matches = rag.search_food(query_term)
            
            match = None
            if db_matches:
                # Take the top match as the closest database entry
                match = db_matches[0]
                
            if match:
                # Verified Graph-RAG match found! Use official DB values (scaled)
                db_cal = float(match.get("calories") or 0.0)
                db_prot = float(match.get("protein") or 0.0)
                db_fat = float(match.get("fat") or 0.0)
                db_carbs = float(match.get("carbs") or 0.0)
                
                food_name = f"{match.get('name_bn') or match.get('name_en')} (GraphRAG)"
                
                item_calories = db_cal * scale
                item_protein = db_prot * scale
                item_carbs = db_carbs * scale
                item_fat = db_fat * scale
                
                verified_foods.append(match.get('name_bn') or match.get('name_en'))
            else:
                if req.strict_mode:
                    # STRICT MODE: No AI nutrition data allowed. Zero out and label as unverified.
                    food_name = f"{item.get('fallback_name')} (Unverified food for the system)"
                    item_calories = 0.0
                    item_protein = 0.0
                    item_carbs = 0.0
                    item_fat = 0.0
                    unverified_foods.append(f"{item.get('fallback_name')} (Unverified)")
                else:
                    # NON-STRICT MODE: Fallback to AI-driven nutrition data with disclaimer
                    food_name = f"{item.get('fallback_name')} (AI)"
                    
                    item_calories = float(item.get("fallback_calories") or 0.0) * scale
                    item_protein = float(item.get("fallback_protein") or 0.0) * scale
                    item_carbs = float(item.get("fallback_carbs") or 0.0) * scale
                    item_fat = float(item.get("fallback_fat") or 0.0) * scale
                    
                    unverified_foods.append(item.get('fallback_name'))

            parsed_items.append({
                "name": food_name,
                "amount_g": portion_g,
                "calories": round(item_calories, 1),
                "protein_g": round(item_protein, 1),
                "carbs_g": round(item_carbs, 1),
                "fat_g": round(item_fat, 1)
            })
            
            total_calories += item_calories
            protein_total += item_protein
            carbs_total += item_carbs
            fat_total += item_fat

        # Round up totals
        total_calories = round(total_calories)
        macros = {
            "protein_g": round(protein_total, 1),
            "carbs_g": round(carbs_total, 1),
            "fat_g": round(fat_total, 1)
        }

        # Visual indicator prefixing in input text display
        if req.strict_mode:
            prefix = "⚠️ [Strict (Unverified)] " if unverified_foods else "✅ [GraphRAG] "
        else:
            prefix = "⚠️ [AI (Unverified)] " if unverified_foods else "✅ [GraphRAG] "
        
        input_text_display = f"{prefix}{req.input}"

        # Create personalized AI feedback with warning disclaimers in Bangla
        if unverified_foods:
            if req.strict_mode:
                disclaimer = f"⚠️ সতর্কতা: স্ট্রিক্ট মোড সক্রিয় থাকায় যাচাইবিহীন খাবারগুলোর পুষ্টি তথ্য ট্র্যাকিংয়ে যুক্ত করা হয়নি (Unverified food for the system)।"
                ai_feedback = disclaimer
            else:
                disclaimer = f"⚠️ সতর্কতা: এই খাবার ট্র্যাকিংয়ের কিছু তথ্য ({', '.join(unverified_foods)}) আমাদের ডাটাবেজে না থাকায় এআই (AI) দ্বারা অনুমিত এবং ডাটাবেজ দ্বারা সম্পূর্ণ যাচাইকৃত নয়।"
                ai_feedback = f"{disclaimer}\n\nআপনার খাবারটি ট্র্যাকার সফলভাবে যুক্ত করেছে।"
        else:
            ai_feedback = "সফলভাবে আপনার খাবার ট্র্যাকিংয়ে যুক্ত করা হয়েছে।"

    # Save to DB
    record = await prisma.mealtracking.create(
        data={
            "userId": current_user.id,
            "inputText": input_text_display,
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
    """Log a meal by analyzing a food photo with the vision LLM."""
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Photo-based meal logging with AI estimation has been disabled to avoid calorie estimation discrepancies."
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

