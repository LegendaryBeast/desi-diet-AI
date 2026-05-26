"""Meal tracking routes — text log for unplanned / self-eaten meals.

All nutrition data is sourced exclusively from the Neo4j Graph-RAG database.
No LLM-generated calorie or macro values are used anywhere in this module.
The LLM is used only as a natural-language parser (extract food name + portion).
"""

import json
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

# LLM is used ONLY to parse natural language into (food name, portion).
# It must NOT generate any calorie or macro values.
FOOD_PARSER_PROMPT = """You are a professional food parser for a Bangladeshi nutrition app.
The user will describe what they ate in natural language (Bangla or English).
Identify each distinct food item and return:
1. "query": Best English keyword to search in the food database:
   - For parboiled cooked rice / siddho chaler bhat (সিদ্ধ চাল / সিদ্ধ চালের ভাত), use "Rice parboiled milled".
   - For raw sun-dried rice / atop chaler bhat (আতপ চাল / আতপ চালের ভাত), use "Rice raw milled".
   - For normal egg / boiled egg (সিদ্ধ ডিম), use "Egg poultry".
   - Otherwise, use best keyword matching names in the database (e.g. "dal", "banana", "chicken").
2. "portion_g": Estimated portion in grams. Use standard Bangladeshi serving sizes if unspecified
   (e.g. 150g rice, 50g egg, 100g banana, 60g dal).
3. "fallback_name": Friendly name in the user's language (e.g. "সিদ্ধ চালের ভাত", "সিদ্ধ ডিম").

DO NOT generate any calorie, protein, carb, or fat values. Nutrition comes from the database only.

Return ONLY valid JSON:
{
  "items": [
    {"query": "Egg poultry",  "portion_g": 50.0,  "fallback_name": "সিদ্ধ ডিম"},
    {"query": "Rice parboiled milled", "portion_g": 150.0, "fallback_name": "সিদ্ধ চালের ভাত"}
  ]
}"""


@router.post("", response_model=MealTrackingResponse)
async def log_meal(req: MealTrackingRequest, current_user=Depends(get_current_user)):
    """Log a meal. Nutrition data comes exclusively from the Neo4j Graph-RAG database."""

    # ── Path A: Direct log from meal plan (already has verified Graph-RAG values) ──────────
    if req.direct_calories is not None:
        direct_carbs = req.direct_carbs or 0.0
        direct_fat   = req.direct_fat   or 0.0

        # If macros are missing, scale them from the Graph-RAG database
        if (req.direct_carbs is None or req.direct_fat is None) and (req.direct_name or req.input):
            try:
                rag = _get_rag()
                db_matches = rag.search_food(req.direct_name or req.input)
                if db_matches:
                    match  = db_matches[0]
                    db_cal = float(match.get("calories") or 0.0)
                    if db_cal > 0:
                        scale = float(req.direct_calories) / db_cal
                        if req.direct_carbs is None:
                            direct_carbs = round(float(match.get("carbs") or 0.0) * scale, 1)
                        if req.direct_fat is None:
                            direct_fat = round(float(match.get("fat") or 0.0) * scale, 1)
            except Exception:
                logger.exception("Failed to scale direct plan macros via Graph-RAG")

        parsed_items = [{
            "name":      req.direct_name or req.input,
            "amount_g":  req.direct_amount_g or 100.0,
            "calories":  req.direct_calories,
            "protein_g": req.direct_protein or 0.0,
            "carbs_g":   direct_carbs,
            "fat_g":     direct_fat,
        }]
        total_calories      = req.direct_calories
        macros              = {"protein_g": req.direct_protein or 0.0, "carbs_g": direct_carbs, "fat_g": direct_fat}
        ai_feedback         = "পরিকল্পিত খাবারটি সফলভাবে আপনার দৈনন্দিন ট্র্যাকিংয়ে যুক্ত করা হয়েছে।"
        input_text_display  = f"📋 [Plan] {req.direct_name or req.input}"

    # ── Path B: Free-text / chatbot log — parse then Graph-RAG lookup ────────────────────
    else:
        # Step 1 — LLM parses natural language → food name + portion only
        messages = [
            {"role": "system", "content": FOOD_PARSER_PROMPT},
            {"role": "user",   "content": f"User ate: {req.input}"},
        ]
        try:
            raw              = await llm_client.chat_completion(messages=messages, temperature=0.2, max_tokens=512, response_format={"type": "json_object"})
            items_to_process = json.loads(raw).get("items", [])
        except Exception:
            logger.exception("Failed to parse meal input")
            raise HTTPException(status_code=502, detail="Could not parse the meal description.")

        if not items_to_process:
            raise HTTPException(status_code=400, detail="Could not identify any food items in your description.")

        # Step 2 — Graph-RAG / Database Plan lookup for every parsed item
        rag            = _get_rag()
        parsed_items   = []
        total_calories = 0.0
        protein_total  = 0.0
        carbs_total    = 0.0
        fat_total      = 0.0
        not_found      = []
        verified       = []

        # Fetch today's daily meal plan from the database to match exact planned items
        planned_items = []
        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_plan = await prisma.mealplan.find_first(
                where={
                    "userId":   current_user.id,
                    "planType": "daily",
                    "planDate": {"gte": today_start, "lt": today_start + timedelta(days=1)},
                }
            )
            if today_plan and today_plan.planData:
                planned_data = from_json_string(today_plan.planData)
                for m in planned_data.get("meals", []):
                    planned_items.extend(m.get("items", []))
        except Exception:
            logger.exception("Failed to load today's planned items for text log matching")

        for item in items_to_process:
            query_term = item.get("query", "").strip()
            portion_g  = float(item.get("portion_g") or 100.0)
            multiplier = 1.0

            # Try resolving the food item from database-driven synonyms/aliases first
            alias_match = None
            for term_to_try in [req.input, item.get("fallback_name"), query_term]:
                if term_to_try:
                    alias_match = rag.resolve_alias(term_to_try.strip())
                    if alias_match:
                        break

            db_food = None
            if alias_match:
                db_food = alias_match
                multiplier = float(alias_match.get("multiplier") or 1.0)
                # Scale portion using database-driven preparation state multiplier (e.g. 0.4 for cooked rice)
                portion_g = portion_g * multiplier

            scale = portion_g / 100.0

            # Match with today's planned items first
            matched_plan_item = None
            fallback_name_lower = (item.get("fallback_name") or "").lower().strip()
            query_term_lower = query_term.lower().strip()

            if not db_food:
                for pi in planned_items:
                    pi_bn = (pi.get("name_bn") or "").lower()
                    pi_en = (pi.get("name_en") or "").lower()
                    pi_code = (pi.get("food_code") or pi.get("code") or "").lower()

                    if pi_code and pi_code == query_term_lower:
                        matched_plan_item = pi
                        break
                if fallback_name_lower and (fallback_name_lower in pi_bn or pi_bn in fallback_name_lower):
                    matched_plan_item = pi
                    break
                if query_term_lower and (query_term_lower in pi_en or pi_en in query_term_lower):
                    matched_plan_item = pi
                    break
                # Word overlap for cooked dishes (e.g. "মাগুর" or "ফুলকপি")
                if fallback_name_lower and len(fallback_name_lower) > 2:
                    clean_term = fallback_name_lower.replace("তরকারি", "").replace("ঝোল", "").replace("ভাজি", "").replace("রান্না করা", "").replace("দো পেঁয়াজা", "").replace("দো পেয়াজা", "").strip()
                    clean_pi_bn = pi_bn.replace("তরকারি", "").replace("ঝোল", "").replace("ভাজি", "").replace("রান্না করা", "").replace("দো পেঁয়াজা", "").replace("দো পেয়াজা", "").strip()
                    if clean_term and (clean_term in clean_pi_bn or clean_pi_bn in clean_term):
                        matched_plan_item = pi
                        break

            db_food = None
            if matched_plan_item:
                pi_code = matched_plan_item.get("food_code") or matched_plan_item.get("code")
                if pi_code:
                    try:
                        with rag.get_neo4j_driver().session() as session:
                            q = """
                            MATCH (f:Food)-[:BELONGS_TO]->(fg:FoodGroup)
                            WHERE f.code = $code
                            RETURN f.code AS code,
                                   f.name_en AS name_en,
                                   coalesce(f.name_bn, f.name_en) AS name_bn,
                                   f.energy_kcal AS calories,
                                   f.protein_g AS protein,
                                   f.fat_g AS fat,
                                   f.carbohydrate_g AS carbs,
                                   fg.name_en AS food_group
                            """
                            res = session.run(q, code=pi_code).single()
                            if res:
                                db_food = dict(res)
                    except Exception:
                        logger.exception("Failed to fetch matched plan food from Neo4j in text logging")

                if not db_food:
                    db_food = {
                        "code": pi_code,
                        "name_bn": matched_plan_item.get("name_bn"),
                        "name_en": matched_plan_item.get("name_en"),
                        "calories": float(matched_plan_item.get("calories") or 0.0) / (float(matched_plan_item.get("amount_g") or 100.0) / 100.0),
                        "protein": float(matched_plan_item.get("protein_g") or 0.0) / (float(matched_plan_item.get("amount_g") or 100.0) / 100.0),
                        "carbs": float(matched_plan_item.get("carbs_g") or 0.0) / (float(matched_plan_item.get("amount_g") or 100.0) / 100.0),
                        "fat": float(matched_plan_item.get("fat_g") or 0.0) / (float(matched_plan_item.get("amount_g") or 100.0) / 100.0),
                    }

            # Fallback to standard Neo4j RAG search
            if not db_food:
                db_matches = rag.search_food(query_term)
                db_food = db_matches[0] if db_matches else None

            if db_food:
                # ✅ Verified Graph-RAG match — scale database values to portion
                db_cal  = float(db_food.get("calories") or db_food.get("energy_kcal") or 0.0)
                db_prot = float(db_food.get("protein") or db_food.get("protein_g") or 0.0)
                db_fat  = float(db_food.get("fat") or db_food.get("fat_g") or 0.0)
                db_carb = float(db_food.get("carbs") or db_food.get("carbohydrate_g") or 0.0)

                food_name = db_food.get("name_bn") or db_food.get("name_en")
                # Strip any legacy/raw (GraphRAG) suffix if present to keep it clean
                for sfx in ["(GraphRAG)", "(Graph-RAG)", "GraphRAG", "Graph-RAG"]:
                    if food_name.endswith(sfx):
                        food_name = food_name[:-len(sfx)].strip()
                food_name = food_name.strip()

                item_calories = db_cal  * scale
                item_protein  = db_prot * scale
                item_carbs    = db_carb * scale
                item_fat      = db_fat  * scale

                verified.append(db_food.get('name_bn') or db_food.get('name_en'))

                parsed_items.append({
                    "name":      food_name,
                    "amount_g":  portion_g,
                    "calories":  round(item_calories, 1),
                    "protein_g": round(item_protein, 1),
                    "carbs_g":   round(item_carbs, 1),
                    "fat_g":     round(item_fat, 1),
                })
                total_calories += item_calories
                protein_total  += item_protein
                carbs_total    += item_carbs
                fat_total      += item_fat
            else:
                # ❌ Not in database — skip entirely (no LLM-generated values)
                not_found.append(item.get("fallback_name") or query_term)

        total_calories = round(total_calories)
        macros = {
            "protein_g": round(protein_total, 1),
            "carbs_g":   round(carbs_total, 1),
            "fat_g":     round(fat_total, 1),
        }

        # Build prefix and feedback
        if not_found:
            foods_list         = ", ".join(not_found)
            prefix             = "⚠️ [Item Not Found in Database] "
            if not parsed_items:
                ai_feedback = f"❌ '{foods_list}' ডাটাবেজে পাওয়া যায়নি — Item not found in database."
            else:
                ai_feedback = (
                    f"✅ কিছু খাবার সফলভাবে লগ হয়েছে।\n"
                    f"❌ '{foods_list}' — Item not found in database. এই আইটেমগুলো লগ করা হয়নি।"
                )
        else:
            prefix      = "✅ "
            ai_feedback = "✅ সফলভাবে আপনার খাবার ট্র্যাকিংয়ে যুক্ত করা হয়েছে (ডাটাবেজ দ্বারা সম্পূর্ণ ভেরিফাইড)।"

        if getattr(req, "is_manual", False):
            input_text_display = f"✍️ [Manual] {prefix}{req.input}"
        else:
            input_text_display = f"{prefix}{req.input}"

    # ── Save to DB or Preview ─────────────────────────────────────────────────────────────
    if req.preview:
        return MealTrackingResponse(
            id="preview",
            parsed_items=[ParsedFoodItem(**item) for item in parsed_items],
            total_calories=int(total_calories),
            macros=macros,
            ai_feedback=ai_feedback,
            meal_slot=req.meal_slot,
            logged_at=datetime.utcnow(),
        )

    record = await prisma.mealtracking.create(
        data={
            "userId":      current_user.id,
            "inputText":   input_text_display,
            "parsedItems": to_json_string(parsed_items),
            "totalCals":   int(total_calories),
            "macros":      to_json_string(macros),
            "feedback":    ai_feedback,
            "mealSlot":    req.meal_slot,
            "language":    req.language,
        }
    )
    # ── Auto-complete slot in today's Meal Plan ──────────────────────────────────────────
    if req.meal_slot:
        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_plan = await prisma.mealplan.find_first(
                where={
                    "userId":   current_user.id,
                    "planType": "daily",
                    "planDate": {"gte": today_start, "lt": today_start + timedelta(days=1)},
                }
            )
            if today_plan:
                completed = safe_list(from_json_string(today_plan.completedSlots)) if today_plan.completedSlots else []
                if req.meal_slot not in completed:
                    completed.append(req.meal_slot)
                    await prisma.mealplan.update(
                        where={"planId": today_plan.planId},
                        data={"completedSlots": to_json_string(completed)},
                    )
        except Exception:
            logger.exception("Failed to auto-complete meal plan slot")
    return MealTrackingResponse(
        id=record.id,
        parsed_items=[ParsedFoodItem(**item) for item in parsed_items],
        total_calories=int(total_calories),
        macros=macros,
        ai_feedback=ai_feedback,
        meal_slot=req.meal_slot,
        logged_at=record.loggedAt,
    )


IMAGE_FOOD_PARSER_PROMPT = """You are a food identification assistant for a Bangladeshi nutrition app.
Analyze the provided food image and identify all distinct food items visible.
For each item return:
1. "query": Best English keyword to search in the food database:
   - For parboiled cooked rice / siddho chaler bhat (সিদ্ধ চাল / সিদ্ধ চালের ভাত), use "Rice parboiled milled".
   - For raw sun-dried rice / atop chaler bhat (আতপ চাল / আতপ চালের ভাত), use "Rice raw milled".
   - For normal egg / boiled egg (সিদ্ধ ডিম), use "Egg poultry".
   - Otherwise, use best keyword matching names in the database (e.g. "dal", "banana", "chicken").
2. "portion_g": Estimated portion in grams based on visual cues. Use Bangladeshi standard servings if unsure.
3. "fallback_name": Friendly name in Bengali if possible (e.g. "সিদ্ধ চালের ভাত", "সিদ্ধ ডিম").

DO NOT generate any calorie, protein, carb, or fat values. Nutrition comes from the database only.
If you cannot identify the food, use your best guess for the query field.

Return ONLY valid JSON:
{
  "items": [
    {"query": "Rice parboiled milled", "portion_g": 150.0, "fallback_name": "সিদ্ধ চালের ভাত"},
    {"query": "Egg poultry", "portion_g": 50.0, "fallback_name": "সিদ্ধ ডিম"}
  ]
}"""


@router.post("/from-image", response_model=MealTrackingResponse)
async def log_meal_from_image(
    file: UploadFile = File(...),
    meal_slot: Optional[str] = Form(default=None),
    language: str = Form(default="bn"),
    food_name: Optional[str] = Form(default=None),
    quantity_g: Optional[float] = Form(default=None),
    preview: bool = Form(default=False),
    current_user=Depends(get_current_user),
):
    """Photo-based meal logging. Vision LLM identifies food → GraphRAG provides verified nutrition.
    
    - If food_name is provided, it is used as a direct search hint (skips vision analysis).
    - quantity_g overrides the vision-estimated portion if provided.
    - Nutrition data comes exclusively from the Neo4j Graph-RAG database.
    """
    rag = _get_rag()
    items_to_process = []

    # ── Path A: Manual hint provided — skip vision LLM ─────────────────────────────
    if food_name and food_name.strip():
        portion = float(quantity_g) if quantity_g else 100.0
        items_to_process = [{
            "query": food_name.strip(),
            "portion_g": portion,
            "fallback_name": food_name.strip(),
        }]
        input_label = f"{food_name.strip()} ({int(portion)}g)"
    else:
        # ── Path B: Vision LLM identifies food from image ───────────────────────────
        image_bytes = await file.read()
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image too large — keep under 10 MB.")

        import base64
        img_b64 = base64.b64encode(image_bytes).decode("utf-8")
        mime_type = file.content_type or "image/jpeg"

        vision_messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{img_b64}"},
                    },
                    {
                        "type": "text",
                        "text": IMAGE_FOOD_PARSER_PROMPT,
                    },
                ],
            }
        ]

        try:
            raw = await llm_client.chat_completion(
                messages=vision_messages,
                temperature=0.2,
                max_tokens=512,
                response_format={"type": "json_object"},
            )
            items_to_process = json.loads(raw).get("items", [])
        except Exception:
            logger.exception("Vision LLM failed to identify food from image")
            raise HTTPException(status_code=502, detail="Could not identify food from the image. Please try again or use the text option.")

        if not items_to_process:
            raise HTTPException(status_code=400, detail="No food items could be identified in the image.")

        # Apply quantity override if user also filled the quantity field
        if quantity_g and items_to_process:
            items_to_process[0]["portion_g"] = float(quantity_g)

        input_label = f"📷 {', '.join(i.get('fallback_name') or i.get('query') for i in items_to_process)}"

    # ── GraphRAG lookup for all identified items ─────────────────────────────────
    parsed_items = []
    total_calories = 0.0
    protein_total = 0.0
    carbs_total = 0.0
    fat_total = 0.0
    not_found = []

    for item in items_to_process:
        query_term = item.get("query", "").strip()
        portion_g = float(item.get("portion_g") or 100.0)
        multiplier = 1.0

        # Try resolving the food item from database-driven synonyms/aliases first
        alias_match = None
        for term_to_try in [food_name, item.get("fallback_name"), query_term]:
            if term_to_try:
                alias_match = rag.resolve_alias(term_to_try.strip())
                if alias_match:
                    break

        db_food = None
        if alias_match:
            db_food = alias_match
            multiplier = float(alias_match.get("multiplier") or 1.0)
            # Scale portion using database-driven preparation state multiplier (e.g. 0.4 for cooked rice)
            portion_g = portion_g * multiplier
        else:
            db_matches = rag.search_food(query_term)
            db_food = db_matches[0] if db_matches else None

        scale = portion_g / 100.0

        if db_food:
            db_cal = float(db_food.get("calories") or db_food.get("energy_kcal") or 0.0)
            db_prot = float(db_food.get("protein") or db_food.get("protein_g") or 0.0)
            db_fat = float(db_food.get("fat") or db_food.get("fat_g") or 0.0)
            db_carb = float(db_food.get("carbs") or db_food.get("carbohydrate_g") or 0.0)

            food_name_display = db_food.get("name_bn") or db_food.get("name_en") or query_term
            for sfx in ["(GraphRAG)", "(Graph-RAG)", "GraphRAG", "Graph-RAG"]:
                if food_name_display.endswith(sfx):
                    food_name_display = food_name_display[:-len(sfx)].strip()

            parsed_items.append({
                "name": food_name_display.strip(),
                "amount_g": portion_g,
                "calories": round(db_cal * scale, 1),
                "protein_g": round(db_prot * scale, 1),
                "carbs_g": round(db_carb * scale, 1),
                "fat_g": round(db_fat * scale, 1),
            })
            total_calories += db_cal * scale
            protein_total += db_prot * scale
            carbs_total += db_carb * scale
            fat_total += db_fat * scale
        else:
            not_found.append(item.get("fallback_name") or query_term)

    total_calories = round(total_calories)
    macros = {
        "protein_g": round(protein_total, 1),
        "carbs_g": round(carbs_total, 1),
        "fat_g": round(fat_total, 1),
    }

    # ── Build feedback message ────────────────────────────────────────────────────
    if not_found:
        foods_list = ", ".join(not_found)
        if not parsed_items:
            ai_feedback = (
                f"❌ '{foods_list}' আমাদের ডাটাবেজে পাওয়া যায়নি।\n"
                f"No data found in database. Please try a different food name."
            )
        else:
            ai_feedback = (
                f"✅ কিছু খাবার সফলভাবে লগ হয়েছে।\n"
                f"❌ '{foods_list}' — ডাটাবেজে পাওয়া যায়নি (No data found in database)।"
            )
        input_prefix = "⚠️ "
    else:
        ai_feedback = "✅ ছবি থেকে খাবার শনাক্ত করে ডাটাবেজ থেকে পুষ্টি তথ্য সংগ্রহ করা হয়েছে।"
        input_prefix = "📷 "

    if not parsed_items:
        # Nothing was found — still save a zero-cal record with the feedback
        total_calories = 0

    final_input_text = f"✍️ [Manual] {input_prefix}{input_label}"

    # ── Save to DB or Preview ─────────────────────────────────────────────────────
    if preview:
        return MealTrackingResponse(
            id="preview",
            parsed_items=[ParsedFoodItem(**item) for item in parsed_items],
            total_calories=int(total_calories),
            macros=macros,
            ai_feedback=ai_feedback,
            meal_slot=meal_slot,
            logged_at=datetime.utcnow(),
        )

    record = await prisma.mealtracking.create(
        data={
            "userId": current_user.id,
            "inputText": final_input_text,
            "parsedItems": to_json_string(parsed_items),
            "totalCals": int(total_calories),
            "macros": to_json_string(macros),
            "feedback": ai_feedback,
            "mealSlot": meal_slot,
            "language": language,
        }
    )

    # ── Auto-complete meal plan slot ──────────────────────────────────────────────
    if meal_slot and parsed_items:
        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_plan = await prisma.mealplan.find_first(
                where={
                    "userId": current_user.id,
                    "planType": "daily",
                    "planDate": {"gte": today_start, "lt": today_start + timedelta(days=1)},
                }
            )
            if today_plan:
                completed = safe_list(from_json_string(today_plan.completedSlots)) if today_plan.completedSlots else []
                if meal_slot not in completed:
                    completed.append(meal_slot)
                    await prisma.mealplan.update(
                        where={"planId": today_plan.planId},
                        data={"completedSlots": to_json_string(completed)},
                    )
        except Exception:
            logger.exception("Failed to auto-complete meal plan slot after image log")

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
            "userId":    current_user.id,
            "loggedAt":  {"gte": today, "lt": today + timedelta(days=1)},
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
        where={"id": log_id, "userId": current_user.id}
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Logged meal not found.")
    await prisma.mealtracking.delete(where={"id": log_id})
    return {"message": "Logged meal successfully deleted."}
