"""Nutrition report routes."""

import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from app.dependencies import get_current_user
from app.db import prisma
from app.schemas import NutritionReportResponse, ConditionsReportResponse, SendEmailReportRequest, SendEmailReportResponse
from app.utils import safe_list
from app.core.llm_client import llm_client
from rag_engine import calculate_targets, NDG_DIETARY_RULES

router = APIRouter()


# ─── Legacy endpoints ──────────────────────────────────────────────────────────

@router.get("/nutrition")
async def get_nutrition_report(current_user=Depends(get_current_user)):
    profile = await prisma.profile.find_unique(where={"userId": current_user.id})
    if not profile:
        return {"error": "Profile not found"}
    latest_log = await prisma.healthlog.find_first(
        where={"userId": current_user.id}, order={"logDate": "desc"}
    )
    current_weight = profile.weightKg or 70
    if latest_log and latest_log.weightKg:
        current_weight = latest_log.weightKg
    targets = calculate_targets({
        "gender": profile.gender or "male",
        "height_cm": profile.heightCm or 170,
        "weight_kg": current_weight,
        "activity_level": profile.activityLevel or "sedentary",
        "age": profile.age,
        "goal": profile.goal,
    })
    conditions = safe_list(profile.medicalConditions)
    applicable_rules = [r for r in NDG_DIETARY_RULES if r["condition"] in conditions]
    return {
        "user_id": current_user.id,
        "targets": targets,
        "latest_health_log": {
            "weight_kg": latest_log.weightKg if latest_log else None,
            "blood_sugar": latest_log.bloodSugar if latest_log else None,
            "blood_pressure": latest_log.bloodPressure if latest_log else None,
        },
        "applicable_rules": applicable_rules,
    }


@router.get("/conditions")
async def get_conditions_report(current_user=Depends(get_current_user)):
    profile = await prisma.profile.find_unique(where={"userId": current_user.id})
    if not profile:
        return {"conditions": [], "rules": []}
    conditions = safe_list(profile.medicalConditions)
    rules = [r for r in NDG_DIETARY_RULES if r["condition"] in conditions]
    return ConditionsReportResponse(conditions=conditions, rules=rules)


REPORT_SYSTEM_PROMPT = """You are an AI nutritionist. Write a single paragraph narrative summary of the user's weekly progress.
Return ONLY valid JSON: {"report_summary": "..."}"""


@router.post("/send-email", response_model=SendEmailReportResponse)
async def send_email_report(req: SendEmailReportRequest, current_user=Depends(get_current_user)):
    context = "User has averaged 1800kcal this week. Protein 75g. Weight stable. Goal: weight loss. Adherence: 85%."
    messages = [{"role": "system", "content": REPORT_SYSTEM_PROMPT}, {"role": "user", "content": context}]
    raw = await llm_client.chat_completion(messages=messages, temperature=0.4, max_tokens=400,
                                            response_format={"type": "json_object"})
    try:
        data = __import__('json').loads(raw)
        report_summary = data.get("report_summary", "Here is your weekly report.")
    except Exception:
        report_summary = "Here is your weekly report."
    return SendEmailReportResponse(message="Email dispatched successfully (simulated).",
                                   email=req.email, report_summary=report_summary)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _safe_json(val):
    if not val:
        return {}
    if isinstance(val, dict):
        return val
    try:
        return json.loads(val)
    except Exception:
        return {}


def _safe_json_list(val):
    if not val:
        return []
    if isinstance(val, list):
        return val
    try:
        r = json.loads(val)
        return r if isinstance(r, list) else []
    except Exception:
        return []


def _get_nutrient_unit_and_val(name: str, db_val_mg: float):
    """Mirror the unit conversion logic from meal_plan.py."""
    name_lower = name.lower()
    if any(u in name_lower for u in [
        "vitamin a", "vitamin d", "vitamin k", "folate", "vitamin b12",
        "copper", "selenium", "iodine", "chromium", "molybdenum", "biotin",
    ]):
        return "mcg", db_val_mg * 1000.0
    elif "ascorbic" in name_lower:
        return "mg", db_val_mg
    elif any(u in name_lower for u in ["potassium", "chloride", "fatty"]):
        return "g", db_val_mg / 1000.0
    else:
        return "mg", db_val_mg


# ─── Health Summary ────────────────────────────────────────────────────────────

@router.get("/health-summary")
async def get_health_summary(
    days: int = Query(7, ge=3, le=30),
    weight_kg: Optional[float] = Query(None),
    current_user=Depends(get_current_user)
):
    """
    Generate a comprehensive health summary for the past N days.
    - Calorie intake per day (ogive chart data)
    - Weight curve (from HealthLog)
    - Macro pie chart
    - Micronutrient progress bars (aggregated from Neo4j)
    """
    profile = await prisma.profile.find_unique(where={"userId": current_user.id})
    if not profile:
        return {"error": "Profile not found. Please complete your profile first."}

    # 1. Log today's weight if provided
    if weight_kg and weight_kg > 0:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        existing_log = await prisma.healthlog.find_first(
            where={"userId": current_user.id, "logDate": {"gte": today_start}}
        )
        if existing_log:
            await prisma.healthlog.update(
                where={"logId": existing_log.logId}, data={"weightKg": weight_kg}
            )
        else:
            await prisma.healthlog.create(data={
                "userId": current_user.id,
                "logDate": datetime.now(timezone.utc),
                "weightKg": weight_kg,
            })

    current_weight = weight_kg
    if not current_weight:
        latest_log = await prisma.healthlog.find_first(
            where={"userId": current_user.id},
            order={"logDate": "desc"},
        )
        current_weight = latest_log.weightKg if latest_log else profile.weightKg or 70

    targets = calculate_targets({
        "gender": profile.gender or "male",
        "height_cm": profile.heightCm or 170,
        "weight_kg": current_weight,
        "activity_level": profile.activityLevel or "sedentary",
        "age": profile.age,
        "goal": profile.goal,
    })
    target_calories = targets.get("target_calories", 2000)
    target_protein = float(targets.get("protein_g", 56))
    target_carbs = float(targets.get("carbs_g", 300))
    target_fat = float(targets.get("fat_g", 65))

    # 3. Fetch meal plans for last N days
    since_date = datetime.now(timezone.utc) - timedelta(days=days)
    plans = await prisma.mealplan.find_many(
        where={"userId": current_user.id, "planDate": {"gte": since_date}, "planType": "daily"},
        order={"planDate": "asc"},
    )

    # 4. Weight history
    weight_logs = await prisma.healthlog.find_many(
        where={"userId": current_user.id, "logDate": {"gte": since_date}, "weightKg": {"not": None}},
        order={"logDate": "asc"},
    )
    weight_history = [
        {"date": log.logDate.strftime("%d/%m"), "weight_kg": log.weightKg}
        for log in weight_logs
    ]

    # 5. Per-day calorie + macro extraction
    calorie_history = []
    all_food_items = []   # accumulate (food_code, name_en, amount_g) for Neo4j micro query

    total_protein = 0.0
    total_carbs = 0.0
    total_fat = 0.0
    total_fiber = 0.0
    days_with_data = 0
    total_cals_all = 0

    for plan in plans:
        plan_data = _safe_json(plan.planData)
        completed_slots = _safe_json_list(plan.completedSlots)
        meals = plan_data.get("meals", [])

        day_calories = 0
        day_has_data = False

        # Extract calories from completed meal items
        for meal in meals:
            slot = meal.get("slot", "")
            if slot not in completed_slots:
                continue
            for item in meal.get("items", []):
                item_cals = float(item.get("calories") or 0)
                day_calories += item_cals
                day_has_data = True
                # Collect food items for later Neo4j micronutrient query
                code = item.get("food_code") or item.get("code") or ""
                name_en = item.get("name_en") or ""
                amount_g = float(item.get("amount_g") or 100)
                if code or name_en:
                    all_food_items.append({
                        "code": code, "name_en": name_en,
                        "name_bn": item.get("name_bn") or "", "amount_g": amount_g
                    })

        # Plan-level macros, weighted by slot completion ratio
        plan_macros = plan_data.get("macros", {})
        if plan_macros and completed_slots:
            total_slots = max(len(meals), 1)
            ratio = len(completed_slots) / total_slots
            total_protein += float(plan_macros.get("protein_g") or 0) * ratio
            total_carbs += float(plan_macros.get("carbs_g") or 0) * ratio
            total_fat += float(plan_macros.get("fat_g") or 0) * ratio
            total_fiber += float(plan_macros.get("fiber_g") or 0) * ratio

        if day_has_data:
            days_with_data += 1
            total_cals_all += day_calories

        calorie_history.append({
            "date": plan.planDate.strftime("%d/%m"),
            "calories_consumed": round(day_calories),
            "calories_planned": round(plan_data.get("total_calories") or target_calories),
            "calories_target": target_calories,
            "completed_slots": len(completed_slots),
            "total_slots": len(meals),
        })

    avg_calories = round(total_cals_all / days_with_data) if days_with_data > 0 else 0
    adherence_pct = round((days_with_data / days) * 100) if days > 0 else 0

    # 6. Micronutrient aggregation via Neo4j
    TRACKED_NUTRIENTS = [
        "Vitamin A", "Ascorbic acids (C)", "Vitamin D", "Vitamin E", "Vitamin K",
        "Thiamine (B1)", "Riboflavin (B2)", "Niacin (B3)", "Total B6", "Folate (total)",
        "Vitamin B12", "Pantothenic acid (B5)", "Biotin (B7)", "Choline",
        "Calcium (Ca)", "Iron (Fe)", "Magnesium (Mg)", "Phosphorus (P)", "Zinc (Zn)",
        "Sodium (Na)", "Copper (Cu)", "Selenium (Se)", "Iodine (I)", "Manganese (Mn)", "Chromium (Cr)",
        "Molybdenum (Mo)", "Chloride (Cl)", "Potassium (K)",
        "Cis ω-6 Fatty acids", "Cis ω-3 Fatty acids",
    ]

    NUTRIENT_NAMES_BN = {
        "Calcium (Ca)": "ক্যালসিয়াম (Calcium)", "Iron (Fe)": "আয়রন (Iron)",
        "Magnesium (Mg)": "ম্যাগনেসিয়াম (Magnesium)", "Phosphorus (P)": "ফসফরাস (Phosphorus)",
        "Sodium (Na)": "সোডিয়াম (Sodium)", "Copper (Cu)": "কপার (Copper)",
        "Selenium (Se)": "সিলেনিয়াম (Selenium)",
        "Iodine (I)": "আয়োডিন (Iodine)", "Manganese (Mn)": "ম্যাঙ্গানিজ (Manganese)",
        "Chromium (Cr)": "ক্রোমিয়াম (Chromium)", "Molybdenum (Mo)": "মলিবডেনাম (Molybdenum)",
        "Chloride (Cl)": "ক্লোরাইড (Chloride)", "Potassium (K)": "পটাশিয়াম (Potassium)",
        "Vitamin A": "ভিটামিন এ (Vitamin A)", "Ascorbic acids (C)": "ভিটামিন সি (Vitamin C)",
        "Vitamin D": "ভিটামিন ডি (Vitamin D)", "Vitamin E": "ভিটামিন ই (Vitamin E)",
        "Vitamin K": "ভিটামিন কে (Vitamin K)", "Thiamine (B1)": "থায়ামিন (Vitamin B1)",
        "Riboflavin (B2)": "রিবোফ্লাভিন (Vitamin B2)", "Niacin (B3)": "নিয়াসিন (Vitamin B3)",
        "Total B6": "ভিটামিন বি৬ (Vitamin B6)", "Folate (total)": "ফোলেট (Folate)",
        "Vitamin B12": "ভিটামিন বি১২ (Vitamin B12)", "Pantothenic acid (B5)": "প্যান্টোথেনিক অ্যাসিড (B5)",
        "Biotin (B7)": "বায়োটিন (Vitamin B7)", "Choline": "কোলিন (Choline)",
        "Zinc (Zn)": "জিঙ্ক (Zinc)", "Cis ω-6 Fatty acids": "ওমেগা-৬ ফ্যাটি অ্যাসিড",
        "Cis ω-3 Fatty acids": "ওমেগা-৩ ফ্যাটি অ্যাসিড",
    }

    micro_totals = {}
    micro_targets_map = {}

    if all_food_items:
        try:
            from rag_engine.food_engine import KhadokGraphRAG
            rag = KhadokGraphRAG()
            driver = rag.get_neo4j_driver()

            # Batch query all nutrients for all food items
            food_query = """
            UNWIND $food_inputs AS input
            MATCH (f:Food)
            WHERE (input.code <> '' AND f.code = input.code)
               OR (input.name_en <> '' AND toLower(f.name_en) = toLower(input.name_en))
            OPTIONAL MATCH (f)-[r:CONTAINS_NUTRIENT]->(n:Nutrient)
            WHERE n.name IN $tracked
            RETURN input.code AS in_code, input.name_en AS in_name_en,
                   input.amount_g AS amount_g,
                   n.name AS nutrient_name, r.amount_mg AS amount_mg
            """
            with driver.session() as session:
                records = session.run(food_query, food_inputs=all_food_items, tracked=TRACKED_NUTRIENTS)
                for rec in records:
                    nut_name = rec["nutrient_name"]
                    amount_per_100g = rec["amount_mg"]
                    amount_g = rec["amount_g"] or 100
                    if nut_name and amount_per_100g is not None:
                        contributed = float(amount_per_100g) * float(amount_g) / 100.0
                        micro_totals[nut_name] = micro_totals.get(nut_name, 0.0) + contributed

            # Get RDA targets from Nutrient nodes
            gender_key = (profile.gender or "male").lower()
            age = profile.age or 30
            if age < 19:
                age_key = "14_18"
            elif age <= 30:
                age_key = "19_30"
            elif age <= 50:
                age_key = "31_50"
            elif age <= 70:
                age_key = "51_70"
            else:
                age_key = "gt_70"
            rda_property = f"rda_{gender_key}_{age_key}_mg"

            with driver.session() as session:
                records = session.run(
                    "MATCH (n:Nutrient) WHERE n.name IN $tracked RETURN n.name AS name, n[$rda_prop] AS rda",
                    tracked=TRACKED_NUTRIENTS, rda_prop=rda_property
                )
                for rec in records:
                    if rec["rda"] is not None:
                        micro_targets_map[rec["name"]] = float(rec["rda"])

        except Exception as e:
            print(f"Neo4j micronutrient aggregation error: {e}")

    # Build micronutrient result list
    micronutrient_targets = []
    for nut_name in TRACKED_NUTRIENTS:
        target_mg = micro_targets_map.get(nut_name)
        if not target_mg:
            continue
        # Scale RDA by days (period total requirement)
        period_target_mg = target_mg * days
        consumed_mg = micro_totals.get(nut_name, 0.0)

        unit, target_val = _get_nutrient_unit_and_val(nut_name, period_target_mg)
        _, consumed_val = _get_nutrient_unit_and_val(nut_name, consumed_mg)
        percentage = min(100, int((consumed_val / target_val) * 100)) if target_val > 0 else 0

        micronutrient_targets.append({
            "name": nut_name,
            "name_bn": NUTRIENT_NAMES_BN.get(nut_name, nut_name),
            "target": round(target_val, 2),
            "consumed": round(consumed_val, 2),
            "unit": unit,
            "percentage": percentage,
        })

    # 7. Pie chart
    total_macro_cals = (total_protein * 4) + (total_carbs * 4) + (total_fat * 9)
    if total_macro_cals > 0:
        pie_data = [
            {"name": "প্রোটিন", "name_en": "Protein",
             "value": round((total_protein * 4 / total_macro_cals) * 100, 1),
             "grams": round(total_protein, 1), "color": "#f59e0b"},
            {"name": "শর্করা", "name_en": "Carbs",
             "value": round((total_carbs * 4 / total_macro_cals) * 100, 1),
             "grams": round(total_carbs, 1), "color": "#ef4444"},
            {"name": "চর্বি", "name_en": "Fat",
             "value": round((total_fat * 9 / total_macro_cals) * 100, 1),
             "grams": round(total_fat, 1), "color": "#3b82f6"},
        ]
    else:
        pie_data = []

    # ─── Clinical Insights Engine ─────────────────────────────────────────────
    import os
    import csv
    clinical_insights = []
    conditions = safe_list(profile.medicalConditions)

    # Load disease nutrients CSV mapping
    disease_map = {}
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        csv_path = os.path.join(base_dir, "data", "disease_nutrients.csv")
        if os.path.exists(csv_path):
            with open(csv_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    disease_map[row["Disease"].lower()] = {
                        "recommended": row["Recommended_Nutrients"],
                        "notes": row["Notes"],
                        "references": row["References"]
                    }
    except Exception as ex:
        print(f"Error loading disease CSV: {ex}")

    daily_protein_consumed = total_protein / days if days > 0 else 0
    daily_carbs_consumed = total_carbs / days if days > 0 else 0
    daily_fiber_consumed = total_fiber / days if days > 0 else 0
    micro_averages = {m["name"].lower(): m for m in micronutrient_targets}

    # Nutrient resolution map
    NUTRIENT_RESOLVER = {
        "protein": ("macro", "protein_g", "প্রোটিন", "g"),
        "carbohydrates": ("macro", "carbs_g", "শর্করা", "g"),
        "carbs": ("macro", "carbs_g", "শর্করা", "g"),
        "fiber": ("macro", "fiber_g", "আঁশ", "g"),
        "calcium": ("micro", "Calcium (Ca)", "ক্যালসিয়াম", "mg"),
        "iron": ("micro", "Iron (Fe)", "আয়রন", "mg"),
        "zinc": ("micro", "Zinc (Zn)", "জিঙ্ক", "mg"),
        "sodium": ("micro", "Sodium (Na)", "সোডিয়াম", "mg"),
        "potassium": ("micro", "Potassium (K)", "পটাসিয়াম", "mg"),
        "vitamin c": ("micro", "Ascorbic acids (C)", "ভিটামিন সি", "mg"),
        "vitamin a": ("micro", "Vitamin A", "ভিটামিন এ", "mcg"),
        "vitamin d": ("micro", "Vitamin D", "ভিটামিন ডি", "mcg"),
        "vitamin b12": ("micro", "Vitamin B12", "ভিটামিন বি১২", "mcg"),
        "iodine": ("micro", "Iodine (I)", "আয়োডিন", "mcg"),
    }

    # 1. Direct Aggregation Comparison Engine
    for cond in conditions:
        cond_lower = cond.lower().strip()
        if cond_lower in disease_map:
            match = disease_map[cond_lower]
            rec_nutrients_str = match["recommended"]
            notes_str = match["notes"]
            ref_str = match["references"]
            
            # Split and clean the list of recommended nutrients
            rec_list = [r.strip().lower() for r in rec_nutrients_str.split(",") if r.strip()]
            
            for rec_item in rec_list:
                resolved_key = None
                for key in NUTRIENT_RESOLVER:
                    if key in rec_item:
                        resolved_key = key
                        break
                        
                if not resolved_key:
                    continue
                    
                nut_type, backend_key, label_bn, unit = NUTRIENT_RESOLVER[resolved_key]
                
                consumed_val = 0.0
                target_val = 0.0
                pct = 100
                
                if nut_type == "macro":
                    if backend_key == "protein_g":
                        consumed_val = daily_protein_consumed
                        target_val = target_protein
                    elif backend_key == "carbs_g":
                        consumed_val = daily_carbs_consumed
                        target_val = target_carbs
                    elif backend_key == "fiber_g":
                        consumed_val = daily_fiber_consumed
                        target_val = 25.0
                        
                    pct = int((consumed_val / target_val) * 100) if target_val > 0 else 100
                else:
                    micro_item = micro_averages.get(backend_key.lower())
                    if micro_item:
                        consumed_val = micro_item["consumed"] / days if days > 0 else 0
                        target_val = micro_item["target"] / days if days > 0 else 0
                        pct = micro_item["percentage"]
                    else:
                        continue
                        
                # Perform direct clinical comparisons
                if resolved_key != "sodium" and pct < 75:
                    clinical_insights.append({
                        "type": "warning",
                        "title": f"{cond} ও {label_bn} ঘাটতি সতর্কতা",
                        "message": f"আপনার {cond} ব্যবস্থাপনায় {label_bn} প্রয়োজনীয়। কিন্তু আপনার {days} দিনের গড় গ্রহণ ছিল মাত্র {round(consumed_val, 1)}{unit} (যা চাহিদা {round(target_val, 1)}{unit} এর তুলনায় মাত্র {pct}%)। ডায়েট ডাটাবেজ নির্দেশিকা: {notes_str}",
                        "disease": cond,
                        "reference": ref_str
                    })
                elif resolved_key == "sodium" and pct > 115:
                    clinical_insights.append({
                        "type": "error",
                        "title": f"অতিরিক্ত সোডিয়াম ও {cond} ঝুঁকি",
                        "message": f"আপনার {cond} ব্যবস্থাপনায় সোডিয়াম (লবণ) নিয়ন্ত্রণ আবশ্যক। কিন্তু আপনার গড় সোডিয়াম গ্রহণ {round(consumed_val * days, 1)}mg (সর্বোচ্চ দৈনিক নিরাপদ সীমা ২০০০mg এর চেয়ে {pct}% বেশি)। নির্দেশিকা: {notes_str}",
                        "disease": cond,
                        "reference": ref_str
                    })

    # 2. General Fallbacks for crucial nutrients if not covered by conditions
    # Fiber fallback
    if not any(ins["disease"].lower() == "constipation" for ins in clinical_insights) and daily_fiber_consumed < 16:
        clinical_insights.append({
            "type": "warning",
            "title": "ফাইবার (আঁশ) ঘাটতি সতর্কতা",
            "message": f"আপনার দৈনিক গড় ফাইবার গ্রহণ ছিল মাত্র {round(daily_fiber_consumed, 1)}g (জাতীয় পুষ্টি লক্ষ্যমাত্রা ২৫-৩০g)। আঁশযুক্ত খাবারের ঘাটতি হজম প্রক্রিয়া ধীর করতে পারে।",
            "disease": "Constipation",
            "reference": "Bangladesh National Dietary Guidelines"
        })

    # Calcium fallback
    cal_micro = micro_averages.get("calcium (ca)")
    if cal_micro and not any(ins["disease"].lower() == "osteoporosis" for ins in clinical_insights) and cal_micro["percentage"] < 70:
        clinical_insights.append({
            "type": "warning",
            "title": "ক্যালসিয়াম ঘাটতি সতর্কতা",
            "message": f"আপনার ক্যালসিয়াম গ্রহণ প্রয়োজনীয় লক্ষ্যমাত্রার তুলনায় কম (মাত্র {cal_micro['percentage']}% পূরণ হয়েছে)। দীর্ঘস্থায়ী ক্যালসিয়ামের ঘাটতি হাড় ও দাঁতের ক্ষয় ঝুঁকি বাড়িয়ে দেয়।",
            "disease": "Osteoporosis",
            "reference": "WHO Osteoporosis Guidelines"
        })

    # Iron fallback
    ir_micro = micro_averages.get("iron (fe)")
    if ir_micro and not any(ins["disease"].lower() == "anemia" for ins in clinical_insights) and ir_micro["percentage"] < 70:
        clinical_insights.append({
            "type": "warning",
            "title": "আয়রণ ঘাটতি সতর্কতা",
            "message": f"আপনার দৈনিক গড় আয়রন পূরণ হচ্ছে মাত্র {ir_micro['percentage']}%। শরীরে হিমোগ্লোবিন ও অক্সিজেন প্রবাহ সচল রাখতে লাল চালের ভাত, কলিজা বা কচু শাক খাদ্যতালিকায় বাড়ান।",
            "disease": "Anemia",
            "reference": "WHO Anemia Guidelines"
        })

    return {
        "period_days": days,
        "days_with_data": days_with_data,
        "adherence_pct": adherence_pct,
        "avg_daily_calories": avg_calories,
        "target_calories": target_calories,
        "targets": targets,
        "calorie_history": calorie_history,
        "weight_history": weight_history,
        "macro_summary": {
            "protein_g": round(total_protein, 1),
            "carbs_g": round(total_carbs, 1),
            "fat_g": round(total_fat, 1),
            "fiber_g": round(total_fiber, 1),
            "target_protein_g": round(target_protein * days, 1),
            "target_carbs_g": round(target_carbs * days, 1),
            "target_fat_g": round(target_fat * days, 1),
        },
        "pie_data": pie_data,
        "micronutrient_targets": micronutrient_targets,
        "current_weight_kg": current_weight,
        "clinical_insights": clinical_insights,
    }
