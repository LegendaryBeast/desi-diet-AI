"""Chat tool handlers — every app feature callable by the LLM via function calling."""

import json
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta, timezone
from app.db import prisma
from app.utils import safe_list, from_json_string, to_json_string
from rag_engine import KhadokGraphRAG, calculate_targets

logger = logging.getLogger(__name__)

# ── Helper: build standard tool result envelope ───────────────────────────────

def _ok(data: Dict[str, Any], action: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    result = {"success": True, "data": data}
    if action:
        result["action"] = action
    return result


def _err(message: str) -> Dict[str, Any]:
    return {"success": False, "error": message}


# ── Profile Tools ─────────────────────────────────────────────────────────────

async def tool_get_profile(user_id: str, args: Dict[str, Any] = None) -> Dict[str, Any]:
    profile = await prisma.profile.find_unique(where={"userId": user_id})
    if not profile:
        return _err("Profile not found")
    return _ok({
        "name_bn": profile.nameBn,
        "name_en": profile.nameEn,
        "age": profile.age,
        "gender": profile.gender,
        "weight_kg": profile.weightKg,
        "height_cm": profile.heightCm,
        "activity_level": profile.activityLevel,
        "goal": profile.goal,
        "medical_conditions": safe_list(profile.medicalConditions),
        "preferred_foods": safe_list(profile.preferredFoods),
        "disliked_foods": safe_list(profile.dislikedFoods),
    })


# Fields that affect calorie targets and therefore require meal-plan invalidation
_TARGET_FIELDS = {"weight_kg", "height_cm", "age", "activity_level", "goal", "gender"}


async def _invalidate_todays_meal_plan(user_id: str) -> None:
    """Delete today's cached meal plan so it regenerates with fresh targets."""
    try:
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        await prisma.mealplan.delete_many(
            where={
                "userId": user_id,
                "planDate": {"gte": today, "lt": today + timedelta(days=1)},
            }
        )
    except Exception as e:
        logger.warning("Failed to invalidate today's meal plan: %s", e)


async def tool_update_profile(user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    allowed = {
        "name_bn": args.get("name_bn"),
        "name_en": args.get("name_en"),
        "age": args.get("age"),
        "gender": args.get("gender"),
        "weight_kg": args.get("weight_kg"),
        "height_cm": args.get("height_cm"),
        "activity_level": args.get("activity_level"),
        "goal": args.get("goal"),
        "medical_conditions": args.get("medical_conditions"),
        "preferred_foods": args.get("preferred_foods"),
        "disliked_foods": args.get("disliked_foods"),
    }
    # Filter out None values for partial update
    update_data = {k: v for k, v in allowed.items() if v is not None}
    if not update_data:
        return _err("No fields provided to update")
    try:
        await prisma.profile.update(where={"userId": user_id}, data=update_data)
        # If any target-affecting field changed, nuke the cached daily plan
        if _TARGET_FIELDS.intersection(update_data.keys()):
            await _invalidate_todays_meal_plan(user_id)
        return _ok({"message": "Profile updated successfully", "updated_fields": list(update_data.keys())})
    except Exception as e:
        logger.warning("Profile update failed: %s", e)
        return _err(f"Failed to update profile: {e}")


# ── Meal Plan Tools ───────────────────────────────────────────────────────────

async def tool_get_meal_plan(user_id: str, args: Dict[str, Any] = None) -> Dict[str, Any]:
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    plan = await prisma.mealplan.find_first(
        where={"userId": user_id, "planDate": {"gte": today}},
        order={"createdAt": "desc"},
    )
    if not plan or not plan.planData:
        return _err("No meal plan found for today")
    try:
        data = json.loads(plan.planData) if isinstance(plan.planData, str) else plan.planData
        completed = safe_list(from_json_string(plan.completedSlots)) if plan.completedSlots else []
        return _ok({
            "plan_id": plan.planId,
            "plan_date": plan.planDate.isoformat() if plan.planDate else None,
            "target_calories": plan.calorieTarget,
            "meals": data.get("meals", []),
            "completed_slots": completed,
            "macros": data.get("macros", {}),
        })
    except Exception as e:
        return _err(f"Failed to parse meal plan: {e}")


async def tool_mark_meal_complete(user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    slot = args.get("slot", "").lower()
    completed = args.get("completed", True)
    if slot not in ["breakfast", "lunch", "dinner", "snack"]:
        return _err("Invalid slot. Must be breakfast, lunch, dinner, or snack.")

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    plan = await prisma.mealplan.find_first(
        where={"userId": user_id, "planDate": {"gte": today}},
        order={"createdAt": "desc"},
    )
    if not plan:
        return _err("No meal plan found for today")

    completed_slots = safe_list(from_json_string(plan.completedSlots)) if plan.completedSlots else []
    if completed and slot not in completed_slots:
        completed_slots.append(slot)
    elif not completed and slot in completed_slots:
        completed_slots.remove(slot)

    try:
        await prisma.mealplan.update(
            where={"planId": plan.planId},
            data={"completedSlots": to_json_string(completed_slots)},
        )
        return _ok({"slot": slot, "completed": completed, "plan_id": plan.planId})
    except Exception as e:
        return _err(f"Failed to update meal completion: {e}")


# ── Health Log Tools ──────────────────────────────────────────────────────────

async def tool_log_health(user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    entry = {
        "userId": user_id,
        "logDate": datetime.now(timezone.utc),
        "notes": args.get("notes", ""),
    }
    if "weight_kg" in args:
        entry["weightKg"] = float(args["weight_kg"])
    if "blood_pressure" in args:
        entry["bloodPressure"] = args["blood_pressure"]
    if "blood_sugar" in args:
        entry["bloodSugar"] = float(args["blood_sugar"])
    if "hba1c" in args:
        entry["hba1c"] = float(args["hba1c"])
    if "symptoms" in args:
        entry["symptoms"] = args["symptoms"]

    try:
        log = await prisma.healthlog.create(data=entry)
        # Weight changes affect calorie targets — invalidate cached plan
        if "weight_kg" in args:
            await _invalidate_todays_meal_plan(user_id)
        return _ok({
            "log_id": log.logId,
            "weight_kg": log.weightKg,
            "blood_pressure": log.bloodPressure,
            "blood_sugar": log.bloodSugar,
            "hba1c": log.hba1c,
            "notes": log.notes,
            "symptoms": log.symptoms,
            "logged_at": log.logDate.isoformat() if log.logDate else None,
        })
    except Exception as e:
        return _err(f"Failed to log health data: {e}")


async def tool_get_health_logs(user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    limit = min(int(args.get("limit", 7)), 30)
    try:
        logs = await prisma.healthlog.find_many(
            where={"userId": user_id},
            order={"logDate": "desc"},
            take=limit,
        )
        return _ok({
            "logs": [
                {
                    "log_id": l.logId,
                    "date": l.logDate.date().isoformat() if l.logDate else None,
                    "weight_kg": l.weightKg,
                    "blood_pressure": l.bloodPressure,
                    "blood_sugar": l.bloodSugar,
                    "hba1c": l.hba1c,
                    "notes": l.notes,
                    "symptoms": l.symptoms,
                }
                for l in logs
            ]
        })
    except Exception as e:
        return _err(f"Failed to fetch health logs: {e}")


# ── Medicine Reminder Tools ───────────────────────────────────────────────────

async def tool_get_medicine_reminders(user_id: str, args: Dict[str, Any] = None) -> Dict[str, Any]:
    try:
        reminders = await prisma.medicinereminder.find_many(
            where={"userId": user_id, "active": True},
            order={"createdAt": "desc"},
        )
        return _ok({
            "reminders": [
                {
                    "id": r.id,
                    "name": r.name,
                    "dose": r.dose,
                    "times": safe_list(from_json_string(r.times)) if r.times else [],
                    "with_food": r.withFood,
                    "notes": r.notes,
                    "active": r.active,
                }
                for r in reminders
            ]
        })
    except Exception as e:
        return _err(f"Failed to fetch reminders: {e}")


async def tool_add_medicine_reminder(user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    name = args.get("name", "").strip()
    dose = args.get("dose", "").strip()
    times = args.get("times", [])
    with_food = args.get("with_food", False)
    notes = args.get("notes", "").strip()

    if not name:
        return _err("Medicine name is required")
    if not times:
        return _err("At least one time is required")

    try:
        rem = await prisma.medicinereminder.create(
            data={
                "userId": user_id,
                "name": name,
                "dose": dose,
                "times": to_json_string(times),
                "withFood": with_food,
                "notes": notes,
                "active": True,
            }
        )
        return _ok({
            "id": rem.id,
            "name": rem.name,
            "dose": rem.dose,
            "times": times,
            "with_food": rem.withFood,
            "notes": rem.notes,
        })
    except Exception as e:
        return _err(f"Failed to add reminder: {e}")


async def tool_delete_medicine_reminder(user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    reminder_id = args.get("reminder_id", "").strip()
    if not reminder_id:
        return _err("reminder_id is required")
    try:
        rem = await prisma.medicinereminder.find_unique(where={"id": reminder_id})
        if not rem or rem.userId != user_id:
            return _err("Reminder not found")
        await prisma.medicinereminder.update(
            where={"id": reminder_id},
            data={"active": False},
        )
        return _ok({"message": "Reminder deleted", "reminder_id": reminder_id})
    except Exception as e:
        return _err(f"Failed to delete reminder: {e}")


# ── Food Search & Safety Tools ────────────────────────────────────────────────

async def tool_search_food(user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    query = args.get("query", "").strip()
    if not query:
        return _err("Search query is required")
    try:
        rag = KhadokGraphRAG()
        results = rag.search_food(query)
        profile = await prisma.profile.find_unique(where={"userId": user_id})
        conditions = safe_list(profile.medicalConditions) if profile else []

        enriched = []
        for food in results[:8]:
            ctx = rag.get_chatbot_context(food.get("code", ""), conditions)
            enriched.append({
                "code": food.get("code", ""),
                "name_en": food.get("name_en", ""),
                "name_bn": food.get("name_bn", ""),
                "calories_per_100g": food.get("calories", 0),
                "protein_g": food.get("protein", 0),
                "food_group": food.get("food_group", ""),
                "insight": ctx,
            })
        return _ok({"query": query, "results": enriched})
    except Exception as e:
        return _err(f"Food search failed: {e}")


async def tool_get_food_safety(user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    food_code = args.get("food_code", "").strip()
    if not food_code:
        return _err("food_code is required")
    try:
        rag = KhadokGraphRAG()
        profile = await prisma.profile.find_unique(where={"userId": user_id})
        conditions = safe_list(profile.medicalConditions) if profile else []
        ctx = rag.get_chatbot_context(food_code, conditions)
        return _ok({"food_code": food_code, "safety_analysis": ctx})
    except Exception as e:
        return _err(f"Food safety check failed: {e}")


# ── Health Report Tool ────────────────────────────────────────────────────────

async def tool_get_health_report(user_id: str, args: Dict[str, Any] = None) -> Dict[str, Any]:
    days = min(int(args.get("days", 7)), 30)
    try:
        # Fetch meal tracking logs
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        tracked = await prisma.mealtracking.find_many(
            where={"userId": user_id, "loggedAt": {"gte": start_date}},
            order={"loggedAt": "desc"},
        )

        # Fetch health logs
        health_logs = await prisma.healthlog.find_many(
            where={"userId": user_id, "logDate": {"gte": start_date}},
            order={"logDate": "desc"},
        )

        # Calculate averages
        total_cals = sum(t.totalCals or 0 for t in tracked)
        avg_cals = round(total_cals / days, 1) if tracked else 0
        weights = [h.weightKg for h in health_logs if h.weightKg]
        latest_weight = weights[0] if weights else None

        return _ok({
            "period_days": days,
            "meals_logged": len(tracked),
            "avg_daily_calories": avg_cals,
            "latest_weight_kg": latest_weight,
            "health_log_count": len(health_logs),
            "recent_health_logs": [
                {
                    "date": h.logDate.date().isoformat() if h.logDate else None,
                    "weight_kg": h.weightKg,
                    "blood_pressure": h.bloodPressure,
                    "blood_sugar": h.bloodSugar,
                    "symptoms": h.symptoms,
                }
                for h in health_logs[:5]
            ],
        })
    except Exception as e:
        return _err(f"Failed to generate health report: {e}")


# ── Frontend Action Tools (emit action events) ────────────────────────────────

async def tool_navigate_to(user_id: str, args: Dict[str, Any] = None) -> Dict[str, Any]:
    page = args.get("page", "").strip()
    valid_pages = ["/dashboard", "/chat", "/meal-plan", "/health-log", "/profile",
                   "/medicine", "/foods", "/report", "/micronutrients", "/about"]
    if page not in valid_pages and not page.startswith("/"):
        return _err(f"Invalid page. Valid options: {', '.join(valid_pages)}")
    return _ok(
        {"message": f"Navigating to {page}", "page": page},
        action={"type": "navigate", "payload": {"to": page}},
    )


async def tool_show_toast(user_id: str, args: Dict[str, Any] = None) -> Dict[str, Any]:
    message = args.get("message", "").strip()
    level = args.get("level", "info")  # info, success, warning, error
    if not message:
        return _err("Toast message is required")
    return _ok(
        {"message": message, "level": level},
        action={"type": "show_toast", "payload": {"message": message, "level": level}},
    )


# ── Personal Cooker (NutriSaathi) Tool ────────────────────────────────────────

async def tool_personal_cooker_chat(user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """Invoke the Personal Cooker (NutriSaathi) for condition-specific recipes, cooking methods, or food safety."""
    from app.personal_cooker.service import PersonalCookerService
    import uuid

    message = args.get("message", "").strip()
    condition = args.get("condition", "").strip()
    if not message:
        return _err("Message is required")

    # Use a deterministic session ID per user+day so the chat has continuity
    session_id = args.get("session_id") or f"pc_{user_id}_{datetime.now(timezone.utc).strftime('%Y%m%d')}"

    try:
        result = await PersonalCookerService.chat(
            user_id=user_id,
            message=message,
            condition=condition,
            session_id=session_id,
        )
        return _ok({
            "reply": result["reply"],
            "condition": condition,
            "session_id": session_id,
            "context_used": result.get("context_used", []),
        })
    except Exception as e:
        logger.warning("Personal cooker chat failed: %s", e)
        return _err(f"Personal cooker failed: {e}")
