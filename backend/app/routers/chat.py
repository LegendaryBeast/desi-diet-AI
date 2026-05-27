"""Chat routes — SSE streaming endpoint with full user-context RAG."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from fastapi.responses import StreamingResponse, Response
from app.dependencies import get_current_user
from app.db import prisma
from app.schemas import ChatRequest, DietPlanChatRequest, DietPlanChatResponse
from app.core.llm_client import llm_client
from app.utils import safe_list
from rag_engine import calculate_targets, KhadokGraphRAG
import json
import logging
import httpx
from datetime import datetime, timedelta, timezone

from app.services.diet_plan_chat_service import (
    COLLECTION_SYSTEM_PROMPT,
    extract_collected_data,
    generate_plan_from_collected,
)
from app.services.grocery_service import suggest_groceries_from_chat
from app.services import chat_tools

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Tool dispatch map ─────────────────────────────────────────────────────────
# Maps function names to (handler_coroutine, needs_user_id)
TOOL_DISPATCH = {
    "log_meal": (None, True),  # handled inline for historical reasons
    "get_profile": (chat_tools.tool_get_profile, True),
    "update_profile": (chat_tools.tool_update_profile, True),
    "get_meal_plan": (chat_tools.tool_get_meal_plan, True),
    "mark_meal_complete": (chat_tools.tool_mark_meal_complete, True),
    "log_health": (chat_tools.tool_log_health, True),
    "get_health_logs": (chat_tools.tool_get_health_logs, True),
    "get_medicine_reminders": (chat_tools.tool_get_medicine_reminders, True),
    "add_medicine_reminder": (chat_tools.tool_add_medicine_reminder, True),
    "delete_medicine_reminder": (chat_tools.tool_delete_medicine_reminder, True),
    "search_food": (chat_tools.tool_search_food, True),
    "get_food_safety": (chat_tools.tool_get_food_safety, True),
    "get_health_report": (chat_tools.tool_get_health_report, True),
    "navigate_to": (chat_tools.tool_navigate_to, True),
    "show_toast": (chat_tools.tool_show_toast, True),
    "personal_cooker_chat": (chat_tools.tool_personal_cooker_chat, True),
}


async def perform_meal_logging(user_id: str, input_text: str, meal_slot: str, language: str) -> dict:
    from app.utils import to_json_string
    from rag_engine import KhadokGraphRAG

    # 1. Use LLM only to extract item names and portion sizes — no nutrient generation
    PARSER_PROMPT = """You are a professional clinical dietitian food parser.
The user will describe what they ate in natural language (Bangla or English).
Identify each distinct food item and return:
1. "query": Best English keyword to search in a food database (e.g. "rice", "egg", "dal", "banana").
2. "portion_g": Estimated portion in grams (standard Bangladeshi serving if unspecified).
3. "fallback_name": Friendly name in the user's language.

Return ONLY valid JSON:
{
  "items": [
    {"query": "egg", "portion_g": 50.0, "fallback_name": "ডিম"},
    {"query": "rice", "portion_g": 150.0, "fallback_name": "ভাত"}
  ]
}"""

    messages = [
        {"role": "system", "content": PARSER_PROMPT},
        {"role": "user", "content": f"User ate: {input_text}"},
    ]

    try:
        raw = await llm_client.chat_completion(
            messages=messages,
            temperature=0.3,
            max_tokens=512,
            response_format={"type": "json_object"},
        )
        items_to_process = json.loads(raw).get("items", [])
    except Exception:
        logger.exception("Failed to parse chat meal input")
        items_to_process = []

    # 2. Strict Graph-RAG / Database Plan lookup — no LLM nutrient data allowed
    rag = KhadokGraphRAG()
    parsed_items = []
    total_calories = 0.0
    protein_total = 0.0
    carbs_total = 0.0
    fat_total = 0.0
    not_found_foods = []

    # Fetch today's daily meal plan from the database to match exact planned items
    planned_items = []
    try:
        from datetime import timedelta
        from app.utils import from_json_string
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_plan = await prisma.mealplan.find_first(
            where={
                "userId":   user_id,
                "planType": "daily",
                "planDate": {"gte": today_start, "lt": today_start + timedelta(days=1)},
            }
        )
        if today_plan and today_plan.planData:
            p_data = from_json_string(today_plan.planData)
            for m in p_data.get("meals", []):
                planned_items.extend(m.get("items", []))
    except Exception:
        logger.exception("Failed to load today's planned items for chat matching")

    for item in items_to_process:
        query_term = item.get("query", "")
        portion_g = float(item.get("portion_g") or 100.0)
        scale = portion_g / 100.0

        # Match with today's planned items first for 100% exact plan database logging
        matched_plan_item = None
        fallback_name_lower = (item.get("fallback_name") or "").lower().strip()
        query_term_lower = query_term.lower().strip()

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
                    logger.exception("Failed to fetch matched plan food from Neo4j")

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

        # Fallback to standard Neo4j RAG search if not found in plan
        if not db_food:
            db_matches = rag.search_food(query_term)
            db_food = db_matches[0] if db_matches else None

        if db_food:
            # ✅ Verified — use database values only
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
            # ❌ Not in database — skip entirely, no LLM fallback
            not_found_foods.append(item.get("fallback_name") or query_term)

    total_calories = round(total_calories)
    macros = {
        "protein_g": round(protein_total, 1),
        "carbs_g":   round(carbs_total, 1),
        "fat_g":     round(fat_total, 1),
    }

    # 3. Build feedback
    if not_found_foods:
        foods_list = ", ".join(not_found_foods)
        if not parsed_items:
            prefix = "❌ [Item Not Found in Database] "
            ai_feedback = (
                f"❌ '{foods_list}' ডাটাবেজে পাওয়া যায়নি — Item not found in database."
                if language == "bn"
                else f"❌ '{foods_list}' — Item not found in database."
            )
        else:
            prefix = "⚠️ [Item Not Found in Database] "
            ai_feedback = (
                f"✅ কিছু খাবার সফলভাবে লগ হয়েছে।\n❌ '{foods_list}' ডাটাবেজে পাওয়া যায়নি — Item not found in database."
                if language == "bn"
                else f"✅ Some items logged successfully.\n❌ '{foods_list}' — Item not found in database."
            )
    else:
        prefix = "✅ "
        ai_feedback = (
            "✅ সফলভাবে আপনার খাবার ট্র্যাকিংয়ে যুক্ত করা হয়েছে (ডাটাবেজ দ্বারা সম্পূর্ণ ভেরিফাইড)।"
            if language == "bn"
            else "✅ Successfully logged to your meal tracker (fully verified via database)."
        )

    input_text_display = f"{prefix}{input_text}"

    # Auto-resolve correct meal slot based on input text and planned items
    resolved_slot = meal_slot
    input_lower = input_text.lower()
    
    if any(k in input_lower for k in ["sakal", "nasta", "breakfast", "shokal", "সকাল", "নাস্তা"]):
        resolved_slot = "breakfast"
    elif any(k in input_lower for k in ["dupur", "lunch", "dupurer", "দুপুর"]):
        resolved_slot = "lunch"
    elif any(k in input_lower for k in ["rat", "dinner", "rater", "রাত", "রাতের"]):
        resolved_slot = "dinner"
    elif any(k in input_lower for k in ["snack", "bikal", "shondha", "বিকেল", "সন্ধ্যা"]):
        resolved_slot = "snack"

    # Fallback to checking which planned slot contains the logged foods
    if resolved_slot not in ["breakfast", "lunch", "dinner", "snack"]:
        slot_scores = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}
        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_plan = await prisma.mealplan.find_first(
                where={
                    "userId":   user_id,
                    "planType": "daily",
                    "planDate": {"gte": today_start, "lt": today_start + timedelta(days=1)},
                }
            )
            if today_plan and today_plan.planData:
                p_data = from_json_string(today_plan.planData)
                for m in p_data.get("meals", []):
                    slot = m.get("slot")
                    if slot in slot_scores:
                        plan_names = [pi.get("name_bn", "").lower() for pi in m.get("items", [])]
                        for item in parsed_items:
                            item_name = item.get("name", "").lower()
                            if any(pn in item_name or item_name in pn for pn in plan_names):
                                slot_scores[slot] += 1
                                
            best_slot = max(slot_scores, key=slot_scores.get)
            if slot_scores[best_slot] > 0:
                resolved_slot = best_slot
        except Exception:
            logger.exception("Failed to auto-resolve meal slot by plan overlap")

    if not resolved_slot:
        resolved_slot = "snack"

    # 4. Save to DB
    record = await prisma.mealtracking.create(
        data={
            "userId":      user_id,
            "inputText":   input_text_display,
            "parsedItems": to_json_string(parsed_items),
            "totalCals":   int(total_calories),
            "macros":      to_json_string(macros),
            "feedback":    ai_feedback,
            "mealSlot":    resolved_slot,
            "language":    language,
        }
    )

    # 5. Auto-complete slot in today's Meal Plan
    if resolved_slot:
        try:
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_plan = await prisma.mealplan.find_first(
                where={
                    "userId":   user_id,
                    "planType": "daily",
                    "planDate": {"gte": today_start, "lt": today_start + timedelta(days=1)},
                }
            )
            if today_plan:
                from app.utils import safe_list
                completed = safe_list(from_json_string(today_plan.completedSlots)) if today_plan.completedSlots else []
                if resolved_slot not in completed:
                    completed.append(resolved_slot)
                    await prisma.mealplan.update(
                        where={"planId": today_plan.planId},
                        data={"completedSlots": to_json_string(completed)},
                    )
        except Exception:
            logger.exception("Failed to auto-complete meal plan slot in chat logging")

    return {
        "id":             record.id,
        "parsed_items":   parsed_items,
        "total_calories": int(total_calories),
        "macros":         macros,
        "ai_feedback":    ai_feedback,
        "meal_slot":      meal_slot,
        "logged_at":      record.loggedAt.isoformat(),
    }



async def _build_user_context(current_user_id: str) -> str:
    """
    Gather the full personalized context for the AI:
    - Profile + calculated nutrition targets
    - Recent meal tracking logs (7 days)
    - Latest health log (weight, BP, sugar)
    - Today's meal plan (what AI already planned)
    Returns a plain-text context block to inject into the system prompt.
    """
    lines = []

    # ── Profile & Targets ─────────────────────────────────────────────────────
    profile = await prisma.profile.find_unique(where={"userId": current_user_id})
    conditions = safe_list(profile.medicalConditions) if profile else []

    if profile:
        lines.append("=== USER PROFILE ===")
        lines.append(f"Name: {profile.nameBn or profile.nameEn or 'User'}")
        lines.append(f"Age: {profile.age}, Gender: {profile.gender}")
        lines.append(f"Weight: {profile.weightKg}kg, Height: {profile.heightCm}cm")
        lines.append(f"Goal: {profile.goal}")
        lines.append(f"Activity Level: {profile.activityLevel}")
        lines.append(f"Medical Conditions: {', '.join(conditions) if conditions else 'None'}")
        lines.append(f"Preferred Foods: {', '.join(safe_list(profile.preferredFoods)) if profile.preferredFoods else 'No preference'}")
        lines.append(f"Disliked Foods: {', '.join(safe_list(profile.dislikedFoods)) if profile.dislikedFoods else 'None'}")

        if profile.weightKg and profile.heightCm and profile.gender and profile.activityLevel:
            try:
                current_weight = profile.weightKg
                latest_log = await prisma.healthlog.find_first(
                    where={"userId": current_user_id},
                    order={"logDate": "desc"},
                )
                if latest_log and latest_log.weightKg:
                    current_weight = latest_log.weightKg

                targets = calculate_targets({
                    "gender": profile.gender,
                    "height_cm": profile.heightCm,
                    "weight_kg": current_weight,
                    "activity_level": profile.activityLevel,
                    "age": profile.age,
                    "goal": profile.goal,
                })
                lines.append(f"\n=== NUTRITION TARGETS (AI-calculated) ===")
                lines.append(f"Daily Calories: {targets['target_calories']} kcal")
                lines.append(f"Protein: {targets['protein_g']}g | Carbs: {targets['carbs_g']}g | Fat: {targets['fat_g']}g")
                lines.append(f"BMI: {targets['bmi']} ({targets.get('bmi_category', '')})")
                lines.append(f"Water: {targets['water_L']}L/day")
            except Exception:
                pass

    # ── Latest Health Log ─────────────────────────────────────────────────────
    health_log = await prisma.healthlog.find_first(
        where={"userId": current_user_id},
        order={"logDate": "desc"},
    )
    if health_log:
        lines.append("\n=== LATEST HEALTH LOG ===")
        if health_log.weightKg:
            lines.append(f"Weight: {health_log.weightKg}kg (logged {health_log.logDate.date()})")
        if health_log.bloodPressure:
            lines.append(f"Blood Pressure: {health_log.bloodPressure}")
        if health_log.bloodSugar:
            lines.append(f"Blood Sugar: {health_log.bloodSugar} mmol/L")
        if health_log.hba1c:
            lines.append(f"HbA1c: {health_log.hba1c}%")
        if health_log.notes:
            lines.append(f"Notes: {health_log.notes}")

    # ── Today's Meal Plan ─────────────────────────────────────────────────────
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_plan = await prisma.mealplan.find_first(
        where={"userId": current_user_id, "planDate": {"gte": today}},
        order={"createdAt": "desc"},
    )
    if today_plan and today_plan.planData:
        try:
            plan_data = json.loads(today_plan.planData) if isinstance(today_plan.planData, str) else today_plan.planData
            completed_slots = []
            if today_plan.completedSlots:
                completed_slots = json.loads(today_plan.completedSlots) if isinstance(today_plan.completedSlots, str) else today_plan.completedSlots
            
            lines.append("\n=== TODAY'S MEAL PLAN ===")
            for meal in plan_data.get("meals", []):
                status = "✅ Eaten" if meal.get("slot") in completed_slots else "⬜ Pending"
                items_text = ", ".join(
                    f"{i.get('name_bn') or i.get('name_en')} ({i.get('calories', '?')} kcal)"
                    for i in meal.get("items", [])
                )
                lines.append(f"[{meal.get('slot_bn') or meal.get('slot')}] {status}: {items_text or 'No items'} (~{meal.get('target_calories', '?')} kcal)")
        except Exception:
            pass

    # ── Recent Meal Tracking Logs (7 days) ────────────────────────────────────
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_logs = await prisma.mealtracking.find_many(
        where={"userId": current_user_id, "loggedAt": {"gte": week_ago}},
        order={"loggedAt": "desc"},
        take=15,
    )
    if recent_logs:
        lines.append("\n=== RECENT MEALS LOGGED (last 7 days) ===")
        for log in recent_logs:
            day = log.loggedAt.strftime("%a %d %b")
            slot = log.mealSlot or "unknown"
            cals = log.totalCals or 0
            text = log.inputText[:80] if log.inputText else "খাবার ট্র্যাক করা হয়েছে"
            lines.append(f"[{day} · {slot}] {text} → {cals} kcal")

    return "\n".join(lines)


@router.post("")
async def chat(req: ChatRequest, current_user=Depends(get_current_user)):
    """Stream an AI chat response via SSE.
    Uses full user context RAG: profile + targets + health log + today's plan + recent meal logs.
    Also supports multi-turn conversation via optional history field.
    Supports function calling to log meals directly from chat text or image upload.
    """

    async def event_generator():
        # 1. Build rich user context
        user_context = await _build_user_context(current_user.id)

        # 2. Query GraphRAG for food knowledge relevant to the message
        rag_food_context = ""
        try:
            rag = KhadokGraphRAG()
            profile = await prisma.profile.find_unique(where={"userId": current_user.id})
            conditions = safe_list(profile.medicalConditions) if profile else []
            search_results = rag.search_food(req.message) if req.message else []
            if search_results:
                rag_food_context = "\n=== FOOD KNOWLEDGE (from nutrition database) ===\n"
                for food in search_results[:6]:
                    ctx = rag.get_chatbot_context(food["code"], conditions)
                    rag_food_context += f"- {ctx}\n"
        except Exception as e:
            logger.warning("Chat GraphRAG context unavailable: %s", e)

        # 3. Build system prompt — strictly scoped to diet & nutrition only
        system_msg = (
            "You are পুষ্টি এআই (PushtiAI), a prestigious Bangladeshi diet and nutrition assistant backed by a "
            "verified Graph-RAG food database. Your SOLE purpose is to help users with:\n"
            "  - Personalized food and meal recommendations\n"
            "  - Daily diet planning based on their health profile and goals\n"
            "  - Calorie and macro-nutrient information (from the verified database only)\n"
            "  - Meal logging and food tracking\n"
            "  - Complete Health & Nutrition Reports, including calorie history, weights, and compliance\n"
            "  - Nutritional analysis of foods (calories, protein, carbs, fat, fiber)\n"
            "  - Which foods to prefer or avoid based on their logged medical conditions\n\n"
            "=== HARD RESTRICTIONS — NEVER VIOLATE ===\n"
            "You are STRICTLY FORBIDDEN from:\n"
            "  1. Providing any medical consultation, diagnosis, or treatment advice.\n"
            "  2. Recommending medicines, prescription drug clinical dosages, or medical therapies.\n"
            "  3. Interpreting blood reports or lab results as a doctor's opinion.\n"
            "  4. Answering ANY question unrelated to food, diet, nutrition, or weight health reports "
            "(e.g. history, politics, coding, math, travel, entertainment, relationships).\n"
            "  5. Generating creative content (stories, poems, essays, jokes).\n"
            "  6. Pretending to be any other assistant or persona.\n\n"
            "If the user asks ANYTHING outside of food/diet/nutrition/reports, respond ONLY with:\n"
            "  Bengali: 'দুঃখিত, আমি শুধুমাত্র খাদ্য, পুষ্টি এবং ডায়েট পরিকল্পনা বিষয়ক প্রশ্নের উত্তর দিতে সক্ষম। "
            "চিকিৎসা পরামর্শ বা অন্য যেকোনো বিষয়ের জন্য সংশ্লিষ্ট বিশেষজ্ঞের সাথে যোগাযোগ করুন।'\n"
            "  English: 'Sorry, I can only assist with food, nutrition, and diet planning. "
            "For medical advice or any other topic, please consult the relevant expert.'\n\n"
            "=== NUTRITION RESPONSE RULES ===\n"
            "1. Always reply in Bengali if the user writes in Bengali, English otherwise.\n"
            "2. If the user has not set up their profile, gently guide them to complete it.\n"
            "3. For food/meal questions, cross-reference the user's medical conditions, recent meal logs, "
            "and nutrition targets from the context below.\n"
            "3b. TODAY'S MEAL PLAN: The user's current meal plan for today is listed in the context below under 'TODAY'S MEAL PLAN'. "
            "When the user asks what they should eat, what's for breakfast/lunch/dinner, or anything about their meal plan, "
            "you MUST reference the specific foods listed in their today's meal plan. Do NOT invent a different meal plan. "
            "If a slot is marked as '⬜ Pending', tell them exactly what foods are planned for that slot. "
            "If a slot is marked as '✅ Eaten', acknowledge it and suggest the next pending meal.\n"
            "4. For calorie/macro data, ONLY use values from the Graph-RAG context below. "
            "NEVER invent or estimate nutrition values from your own training memory.\n"
            "5. When discussing any food, always state: name + amount + calories from the database "
            "(e.g. '১০০ গ্রাম ভাতে ১৩০ ক্যালোরি').\n"
            "6. Keep responses concise and warm. Use bullet points for lists.\n"
            "7. MEAL LOGGING: If the user says they ate something or uploads a food photo, "
            "call the `log_meal` tool with a clear description of the food items.\n"
            "8. HEALTH REPORT & PDF GENERATION: If the user asks for a health report, nutrition progress summary, "
            "weight logs, or a 3-day/7-day/30-day health report, you MUST provide a friendly summary of their calories, "
            "nutrients, and weights from their history inside USER'S COMPLETE CONTEXT. "
            "Additionally, you MUST append the exact tag '[HEALTH_REPORT_LINK]' (including brackets) at the very end of your response text. "
            "This tag automatically generates an interactive high-fidelity PDF report download card for the user!\n"
            "9. ALWAYS NAME SPECIFIC FOODS: Whenever you suggest meals, recipes, or ingredients, you MUST explicitly name "
            "the specific foods using common Bangladeshi names (e.g. ভাত, ডাল, মাছ, মুরগি, ডিম, আলু, পালং শাক, আটা রুটি, ইলিশ). "
            "Do NOT give vague advice like 'eat some protein' or 'have vegetables' — always say WHICH protein or WHICH vegetable. "
            "This is critical because the app automatically shows grocery purchase cards with live prices and nearest shop locations "
            "for every food you mention. The more specific foods you mention, the more helpful the grocery cards become.\n"
            "10. YOU HAVE ACCESS TO APP TOOLS — USE THEM: You are equipped with many tools to control the app. "
            "Whenever the user asks to DO something (not just ask a question), USE the appropriate tool. Examples:\n"
            "   - 'I ate rice and fish' → call log_meal\n"
            "   - 'Show my meal plan' → call get_meal_plan\n"
            "   - 'I weigh 72kg now' → call update_profile + log_health\n"
            "   - 'Remind me to take Metformin at 8am' → call add_medicine_reminder\n"
            "   - 'What did I eat today?' → call get_meal_plan\n"
            "   - 'Is rice safe for diabetes?' → call search_food, then get_food_safety\n"
            "   - 'Go to my profile' → call navigate_to\n"
            "   - 'Show my medicines' → call get_medicine_reminders\n"
            "   - 'I feel dizzy' → call log_health with symptoms\n"
            "   - 'My blood pressure is 140/90' → call log_health with blood_pressure\n"
            "Do NOT describe what you would do — actually call the tool.\n\n"
            f"=== USER'S COMPLETE CONTEXT ===\n{user_context}\n"
            f"{rag_food_context}"
        )

        # 4. Build message list (supports multi-turn history from client)
        history = getattr(req, "history", []) or []
        messages = [{"role": "system", "content": system_msg}]

        # Re-inject last 10 turns from client-provided history
        for turn in history[-10:]:
            if turn.role in ("user", "assistant") and turn.content:
                messages.append({"role": turn.role, "content": turn.content})

        # If the client attached an image (base64 data-URL), build a multimodal
        # user message so OpenAI's vision model can see the image alongside text.
        if getattr(req, "image_data_url", None):
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": req.message or "What do you see in this image? Please identify it and log it as a meal."},
                    {"type": "image_url", "image_url": {"url": req.image_data_url}},
                ],
            })
        else:
            messages.append({"role": "user", "content": req.message})

        # ── Tool definitions: every app feature callable from chat ────────────
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "log_meal",
                    "description": "Log a meal eaten by the user to their daily diet log. Use this whenever the user explicitly asks to log/track a meal, says they ate something, or uploads a photo of food to track/log.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "description": {"type": "string", "description": "Description of the food items eaten. Be specific. If there is an image, list all the foods visible."},
                            "meal_slot": {"type": "string", "enum": ["breakfast", "lunch", "dinner", "snack"], "description": "The meal slot. Default to 'snack' if not clear."}
                        },
                        "required": ["description"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_profile",
                    "description": "Fetch the user's health profile (age, weight, height, conditions, goals, etc.). Use when the user asks about their profile, BMI, targets, or personal data.",
                    "parameters": {"type": "object", "properties": {}, "required": []}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "update_profile",
                    "description": "Update the user's profile fields. Use when the user says their weight changed, they want to update age, conditions, goals, etc. Only include fields that need to change.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "weight_kg": {"type": "number", "description": "Current weight in kg"},
                            "height_cm": {"type": "number", "description": "Height in cm"},
                            "age": {"type": "integer", "description": "Age in years"},
                            "gender": {"type": "string", "enum": ["male", "female", "other"], "description": "Gender"},
                            "activity_level": {"type": "string", "enum": ["sedentary", "light", "moderate", "active", "very_active"], "description": "Activity level"},
                            "goal": {"type": "string", "enum": ["Lose Weight", "Maintain", "Gain Weight", "Muscle Gain"], "description": "Diet goal"},
                            "medical_conditions": {"type": "array", "items": {"type": "string"}, "description": "List of medical conditions"},
                            "preferred_foods": {"type": "array", "items": {"type": "string"}, "description": "Foods the user likes"},
                            "disliked_foods": {"type": "array", "items": {"type": "string"}, "description": "Foods the user dislikes"},
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_meal_plan",
                    "description": "Get the user's meal plan for today. Use when the user asks 'what should I eat today?', 'show my meal plan', or wants to see today's breakfast/lunch/dinner.",
                    "parameters": {"type": "object", "properties": {}, "required": []}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "mark_meal_complete",
                    "description": "Mark a meal slot as eaten or uneaten. Use when the user says they finished a meal, skipped a meal, or want to mark a slot complete.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "slot": {"type": "string", "enum": ["breakfast", "lunch", "dinner", "snack"], "description": "The meal slot"},
                            "completed": {"type": "boolean", "description": "True to mark as eaten, false to unmark"}
                        },
                        "required": ["slot"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "log_health",
                    "description": "Log health metrics like weight, blood pressure, blood sugar, HbA1c, or symptoms. Use when the user reports any health measurement or symptom.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "weight_kg": {"type": "number", "description": "Weight in kg"},
                            "blood_pressure": {"type": "string", "description": "Blood pressure e.g. '120/80'"},
                            "blood_sugar": {"type": "number", "description": "Blood sugar in mmol/L"},
                            "hba1c": {"type": "number", "description": "HbA1c percentage"},
                            "symptoms": {"type": "string", "description": "Any symptoms the user reports"},
                            "notes": {"type": "string", "description": "Additional notes"}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_health_logs",
                    "description": "Get recent health log entries. Use when the user asks about their weight history, blood pressure trends, or recent symptoms.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "limit": {"type": "integer", "description": "Number of recent logs to fetch (max 30)", "default": 7}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_medicine_reminders",
                    "description": "List the user's active medicine reminders. Use when the user asks 'what medicines should I take?' or wants to see their reminders.",
                    "parameters": {"type": "object", "properties": {}, "required": []}
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "add_medicine_reminder",
                    "description": "Add a new medicine reminder. Use when the user says they need to take a medicine at certain times.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Medicine name e.g. 'Metformin 500mg'"},
                            "dose": {"type": "string", "description": "Dose instructions e.g. '1 tablet'"},
                            "times": {"type": "array", "items": {"type": "string"}, "description": "Times in 24h format e.g. ['08:00', '20:00']"},
                            "with_food": {"type": "boolean", "description": "Should be taken with food"},
                            "notes": {"type": "string", "description": "Extra notes"}
                        },
                        "required": ["name", "times"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "delete_medicine_reminder",
                    "description": "Delete a medicine reminder. Use when the user says they stopped a medicine or want to remove a reminder.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "reminder_id": {"type": "string", "description": "The reminder ID to delete"}
                        },
                        "required": ["reminder_id"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_food",
                    "description": "Search the food database by name. Use when the user asks about a specific food's nutrition, calories, or safety.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Food name in Bengali or English e.g. 'ভাত', 'egg', 'ইলিশ'"}
                        },
                        "required": ["query"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_food_safety",
                    "description": "Get personalized food safety analysis for the user's conditions. Use when the user asks 'is X safe for diabetes?' or similar.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "food_code": {"type": "string", "description": "Food code from search results e.g. 'A019'"}
                        },
                        "required": ["food_code"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_health_report",
                    "description": "Generate a health summary report for a period. Use when the user asks for their report, progress, or summary.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "days": {"type": "integer", "description": "Number of days to include (max 30)", "default": 7}
                        },
                        "required": []
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "navigate_to",
                    "description": "Navigate the user to a different page in the app. Use when the user says 'show my meal plan', 'go to my profile', 'take me to medicine reminders', etc.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "page": {"type": "string", "enum": ["/dashboard", "/chat", "/meal-plan", "/health-log", "/profile", "/medicine", "/foods", "/report", "/micronutrients"], "description": "Page path to navigate to"}
                        },
                        "required": ["page"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "show_toast",
                    "description": "Show a toast notification to the user. Use sparingly for important confirmations.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "message": {"type": "string", "description": "Toast message text"},
                            "level": {"type": "string", "enum": ["info", "success", "warning", "error"], "description": "Toast severity level"}
                        },
                        "required": ["message"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "personal_cooker_chat",
                    "description": "Invoke the Personal Cooker (NutriSaathi) for condition-specific recipes, cooking methods, or food safety advice. Use when the user asks for recipes tailored to a medical condition, cooking instructions for restricted diets, or whether a specific food is safe for their disease.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "message": {"type": "string", "description": "The user's recipe, cooking, or food-safety question"},
                            "condition": {"type": "string", "description": "Medical condition to tailor the answer for, e.g. Diabetes, Hypertension, CKD, None"},
                            "session_id": {"type": "string", "description": "Optional session ID for continuity. Omit to use auto-generated daily session."}
                        },
                        "required": ["message", "condition"]
                    }
                }
            },
        ]

        # 5. Stream LLM response
        assistant_response = ""
        try:
            response = await llm_client.client.chat.completions.create(
                model=llm_client.model,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                stream=True,
                temperature=0.7,
            )

            tool_calls = []
            async for chunk in response:
                if len(chunk.choices) == 0:
                    continue
                delta = chunk.choices[0].delta
                if delta.content:
                    assistant_response += delta.content
                    yield f"data: {json.dumps({'token': delta.content})}\n\n"
                
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        if len(tool_calls) <= tc.index:
                            tool_calls.append({
                                "id": tc.id or "",
                                "type": "function",
                                "function": {
                                    "name": tc.function.name or "",
                                    "arguments": tc.function.arguments or ""
                                }
                            })
                        else:
                            existing = tool_calls[tc.index]
                            if tc.id:
                                existing["id"] = tc.id
                            if tc.function.name:
                                existing["function"]["name"] += tc.function.name
                            if tc.function.arguments:
                                existing["function"]["arguments"] += tc.function.arguments

            # If tool calls were requested, execute them
            # Tools that mutate user data — after these run we MUST rebuild context
            _MUTATING_TOOLS = {
                "update_profile", "log_health", "log_meal",
                "mark_meal_complete", "add_medicine_reminder", "delete_medicine_reminder",
            }
            if tool_calls:
                formatted_tool_calls = []
                tool_results = []
                mutated = False

                for tool_call in tool_calls:
                    func_name = tool_call["function"]["name"]
                    arguments_str = tool_call["function"]["arguments"]
                    try:
                        args = json.loads(arguments_str)
                    except Exception:
                        args = {}

                    formatted_tool_calls.append({
                        "id": tool_call["id"],
                        "type": "function",
                        "function": {
                            "name": func_name,
                            "arguments": arguments_str
                        }
                    })

                    result = None

                    # ── Special inline handler for log_meal (has custom SSE event) ──
                    if func_name == "log_meal":
                        description = args.get("description", "")
                        meal_slot = args.get("meal_slot", "snack")
                        logged_meal = await perform_meal_logging(
                            user_id=current_user.id,
                            input_text=description,
                            meal_slot=meal_slot,
                            language=req.language
                        )
                        yield f"data: {json.dumps({'meal_logged': logged_meal})}\n\n"
                        result = logged_meal
                        mutated = True

                    # ── Generic dispatch for all other tools ──
                    elif func_name in TOOL_DISPATCH:
                        handler, needs_user = TOOL_DISPATCH[func_name]
                        if handler:
                            try:
                                if needs_user:
                                    result = await handler(current_user.id, args)
                                else:
                                    result = await handler(args)
                            except Exception as e:
                                logger.warning("Tool %s failed: %s", func_name, e)
                                result = {"success": False, "error": str(e)}

                            # Emit action SSE event if the tool returned one
                            if isinstance(result, dict) and result.get("action"):
                                yield f"data: {json.dumps({'action': result['action']})}\n\n"
                                # Also yield a tool_result event for inline cards
                                yield f"data: {json.dumps({'tool_result': {'tool': func_name, 'result': result['data']}})}\n\n"
                            elif isinstance(result, dict) and result.get("success"):
                                yield f"data: {json.dumps({'tool_result': {'tool': func_name, 'result': result.get('data', result)}})}\n\n"
                            elif isinstance(result, dict):
                                yield f"data: {json.dumps({'tool_result': {'tool': func_name, 'result': result}})}\n\n"
                        else:
                            result = {"success": False, "error": f"Handler not found for {func_name}"}
                    else:
                        result = {"success": False, "error": f"Unknown tool: {func_name}"}

                    if func_name in _MUTATING_TOOLS:
                        mutated = True

                    tool_results.append({
                        "tool_call_id": tool_call["id"],
                        "name": func_name,
                        "result": result,
                    })

                # Add tool invocation to conversation context
                messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": formatted_tool_calls
                })
                for tr in tool_results:
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tr["tool_call_id"],
                        "name": tr["name"],
                        "content": json.dumps(tr["result"])
                    })

                # If mutating tools ran, rebuild user context so the LLM sees fresh data
                if mutated:
                    fresh_context = await _build_user_context(current_user.id)
                    fresh_system = (
                        "You are পুষ্টি এআই (PushtiAI), a prestigious Bangladeshi diet and nutrition assistant backed by a "
                        "verified Graph-RAG food database. Your SOLE purpose is to help users with:\n"
                        "  - Personalized food and meal recommendations\n"
                        "  - Daily diet planning based on their health profile and goals\n"
                        "  - Calorie and macro-nutrient information (from the verified database only)\n"
                        "  - Meal logging and food tracking\n"
                        "  - Complete Health & Nutrition Reports, including calorie history, weights, and compliance\n"
                        "  - Nutritional analysis of foods (calories, protein, carbs, fat, fiber)\n"
                        "  - Which foods to prefer or avoid based on their logged medical conditions\n\n"
                        "=== HARD RESTRICTIONS — NEVER VIOLATE ===\n"
                        "You are STRICTLY FORBIDDEN from:\n"
                        "  1. Providing any medical consultation, diagnosis, or treatment advice.\n"
                        "  2. Recommending medicines, prescription drug clinical dosages, or medical therapies.\n"
                        "  3. Interpreting blood reports or lab results as a doctor's opinion.\n"
                        "  4. Answering ANY question unrelated to food, diet, nutrition, or weight health reports "
                        "(e.g. history, politics, coding, math, travel, entertainment, relationships).\n"
                        "  5. Generating creative content (stories, poems, essays, jokes).\n"
                        "  6. Pretending to be any other assistant or persona.\n\n"
                        "If the user asks ANYTHING outside of food/diet/nutrition/reports, respond ONLY with:\n"
                        "  Bengali: 'দুঃখিত, আমি শুধুমাত্র খাদ্য, পুষ্টি এবং ডায়েট পরিকল্পনা বিষয়ক প্রশ্নের উত্তর দিতে সক্ষম। "
                        "চিকিৎসা পরামর্শ বা অন্য যেকোনো বিষয়ের জন্য সংশ্লিষ্ট বিশেষজ্ঞের সাথে যোগাযোগ করুন।'\n"
                        "  English: 'Sorry, I can only assist with food, nutrition, and diet planning. "
                        "For medical advice or any other topic, please consult the relevant expert.'\n\n"
                        "=== NUTRITION RESPONSE RULES ===\n"
                        "1. Always reply in Bengali if the user writes in Bengali, English otherwise.\n"
                        "2. If the user has not set up their profile, gently guide them to complete it.\n"
                        "3. For food/meal questions, cross-reference the user's medical conditions, recent meal logs, "
                        "and nutrition targets from the context below.\n"
                        "4. For calorie/macro data, ONLY use values from the Graph-RAG context below. "
                        "NEVER invent or estimate nutrition values from your own training memory.\n"
                        "5. When discussing any food, always state: name + amount + calories from the database "
                        "(e.g. '১০০ গ্রাম ভাতে ১৩০ ক্যালোরি').\n"
                        "6. Keep responses concise and warm. Use bullet points for lists.\n"
                        "7. MEAL LOGGING: If the user says they ate something or uploads a food photo, "
                        "call the `log_meal` tool with a clear description of the food items.\n"
                        "8. HEALTH REPORT & PDF GENERATION: If the user asks for a health report, nutrition progress summary, "
                        "weight logs, or a 3-day/7-day/30-day health report, you MUST provide a friendly summary of their calories, "
                        "nutrients, and weights from their history inside USER'S COMPLETE CONTEXT. "
                        "Additionally, you MUST append the exact tag '[HEALTH_REPORT_LINK]' (including brackets) at the very end of your response text. "
                        "This tag automatically generates an interactive high-fidelity PDF report download card for the user!\n"
                        "9. ALWAYS NAME SPECIFIC FOODS: Whenever you suggest meals, recipes, or ingredients, you MUST explicitly name "
                        "the specific foods using common Bangladeshi names (e.g. ভাত, ডাল, মাছ, মুরগি, ডিম, আলু, পালং শাক, আটা রুটি, ইলিশ). "
                        "Do NOT give vague advice like 'eat some protein' or 'have vegetables' — always say WHICH protein or WHICH vegetable. "
                        "This is critical because the app automatically shows grocery purchase cards with live prices and nearest shop locations "
                        "for every food you mention. The more specific foods you mention, the more helpful the grocery cards become.\n"
                        "10. YOU HAVE ACCESS TO APP TOOLS — USE THEM: You are equipped with many tools to control the app. "
                        "Whenever the user asks to DO something (not just ask a question), USE the appropriate tool. Examples:\n"
                        "   - 'I ate rice and fish' → call log_meal\n"
                        "   - 'Show my meal plan' → call get_meal_plan\n"
                        "   - 'I weigh 72kg now' → call update_profile + log_health\n"
                        "   - 'Remind me to take Metformin at 8am' → call add_medicine_reminder\n"
                        "   - 'What did I eat today?' → call get_meal_plan\n"
                        "   - 'Is rice safe for diabetes?' → call search_food, then get_food_safety\n"
                        "   - 'Go to my profile' → call navigate_to\n"
                        "   - 'Show my medicines' → call get_medicine_reminders\n"
                        "   - 'I feel dizzy' → call log_health with symptoms\n"
                        "   - 'My blood pressure is 140/90' → call log_health with blood_pressure\n"
                        "Do NOT describe what you would do — actually call the tool.\n\n"
                        f"=== USER'S COMPLETE CONTEXT ===\n{fresh_context}\n"
                    )
                    messages[0] = {"role": "system", "content": fresh_system}

                # Stream the final response after tool execution!
                second_response = await llm_client.client.chat.completions.create(
                    model=llm_client.model,
                    messages=messages,
                    stream=True,
                    temperature=0.7,
                )
                async for chunk in second_response:
                    if len(chunk.choices) > 0:
                        content = chunk.choices[0].delta.content
                        if content:
                            assistant_response += content
                            yield f"data: {json.dumps({'token': content})}\n\n"

            # ── Grocery Suggestions (compute BEFORE saving so we can persist them) ──
            grocery_result = None
            try:
                grocery_result = suggest_groceries_from_chat(
                    chat_text=req.message,
                    user_lat=req.lat,
                    user_lng=req.lng,
                    parsed_food_items=None,
                    assistant_response=assistant_response,
                )
                if grocery_result and grocery_result.get("total_items", 0) > 0:
                    yield f"data: {json.dumps({'grocery_suggestions': grocery_result})}\n\n"
            except Exception as e:
                logger.warning("Grocery suggestion failed in chat: %s", e)

            # 6. Save messages to the database
            if req.message:
                try:
                    await prisma.chatmessage.create(
                        data={
                            "userId": current_user.id,
                            "role": "user",
                            "content": req.message,
                        }
                    )
                except Exception as e:
                    logger.warning("Failed to store user chat message in DB: %s", e)

            if assistant_response:
                try:
                    await prisma.chatmessage.create(
                        data={
                            "userId": current_user.id,
                            "role": "assistant",
                            "content": assistant_response,
                            "groceryData": json.dumps(grocery_result) if grocery_result else None,
                        }
                    )
                except Exception as e:
                    logger.warning("Failed to store assistant chat message in DB: %s", e)

        except Exception as e:
            logger.exception("LLM chat stream failed: %s", e)
            fallback = (
                "আমি এই মুহূর্তে উত্তর দিতে পারছি না — LLM সেবা সাময়িকভাবে বন্ধ আছে। "
                "আপনার পূর্ববর্তী খাবার পরিকল্পনা দেখতে 'খাবার' ট্যাব ব্যবহার করুন।"
                if req.language == "bn"
                else "LLM service is temporarily unavailable. Check your meal plan tab for today's recommendations."
            )
            for word in fallback.split():
                yield f"data: {json.dumps({'token': word + ' '})}\n\n"

            # Save partial/fallback response if any
            if req.message:
                try:
                    await prisma.chatmessage.create(
                        data={
                            "userId": current_user.id,
                            "role": "user",
                            "content": req.message,
                        }
                    )
                except Exception:
                    pass
            try:
                await prisma.chatmessage.create(
                    data={
                        "userId": current_user.id,
                        "role": "assistant",
                        "content": fallback,
                    }
                )
            except Exception:
                pass

            # Also try to send grocery suggestions even on fallback
            try:
                grocery_result = suggest_groceries_from_chat(
                    chat_text=req.message,
                    user_lat=req.lat,
                    user_lng=req.lng,
                    parsed_food_items=None,
                    assistant_response=fallback,
                )
                if grocery_result and grocery_result.get("total_items", 0) > 0:
                    yield f"data: {json.dumps({'grocery_suggestions': grocery_result})}\n\n"
            except Exception:
                pass

        yield f"data: {json.dumps({'done': True})}\n\n"


    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/diet-plan-session")
async def diet_plan_session(req: DietPlanChatRequest, current_user=Depends(get_current_user)):
    """
    Stream an AI chat response specifically for building a diet plan.
    Guided conversation to collect required profile fields, followed by plan generation.
    """

    async def event_generator():
        # Fetch user profile to pre-fill details and avoid asking questions they already answered
        profile = await prisma.profile.find_unique(where={"userId": current_user.id})
        
        dynamic_prompt = COLLECTION_SYSTEM_PROMPT
        if profile:
            conds = safe_list(profile.medicalConditions)
            dynamic_prompt += (
                f"\n\n=== USER'S EXISTING SAVED PROFILE DATA ===\n"
                f"We already have the following confirmed details for this user:\n"
                f"- age: {profile.age}\n"
                f"- gender: {profile.gender}\n"
                f"- height_cm: {profile.heightCm}\n"
                f"- weight_kg: {profile.weightKg}\n"
                f"- activity_level: {profile.activityLevel}\n"
                f"- goal: {profile.goal}\n"
                f"- medical_conditions: {conds}\n\n"
                f"IMPORTANT INSTRUCTIONS:\n"
                f"1. Do NOT ask the user for any of the above details step-by-step unless they request to change them!\n"
                f"2. In your response, acknowledge their saved details warmly. Ask if they want to use these details directly to generate their diet plan, or if they would like to update anything first.\n"
                f"3. If they say 'yes', 'confirm', 'হ্যাঁ', 'ঠিক আছে', or indicate they want to use their saved details, IMMEDIATELY complete the collection by outputting the ##DIET_DATA_COMPLETE## marker followed by the JSON block containing these exact saved details!\n"
            )

        # 1. Start with the dynamic system prompt
        messages = [{"role": "system", "content": dynamic_prompt}]

        # 2. Add conversation history
        for turn in req.history:
            if turn.role in ("user", "assistant") and turn.content:
                messages.append({"role": turn.role, "content": turn.content})

        # 3. Add current message
        messages.append({"role": "user", "content": req.message})

        # 4. Stream LLM response & capture output to check for completion marker
        full_response = ""
        try:
            async for token in llm_client.chat_completion_stream(messages):
                full_response += token
                # Only stream the token if it's not part of the JSON marker section
                if "##DIET_DATA_COMPLETE##" not in full_response:
                    yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as e:
            fallback = "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না।" if req.language == "bn" else "Sorry, I can't reply right now."
            yield f"data: {json.dumps({'token': fallback})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
            return

        # 5. Check if we reached the completion marker
        collected_data = extract_collected_data(full_response)
        
        if collected_data:
            # We have all data! Let's generate the plan
            yield f"data: {json.dumps({'status': 'generating_plan'})}\n\n"
            try:
                plan_result = await generate_plan_from_collected(collected_data, current_user.id, req.language)
                
                # Stream the special plan_ready event
                msg_bn = "আপনার ডায়েট পরিকল্পনা সফলভাবে তৈরি হয়েছে! নিচে আপনার পরিকল্পনাটি দেখুন।"
                msg_en = "Your diet plan has been successfully created! See your plan below."
                
                response_data = DietPlanChatResponse(
                    plan_id=plan_result["plan_id"],
                    plan_data=plan_result["plan_data"],
                    calorie_target=plan_result["calorie_target"],
                    message_bn=msg_bn,
                    message_en=msg_en
                )
                
                yield f"data: {json.dumps({'plan_ready': response_data.model_dump()})}\n\n"

                # Also send grocery suggestions for the generated plan
                try:
                    plan_data = plan_result.get("plan_data", {})
                    food_names = []
                    for meal in plan_data.get("meals", []):
                        for item in meal.get("items", []):
                            name = item.get("name_bn") or item.get("name_en")
                            if name:
                                food_names.append(name)
                    if food_names:
                        from app.services.grocery_service import suggest_groceries_for_foods
                        grocery_result = suggest_groceries_for_foods(
                            food_names,
                            user_lat=getattr(req, 'lat', None) or 23.8103,
                            user_lng=getattr(req, 'lng', None) or 90.4125,
                            limit_per_food=1,
                        )
                        if grocery_result and grocery_result.get("total_items", 0) > 0:
                            yield f"data: {json.dumps({'grocery_suggestions': grocery_result})}\n\n"
                except Exception as e:
                    logger.warning("Grocery suggestion failed in diet plan session: %s", e)
            except Exception as e:
                err_msg = "পরিকল্পনা তৈরি করতে সমস্যা হয়েছে।" if req.language == "bn" else "Failed to generate plan."
                yield f"data: {json.dumps({'error': err_msg})}\n\n"

        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ─── Voice: Whisper transcription (push-to-talk for meal log etc.) ───────────
@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str | None = Form(default=None),
    current_user: dict = Depends(get_current_user),
):
    """Transcribe an uploaded audio clip to text. Used by meal-log voice input.

    Accepts: webm/ogg/wav/mp3/m4a/mp4/flac (max 25 MB).
    Returns: {"text": "..."}
    """
    audio_bytes = await file.read()
    filename    = file.filename or "audio.m4a"

    logger.info("Transcribe request: filename=%s size=%d bytes language=%s", filename, len(audio_bytes), language)

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio payload")
    if len(audio_bytes) < 1000:
        logger.warning("Audio too small (%d bytes) — likely silent/empty recording", len(audio_bytes))
        return {"text": ""}
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file exceeds 25 MB limit")

    # Map language code
    lang = None
    if language:
        lang = "bn" if language.lower().startswith("bn") else (
            "en" if language.lower().startswith("en") else language
        )

    # Short vocabulary hint improves accuracy for domain-specific terms.
    # IMPORTANT: Must stay very short (≤10 words) to prevent gpt-4o-transcribe
    # from echoing it back when audio is silent.
    vocab_hint = "ভাত ডাল মাছ ডিম রুটি চা" if lang == "bn" else "rice dal egg bread tea"

    # Set of known prompt words used for echo detection
    prompt_words = set(vocab_hint.lower().split())

    try:
        # gpt-4o-transcribe: best multilingual accuracy, especially for Bangla
        text = await llm_client.transcribe_audio(
            audio_bytes=audio_bytes,
            filename=filename,
            model="gpt-4o-transcribe",
            language=lang,
            prompt=vocab_hint,
        )
        logger.info("Transcription result: %r", text)
    except Exception as exc:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}")

    if not text or not text.strip():
        return {"text": ""}

    # Echo guard: if EVERY word in the response is a known prompt word,
    # it means the model hallucinated — no real speech was captured.
    response_words = set(text.strip().lower().split())
    if response_words and response_words.issubset(prompt_words):
        logger.warning("Whisper echo detected — returning empty. Response was: %r", text)
        return {"text": ""}

    return {"text": text.strip()}


# ─── Voice: Realtime API session minting ──────────────────────────────────────
@router.post("/realtime/session")
async def create_realtime_session(
    payload: dict = Body(default={}),
    current_user: dict = Depends(get_current_user),
):
    """Mint a short-lived OpenAI Realtime ephemeral session for the browser to use.

    The browser opens a WebRTC peer connection directly to OpenAI using the
    returned `client_secret.value` as a Bearer token. We never expose the main
    LLM_API_KEY to the browser.

    Body (optional): {"voice": "alloy", "language": "bn" | "en"}
    Response: full session object from OpenAI (includes client_secret + model).
    """
    voice = (payload.get("voice") or "alloy").strip() or "alloy"
    language = (payload.get("language") or "").lower()

    # Build personalised RAG context to seed the assistant's instructions.
    try:
        rag_context = await _build_user_context(current_user.id)
    except Exception:
        logger.exception("Failed building user context for realtime session")
        rag_context = ""

    lang_directive = (
        "Reply in Bangla (Bengali) by default. Switch to English only if the user speaks English."
        if language.startswith("bn")
        else "Reply in the same language the user speaks (Bangla or English)."
    )

    instructions = (
        "You are DesiDiet, a friendly Bangladeshi personalised-nutrition voice assistant. "
        "Speak naturally and conversationally — short sentences, warm tone. "
        f"{lang_directive} "
        "Ground every recommendation in the user's profile, conditions, RDA targets, and "
        "today's plan provided below. Never invent food calories or medical claims. "
        "If the user asks for a meal plan, suggest local Bangladeshi foods (ভাত, ডাল, মাছ, "
        "সবজি, রুটি) appropriate to their goal and conditions. Always include a brief "
        "medical-disclaimer reminder when discussing serious conditions.\n\n"
        f"{rag_context}"
    )

    try:
        session = await llm_client.create_realtime_session(
            instructions=instructions,
            voice=voice,
        )
    except httpx.HTTPStatusError as exc:
        logger.exception("OpenAI realtime session creation failed")
        raise HTTPException(
            status_code=502,
            detail=f"Realtime session failed: {exc.response.status_code} {exc.response.text[:200]}",
        )
    except Exception as exc:
        logger.exception("Realtime session creation failed")
        raise HTTPException(status_code=502, detail=f"Realtime session failed: {exc}")

    return session


# ─── Chat History: Retrieve Saved Conversation Messages ───────────────────────
@router.get("/history")
async def get_chat_history(current_user=Depends(get_current_user)):
    """Retrieve stored chat history (last 50 messages) for the current user."""
    try:
        messages = await prisma.chatmessage.find_many(
            where={"userId": current_user.id},
            order={"createdAt": "asc"},
            take=50
        )
        return [{
            "role": msg.role,
            "content": msg.content,
            "id": msg.messageId,
            "groceryData": json.loads(msg.groceryData) if msg.groceryData else None,
        } for msg in messages]
    except Exception as e:
        logger.exception("Failed to fetch chat history: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch chat history")
