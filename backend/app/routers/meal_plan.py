"""Meal plan routes with micronutrient target computation."""

from fastapi import APIRouter, Depends, HTTPException, status
from app.db import prisma
from app.dependencies import get_current_user
from app.schemas import MealPlanResponse, MealPlanFeedbackRequest, MarkSlotCompleteRequest, MarkSlotCompleteResponse, EditMealPlanRequest
from app.services.meal_plan_service import generate_daily_meal_plan, generate_weekly_meal_plan, save_meal_plan, _ensure_item_emojis
from app.utils import safe_dict, safe_list, to_json_string, from_json_string
from datetime import datetime, timedelta
import asyncio
from typing import List, Dict, Any

router = APIRouter()


async def _get_micronutrient_details(plan_data: dict, user_id: str, completed_slots: List[str], target_date: datetime) -> List[dict]:
    # 1. Fetch user profile
    profile = await prisma.profile.find_unique(where={"userId": user_id})
    if not profile:
        return []
    
    conditions = safe_list(profile.medicalConditions) if profile.medicalConditions else []
    gender = (profile.gender or "male").lower()
    age = profile.age or 30

    # 2. Get RDA Key
    from rag_engine.planner import get_rda_key
    rda_key = get_rda_key(age, gender)

    # 3. Get required and default nutrients list
    # IMPORTANT: Names MUST match the Nutrient node names stored in Neo4j (from nutrients_abbreviations.csv)
    # 'vitc' abbreviation → 'Ascorbic acids (C)'  (NOT 'Vitamin C')
    # 'vita' abbreviation → 'Vitamin A'
    # 'fe'   abbreviation → 'Iron (Fe)'
    # 'ca'   abbreviation → 'Calcium (Ca)'
    default_nutrients = [
        "Vitamin A", "Ascorbic acids (C)", "Vitamin D", "Vitamin E", "Vitamin K",
        "Thiamine (B1)", "Riboflavin (B2)", "Niacin (B3)", "Total B6", "Folate (total)",
        "Pantothenic acid (B5)", "Biotin (B7)",
        "Calcium (Ca)", "Iron (Fe)", "Magnesium (Mg)", "Phosphorus (P)", "Zinc (Zn)",
        "Copper (Cu)", "Selenium (Se)", "Manganese (Mn)", "Chromium (Cr)",
        "Molybdenum (Mo)", "Potassium (K)", "Cis ω-6 Fatty acids",
        "Cis ω-3 Fatty acids"
    ]
    
    from rag_engine.food_engine import KhadokGraphRAG
    rag = KhadokGraphRAG()
    driver = rag.get_neo4j_driver()
    
    query = f"""
    MATCH (n:Nutrient)
    WHERE n.name IN $default_nutrients OR EXISTS {{
        MATCH (d:Disease)-[:REQUIRES]->(n)
        WHERE d.name IN $conditions
    }}
    RETURN DISTINCT n.name AS name, n.`{rda_key}` AS rda_val
    """
    
    nutrients_targets = []
    try:
        with driver.session() as session:
            records = session.run(query, default_nutrients=default_nutrients, conditions=conditions)
            for record in records:
                nutrients_targets.append({
                    "name": record["name"],
                    "target": record["rda_val"] or 0.0
                })
    except Exception as e:
        print(f"Error querying Neo4j for nutrient targets: {e}")
        return []

    # Helper for units and scaling standard_rda_mg
    def get_nutrient_unit_and_val(name: str, db_val_mg: float):
        name_lower = name.lower()
        # mcg-scale nutrients (stored in mg in the graph, but displayed in mcg)
        if any(u in name_lower for u in [
            "vitamin a", "vitamin d", "vitamin k", "folate", "vitamin b12",
            "copper", "selenium", "iodine", "chromium", "molybdenum", "biotin",
            "ascorbic"  # vitc is stored in mg already, keep mg — handled below
        ]):
            # Special case: Ascorbic acids (Vitamin C) is in mg, not mcg
            if "ascorbic" in name_lower:
                return "mg", db_val_mg
            return "mcg", db_val_mg * 1000.0
        elif any(u in name_lower for u in ["potassium", "chloride", "carbohydrate", "fiber", "protein", "fatty acids", "fatty"]):
            return "g", db_val_mg / 1000.0
        else:
            return "mg", db_val_mg

    # 4. Fetch actual logged foods for this date from the database (MealTracking log)
    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    logs = await prisma.mealtracking.find_many(
        where={
            "userId": user_id,
            "loggedAt": {
                "gte": start_of_day,
                "lt": end_of_day
            }
        }
    )

    food_inputs = []
    for log in logs:
        items = safe_list(from_json_string(log.parsedItems)) if log.parsedItems else []
        for item in items:
            name = item.get("name") or ""
            amount_g = item.get("amount_g")
            if amount_g is None:
                amount_g = 100.0
            try:
                amount_g = float(amount_g)
            except Exception:
                amount_g = 100.0
                
            food_inputs.append({
                "code": item.get("code") or "",
                "name_en": name,
                "name_bn": name,
                "amount_g": amount_g
            })

    # 5. Query Neo4j to find nutrient values per 100g via CONTAINS_NUTRIENT relationships.
    #    This works with the new migrate_to_graph.py BD dataset pipeline.
    #    Foods are matched by code (preferred), name_en, name_bn, or legacy 'name' property.
    food_nutrients = {}
    if food_inputs:
        TRACKED_NUTRIENTS = [
            "Vitamin A", "Ascorbic acids (C)", "Vitamin D", "Vitamin E", "Vitamin K",
            "Thiamine (B1)", "Riboflavin (B2)", "Niacin (B3)", "Total B6", "Folate (total)",
            "Pantothenic acid (B5)", "Biotin (B7)",
            "Calcium (Ca)", "Iron (Fe)", "Magnesium (Mg)", "Phosphorus (P)", "Zinc (Zn)",
            "Copper (Cu)", "Selenium (Se)", "Manganese (Mn)", "Chromium (Cr)",
            "Molybdenum (Mo)", "Potassium (K)", "Cis ω-6 Fatty acids",
            "Cis ω-3 Fatty acids",
            # Graph-specific nutrient name aliases
            "Folates (B9)", "α-Tocopherol equivalent (E)"
        ]
        food_query = """
        UNWIND $food_inputs AS input
        MATCH (f:Food)
        WHERE (input.code <> '' AND f.code = input.code)
           OR (input.name_en <> '' AND toLower(f.name_en) = toLower(input.name_en))
           OR (input.name_bn <> '' AND toLower(f.name_bn) = toLower(input.name_bn))
           OR (input.name_en <> '' AND f.name IS NOT NULL AND toLower(f.name) = toLower(input.name_en))
        OPTIONAL MATCH (f)-[r:CONTAINS_NUTRIENT]->(n:Nutrient)
        WHERE n.name IN $tracked_nutrients
        RETURN f.code AS code,
               f.name_en AS name_en,
               coalesce(f.name_en, f.name) AS display_name,
               n.name AS nutrient_name,
               r.amount_mg AS amount_mg
        """
        try:
            with driver.session() as session:
                records = session.run(food_query, food_inputs=food_inputs, tracked_nutrients=TRACKED_NUTRIENTS)
                for record in records:
                    food_code = record["code"] or ""
                    food_name = (record["display_name"] or record["name_en"] or "").lower()
                    key = food_code if food_code else food_name
                    if not key:
                        continue
                    if key not in food_nutrients:
                        food_nutrients[key] = {}
                    nutrient_name = record["nutrient_name"]
                    # Map graph aliases back to RDA-defined standard names
                    if nutrient_name == "Folates (B9)":
                        nutrient_name = "Folate (total)"
                    elif nutrient_name == "α-Tocopherol equivalent (E)":
                        nutrient_name = "Vitamin E"
                    
                    amount = record["amount_mg"]
                    if nutrient_name and amount is not None:
                        # Vitamin A in the graph is in mg (per 100g as per the dataset scale)
                        # It will be converted to mcg display units in get_nutrient_unit_and_val
                        food_nutrients[key][nutrient_name] = float(amount)
        except Exception as e:
            print(f"Error querying food nutrients via CONTAINS_NUTRIENT: {e}")

    # 6. Calculate total consumed nutrients
    totals = {}
    for fi in food_inputs:
        key_code = fi["code"] or ""
        key_name = fi["name_en"].lower()
        amount_g = fi["amount_g"]
        
        nut_profile = food_nutrients.get(key_code) or food_nutrients.get(key_name) or {}
        for nut_name, val_per_100g in nut_profile.items():
            totals[nut_name] = totals.get(nut_name, 0.0) + (val_per_100g * amount_g / 100.0)

    # 7. Map nutrients to final response schema with Bengali translations
    NUTRIENT_NAMES_BN = {
        "Calcium (Ca)": "ক্যালসিয়াম (Calcium)",
        "Iron (Fe)": "আয়রন (Iron)",
        "Magnesium (Mg)": "ম্যাগনেসিয়াম (Magnesium)",
        "Phosphorus (P)": "ফসফরাস (Phosphorus)",
        "Copper (Cu)": "কপার (Copper)",
        "Selenium (Se)": "সিলেনিয়াম (Selenium)",
        "Manganese (Mn)": "ম্যাঙ্গানিজ (Manganese)",
        "Chromium (Cr)": "ক্রোমিয়াম (Chromium)",
        "Molybdenum (Mo)": "মলিবডেনাম (Molybdenum)",
        "Potassium (K)": "পটাশিয়াম (Potassium)",
        "Vitamin A": "ভিটামিন এ (Vitamin A)",
        "Ascorbic acids (C)": "ভিটামিন সি (Vitamin C)",
        "Vitamin D": "ভিটামিন ডি (Vitamin D)",
        "Vitamin E": "ভিটামিন ই (Vitamin E)",
        "Vitamin K": "ভিটামিন কে (Vitamin K)",
        "Thiamine (B1)": "থায়ামিন (Vitamin B1)",
        "Riboflavin (B2)": "রিবোফ্লাভিন (Vitamin B2)",
        "Niacin (B3)": "নিয়াসিন (Vitamin B3)",
        "Total B6": "ভিটামিন বি৬ (Vitamin B6)",
        "Folate (total)": "ফোলেট (Folate)",
        "Pantothenic acid (B5)": "প্যান্টোথেনিক অ্যাসিড (B5)",
        "Biotin (B7)": "বায়োটিন (Vitamin B7)",
        "Zinc (Zn)": "জিঙ্ক (Zinc)",
        "Cis ω-6 Fatty acids": "ওমেগা-৬ ফ্যাটি অ্যাসিড",
        "Cis ω-3 Fatty acids": "ওমেগা-৩ ফ্যাটি অ্যাসিড",
    }

    result_list = []
    for nt in nutrients_targets:
        name = nt["name"]
        # Filter out macronutrients and minerals we don't display
        if name.lower() in [
            "carbohydrate", "protein", "total fat", "dietary fiber", "moisture",
            "fat", "water",
            "available cho",  # CHO = carbohydrate
            "chloride (cl)", "choline", "vitamin b12", "energy", "vitamin b", "chloride", "vitamin b12 (cobalamin)", "iodine (i)", "iodine",
            "food code", "food name", "scientific name", "food group", "tags",
            "essential quantity minerals", "vitamins", "ash"
        ]:
            continue
            
        target_db_mg = nt["target"]
        
        unit, target_val = get_nutrient_unit_and_val(name, target_db_mg)
        
        consumed_mg = totals.get(name, 0.0)
        _, consumed_val = get_nutrient_unit_and_val(name, consumed_mg)
        
        percentage = min(100, int((consumed_val / target_val) * 100)) if target_val > 0 else 0
        
        result_list.append({
            "name": name,
            "name_bn": NUTRIENT_NAMES_BN.get(name, name),
            "target": round(target_val, 2),
            "consumed": round(consumed_val, 2),
            "unit": unit,
            "percentage": percentage
        })

    return result_list


async def _plan_to_response(plan) -> MealPlanResponse:
    plan_data = safe_dict(plan.planData)
    # Ensure emojis are clean and populated (handles legacy or modified items)
    plan_data = _ensure_item_emojis(plan_data)
    completed_slots = safe_list(from_json_string(plan.completedSlots)) if plan.completedSlots else []
    try:
        plan_data["micronutrient_targets"] = await _get_micronutrient_details(plan_data, plan.userId, completed_slots, plan.planDate)
    except Exception as e:
        print(f"Error calculating micronutrient targets: {e}")
        plan_data["micronutrient_targets"] = []

    return MealPlanResponse(
        plan_id=plan.planId,
        user_id=plan.userId,
        plan_date=plan.planDate,
        plan_type=plan.planType,
        plan_data=plan_data,
        calorie_target=plan.calorieTarget,
        ai_suggestion_cal=plan.aiSuggestionCal,
        user_choice_cal=plan.userChoiceCal,
        language=plan.language,
        feedback=plan.feedback,
        completed_slots=safe_list(from_json_string(plan.completedSlots)) if plan.completedSlots else [],
        created_at=plan.createdAt,
    )


@router.get("/daily", response_model=MealPlanResponse)
async def get_daily_plan(language: str = "bn", force: bool = False, offset: int = 0, current_user=Depends(get_current_user)):
    """Generate AI meal plan for today or future day."""
    target_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=offset)

    if not force:
        existing = await prisma.mealplan.find_first(
            where={
                "userId": current_user.id,
                "planType": "daily",
                "planDate": {"gte": target_date, "lt": target_date + timedelta(days=1)},
            }
        )
        if existing:
            return await _plan_to_response(existing)
            
    if force:
        await prisma.mealplan.delete_many(
            where={
                "userId": current_user.id,
                "planType": "daily",
                "planDate": {"gte": target_date, "lt": target_date + timedelta(days=1)},
            }
        )

    try:
        plan_data = await generate_daily_meal_plan(current_user.id, language=language)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    plan = await save_meal_plan(current_user.id, "daily", plan_data, language, target_date)
    return await _plan_to_response(plan)


@router.get("/weekly", response_model=List[MealPlanResponse])
async def get_weekly_plan(language: str = "bn", force: bool = False, current_user=Depends(get_current_user)):
    """Generate a 7-day meal plan with variety enforcement."""
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = today + timedelta(days=7)
    
    if not force:
        existing = await prisma.mealplan.find_many(
            where={
                "userId": current_user.id,
                "planType": "daily",
                "planDate": {"gte": today, "lt": week_end},
            },
            order={"planDate": "asc"},
        )
        if len(existing) == 7:
            return await asyncio.gather(*[_plan_to_response(p) for p in existing])

    try:
        weekly_data = await generate_weekly_meal_plan(current_user.id, language=language)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    saved = []
    for i, day_plan in enumerate(weekly_data):
        day = today + timedelta(days=i)
        ai_cal = sum(
            item.get("calories", 0)
            for m in day_plan.get("meals", [])
            for item in m.get("items", [])
        )

        await prisma.mealplan.delete_many(
            where={
                "userId": current_user.id,
                "planType": "daily",
                "planDate": {"gte": day, "lt": day + timedelta(days=1)},
            }
        )
        plan = await prisma.mealplan.create(
            data={
                "userId": current_user.id,
                "planDate": day,
                "planType": "daily",
                "planData": to_json_string(day_plan),
                "calorieTarget": day_plan.get("target_calories", 2000),
                "aiSuggestionCal": ai_cal,
                "language": language,
            }
        )
        saved.append(await _plan_to_response(plan))

    return saved


@router.get("/history", response_model=List[MealPlanResponse])
async def get_plan_history(limit: int = 30, current_user=Depends(get_current_user)):
    """Get past meal plans."""
    plans = await prisma.mealplan.find_many(
        where={"userId": current_user.id},
        order={"planDate": "desc"},
        take=limit,
    )
    return await asyncio.gather(*[_plan_to_response(plan) for plan in plans])


@router.post("/{plan_id}/feedback")
async def submit_feedback(plan_id: str, req: MealPlanFeedbackRequest, current_user=Depends(get_current_user)):
    """Rate a meal plan 1–5."""
    plan = await prisma.mealplan.find_unique(where={"planId": plan_id})
    if not plan or plan.userId != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    updated = await prisma.mealplan.update(
        where={"planId": plan_id},
        data={"feedback": req.feedback},
    )
    return {"message": "Feedback submitted", "feedback": updated.feedback}


@router.patch("/{plan_id}/mark-complete", response_model=MealPlanResponse)
async def mark_slot_complete(plan_id: str, req: MarkSlotCompleteRequest, current_user=Depends(get_current_user)):
    """Mark a planned meal slot as eaten."""
    plan = await prisma.mealplan.find_unique(where={"planId": plan_id})
    if not plan or plan.userId != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    completed_slots = safe_list(from_json_string(plan.completedSlots)) if plan.completedSlots else []
    
    if req.completed and req.slot not in completed_slots:
        completed_slots.append(req.slot)
    elif not req.completed and req.slot in completed_slots:
        completed_slots.remove(req.slot)

    updated = await prisma.mealplan.update(
        where={"planId": plan_id},
        data={"completedSlots": to_json_string(completed_slots)},
    )
    
    return await _plan_to_response(updated)


@router.patch("/{plan_id}/edit", response_model=MealPlanResponse)
async def edit_meal_plan(plan_id: str, req: EditMealPlanRequest, current_user=Depends(get_current_user)):
    """Edit a meal plan's items and update user choice calories."""
    plan = await prisma.mealplan.find_unique(where={"planId": plan_id})
    if not plan or plan.userId != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")

    updated = await prisma.mealplan.update(
        where={"planId": plan_id},
        data={
            "planData": to_json_string(req.plan_data),
            "userChoiceCal": req.user_choice_cal,
        },
    )
    return await _plan_to_response(updated)
