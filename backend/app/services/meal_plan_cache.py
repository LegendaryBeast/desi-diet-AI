"""Redis Caching Layer for Daily Meal Plans."""

import json
import logging
from datetime import datetime, date, timezone
from zoneinfo import ZoneInfo
from typing import Any, Dict, Optional
from app.core.token_optimizer import redis_client, REDIS_AVAILABLE

logger = logging.getLogger(__name__)


class CachedMealPlan:
    """Mock class that wraps a cached meal plan dictionary to look like a Prisma MealPlan object."""
    def __init__(self, d: Dict[str, Any]):
        self.planId = d.get("planId")
        self.userId = d.get("userId")
        
        plan_date = d.get("planDate")
        if isinstance(plan_date, str):
            self.planDate = datetime.fromisoformat(plan_date)
        else:
            self.planDate = plan_date
            
        self.planType = d.get("planType")
        self.planData = d.get("planData")
        self.calorieTarget = d.get("calorieTarget")
        self.aiSuggestionCal = d.get("aiSuggestionCal")
        self.userChoiceCal = d.get("userChoiceCal")
        self.language = d.get("language")
        self.feedback = d.get("feedback")
        self.completedSlots = d.get("completedSlots")
        
        created_at = d.get("createdAt")
        if isinstance(created_at, str):
            self.createdAt = datetime.fromisoformat(created_at)
        else:
            self.createdAt = created_at


def get_meal_plan_cache_key(user_id: str, date_val: Any) -> str:
    """Generate a consistent cache key for daily meal plans."""
    if isinstance(date_val, datetime):
        if date_val.tzinfo is None:
            dt_dhaka = date_val.replace(tzinfo=timezone.utc).astimezone(ZoneInfo("Asia/Dhaka"))
        else:
            dt_dhaka = date_val.astimezone(ZoneInfo("Asia/Dhaka"))
        date_str = dt_dhaka.strftime("%Y-%m-%d")
    elif isinstance(date_val, date):
        date_str = date_val.strftime("%Y-%m-%d")
    elif isinstance(date_val, str):
        date_str = date_val.split("T")[0]
    else:
        date_str = datetime.now(ZoneInfo("Asia/Dhaka")).strftime("%Y-%m-%d")
    return f"user:{user_id}:mealplan:daily:{date_str}"


def meal_plan_to_dict(plan: Any) -> Dict[str, Any]:
    """Serialize a Prisma MealPlan object to a JSON-compatible dictionary."""
    if not plan:
        return {}
        
    # Get plan_data
    plan_data = plan.planData
    if isinstance(plan_data, bytes):
        plan_data = plan_data.decode("utf-8")
        
    # Get completed_slots
    completed_slots = plan.completedSlots
    if isinstance(completed_slots, bytes):
        completed_slots = completed_slots.decode("utf-8")

    return {
        "planId": plan.planId,
        "userId": plan.userId,
        "planDate": plan.planDate.isoformat() if isinstance(plan.planDate, datetime) else plan.planDate,
        "planType": plan.planType,
        "planData": plan_data,
        "calorieTarget": plan.calorieTarget,
        "aiSuggestionCal": plan.aiSuggestionCal,
        "userChoiceCal": plan.userChoiceCal,
        "language": plan.language,
        "feedback": plan.feedback,
        "completedSlots": completed_slots,
        "createdAt": plan.createdAt.isoformat() if isinstance(plan.createdAt, datetime) else plan.createdAt,
    }


async def get_cached_meal_plan(user_id: str, date_val: Any) -> Optional[CachedMealPlan]:
    """Retrieve a meal plan from Redis cache."""
    if not REDIS_AVAILABLE or not redis_client:
        return None
    key = get_meal_plan_cache_key(user_id, date_val)
    try:
        cached = redis_client.get(key)
        if cached:
            logger.info(f"⚡ Redis MealPlan Cache Hit: {key}")
            return CachedMealPlan(json.loads(cached))
    except Exception as e:
        logger.warning(f"Failed to get meal plan from Redis cache: {e}")
    return None


async def set_cached_meal_plan(user_id: str, date_val: Any, plan: Any) -> None:
    """Store a meal plan in Redis cache."""
    if not REDIS_AVAILABLE or not redis_client:
        return
    key = get_meal_plan_cache_key(user_id, date_val)
    try:
        plan_dict = meal_plan_to_dict(plan)
        # Cache for 24 hours (86400 seconds)
        redis_client.setex(key, 86400, json.dumps(plan_dict))
        logger.info(f"💾 Redis MealPlan Cache Set: {key}")
    except Exception as e:
        logger.warning(f"Failed to set meal plan to Redis cache: {e}")


async def delete_cached_meal_plan(user_id: str, date_val: Any) -> None:
    """Invalidate/delete a daily meal plan from Redis cache."""
    if not REDIS_AVAILABLE or not redis_client:
        return
    key = get_meal_plan_cache_key(user_id, date_val)
    try:
        redis_client.delete(key)
        logger.info(f"🗑️ Redis MealPlan Cache Invalidated: {key}")
    except Exception as e:
        logger.warning(f"Failed to delete meal plan from Redis cache: {e}")
