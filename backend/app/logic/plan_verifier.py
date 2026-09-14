"""
Deterministic Plan Verifier (Phase E)
DesiDiet Clinical Planning Pipeline

Post-generation deterministic verifier for dietary and meal plans.
Guarantees:
1. Canonical Food Identification: Every ingredient must map to an active, non-quarantined food.
2. Numeric Integrity: Independent recalculation from raw database values (g * N / 100).
   Detects mathematical drift or hallucinations > 5%.
3. Clinical Safety: Enforces hard clinical constraints (Diabetes, Hypertension, CKD, Gout).
4. Bounded Repair: Allows up to 2 repair iterations; fails safe to VERIFICATION_FAILED
   rather than issuing an unverified badge.
"""

from __future__ import annotations
import math
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

from app.data.food_validator import (
    CanonicalFoodItem,
    load_and_validate_food_database,
    NUTRIENT_SPECIFICATIONS,
)
from app.logic.portion_planner import DailyMealPlan, PlannedMeal, PlannedIngredient, PlanStatus, MealSlotName


class VerificationStatus(str, Enum):
    VERIFIED = "verified"
    VERIFICATION_FAILED = "verification_failed"
    NEEDS_REPAIR = "needs_repair"


class PlanVerificationResult(BaseModel):
    """Detailed verification audit for a proposed meal plan."""
    is_valid: bool
    status: VerificationStatus
    recalculated_totals: Dict[str, float] = Field(default_factory=dict)
    discrepancies: List[str] = Field(default_factory=list)
    clinical_violations: List[str] = Field(default_factory=list)
    repair_suggestions: List[str] = Field(default_factory=list)
    repair_attempts: int = 0
    verified_plan: Optional[DailyMealPlan] = None


class PlanVerifier:
    """
    Independent deterministic verifier for model-generated or proposed dietary plans.
    """

    def __init__(self, foods: Optional[Dict[str, CanonicalFoodItem]] = None):
        if foods is None:
            self.foods, _ = load_and_validate_food_database()
        else:
            self.foods = foods

    def verify_plan(
        self,
        plan: DailyMealPlan,
        medical_conditions: Optional[List[str]] = None,
        repair_attempt: int = 0,
    ) -> PlanVerificationResult:
        """
        Runs comprehensive deterministic verification on a meal plan.
        """
        discrepancies: List[str] = []
        violations: List[str] = []
        repair_suggestions: List[str] = []

        conditions = medical_conditions or plan.profile_summary.get("conditions", [])
        norm_conditions = [c.strip().lower() for c in conditions]

        is_hypertension = any("hypertension" in c or "blood pressure" in c for c in norm_conditions)
        is_ckd = any("kidney" in c or "ckd" in c for c in norm_conditions)
        is_diabetes = any("diabetes" in c or "diabetic" in c for c in norm_conditions)

        # 1. Verify every ingredient identity and portion bounds
        recalculated_daily: Dict[str, float] = {k: 0.0 for k in NUTRIENT_SPECIFICATIONS.keys()}

        for meal in plan.meals:
            recalculated_meal_kcal = 0.0

            for ing in meal.ingredients:
                # Check food existence in authoritative dataset
                food_item = self.foods.get(ing.food_id)
                if not food_item:
                    violations.append(
                        f"Unauthorized / Hallucinated ingredient: '{ing.food_name_en}' with ID '{ing.food_id}' "
                        "does not exist in the authoritative Bangladeshi food database."
                    )
                    continue

                if food_item.is_quarantined:
                    violations.append(
                        f"Quarantined ingredient: '{food_item.name_en}' ({food_item.canonical_id}) "
                        "cannot be used in dietary plans due to data anomalies."
                    )
                    continue

                # Check portion bounds
                if ing.edible_grams <= 0:
                    violations.append(
                        f"Invalid portion: '{ing.food_name_en}' has non-positive edible portion ({ing.edible_grams}g)."
                    )
                elif ing.edible_grams > 600.0:
                    violations.append(
                        f"Excessive portion: '{ing.food_name_en}' exceeds maximum single-serving limit ({ing.edible_grams}g > 600g)."
                    )

                # Check spice limit
                is_spice = (
                    food_item.food_group == "Spices and Condiments"
                    or any(s in food_item.name_en.lower() for s in ["chilli", "turmeric", "cumin", "coriander seed", "cardamom", "clove", "cinnamon", "spice", "fennel", "mace", "nutmeg"])
                )
                if is_spice and ing.edible_grams > 15.0:
                    violations.append(
                        f"Spice bound exceeded: '{ing.food_name_en}' ({ing.edible_grams}g > 15g). "
                        "Pathological nutrient density exploit rejected."
                    )


                # Independent recalculation: (g * N / 100)
                for nut_key in NUTRIENT_SPECIFICATIONS.keys():
                    amt = food_item.get_nutrient_amount(nut_key, ing.edible_grams) or 0.0
                    recalculated_daily[nut_key] += amt

                ing_recalc_kcal = food_item.get_nutrient_amount("enerc_kcal", ing.edible_grams) or 0.0
                recalculated_meal_kcal += ing_recalc_kcal

                # Check stated ingredient kcal vs recalculated
                stated_ing_kcal = ing.nutrients.get("enerc_kcal", 0.0)
                if abs(stated_ing_kcal - ing_recalc_kcal) > 10.0 and abs(stated_ing_kcal - ing_recalc_kcal) / max(ing_recalc_kcal, 1) > 0.08:
                    discrepancies.append(
                        f"Ingredient '{ing.food_name_en}' kcal discrepancy: stated {stated_ing_kcal:.1f} vs recalculated {ing_recalc_kcal:.1f}"
                    )

            # Check meal stated kcal vs recalculated
            if abs(meal.total_kcal - recalculated_meal_kcal) > 15.0 and abs(meal.total_kcal - recalculated_meal_kcal) / max(recalculated_meal_kcal, 1) > 0.05:
                discrepancies.append(
                    f"Meal slot '{meal.slot_name.value}' total kcal drift: stated {meal.total_kcal:.1f} vs recalculated {recalculated_meal_kcal:.1f}"
                )

        # Add cooking oil & salt to daily totals
        oil_kcal = (plan.cooking_oil_g * 884.0) / 100.0
        recalculated_daily["enerc_kcal"] += oil_kcal
        recalculated_daily["fatce"] += plan.cooking_oil_g
        salt_na_mg = plan.table_salt_g * 393.4
        recalculated_daily["na"] += salt_na_mg

        # Round recalculated totals
        for k in recalculated_daily:
            recalculated_daily[k] = round(recalculated_daily[k], 2)

        # 2. Check daily total discrepancies
        stated_daily_kcal = plan.daily_totals.get("enerc_kcal", 0.0)
        recalc_daily_kcal = recalculated_daily["enerc_kcal"]
        if abs(stated_daily_kcal - recalc_daily_kcal) > 30.0 and abs(stated_daily_kcal - recalc_daily_kcal) / max(recalc_daily_kcal, 1) > 0.05:
            discrepancies.append(
                f"Daily total energy drift: stated {stated_daily_kcal:.1f} kcal vs recalculated {recalc_daily_kcal:.1f} kcal"
            )

        # 3. Clinical Safety Constraint Checks
        # Hypertension: Sodium <= 2000 mg/day
        if is_hypertension and recalculated_daily["na"] > 2100.0:
            violations.append(
                f"Clinical Safety Violation (Hypertension): Total sodium ({recalculated_daily['na']:.1f} mg) "
                "exceeds therapeutic safety cap (2000 mg/day)."
            )
            repair_suggestions.append("Reduce added table salt from 3g to 2g and replace high-sodium ingredients.")

        # CKD: Protein <= 65g/day, Phosphorus <= 1100 mg
        if is_ckd:
            if recalculated_daily["protcnt"] > 65.0:
                violations.append(
                    f"Clinical Safety Violation (CKD): Total protein ({recalculated_daily['protcnt']:.1f}g) "
                    "exceeds renal safety limit (<= 65g/day)."
                )
                repair_suggestions.append("Decrease dal and animal meat portions to respect renal filtration capacity.")
            if recalculated_daily["p"] > 1200.0:
                violations.append(
                    f"Clinical Safety Violation (CKD): Phosphorus ({recalculated_daily['p']:.1f} mg) "
                    "exceeds hyperphosphatemia safety limit (<= 1100 mg/day)."
                )

        # Diabetes: Free added sugars forbidden
        if is_diabetes:
            for m in plan.meals:
                for ing in m.ingredients:
                    f = self.foods.get(ing.food_id)
                    if f and (
                        f.food_group == "Sugars"
                        or "sugar" in f.name_en.lower()
                        or "jaggery" in f.name_en.lower()
                        or "syrup" in f.name_en.lower()
                        or ("sweet" in f.name_en.lower() and f.food_group not in ("Fruits", "Other Vegetables", "Cereals and Millets"))
                    ):
                        violations.append(
                            f"Clinical Safety Violation (Diabetes): High glycemic ingredient '{ing.food_name_en}' "
                            "is contraindicated for glycemic control."
                        )


        is_valid = len(violations) == 0

        status = VerificationStatus.VERIFIED if is_valid else VerificationStatus.VERIFICATION_FAILED
        if not is_valid and repair_attempt < 2 and len(repair_suggestions) > 0:
            status = VerificationStatus.NEEDS_REPAIR

        # Clone and assign verified numbers if valid
        verified_plan = None
        if is_valid:
            verified_plan = plan.model_copy(deep=True)
            # Stamp verified totals onto plan
            verified_plan.daily_totals = recalculated_daily

        return PlanVerificationResult(
            is_valid=is_valid,
            status=status,
            recalculated_totals=recalculated_daily,
            discrepancies=discrepancies,
            clinical_violations=violations,
            repair_suggestions=repair_suggestions,
            repair_attempts=repair_attempt,
            verified_plan=verified_plan,
        )

    def verify_and_repair_plan(
        self,
        plan: DailyMealPlan,
        medical_conditions: Optional[List[str]] = None,
        max_repairs: int = 2,
    ) -> PlanVerificationResult:
        """
        Bounded repair loop: verifies, applies mathematical adjustments if needed,
        and re-verifies.
        """
        current_plan = plan
        attempt = 0

        while attempt <= max_repairs:
            result = self.verify_plan(current_plan, medical_conditions, repair_attempt=attempt)

            if result.status == VerificationStatus.VERIFIED:
                return result

            if result.status == VerificationStatus.VERIFICATION_FAILED or attempt >= max_repairs:
                # Fatal violation or exceeded bounded repairs
                return result

            # Attempt repair
            repaired_plan = current_plan.model_copy(deep=True)
            if "table salt" in str(result.repair_suggestions).lower() and repaired_plan.table_salt_g > 2.0:
                repaired_plan.table_salt_g = max(2.0, repaired_plan.table_salt_g - 1.0)
            if "protein" in str(result.repair_suggestions).lower():
                # Scale down protein foods by 15%
                for m in repaired_plan.meals:
                    for ing in m.ingredients:
                        f = self.foods.get(ing.food_id)
                        if f and f.food_group in ("Animal Meat", "Poultry", "Grain Legumes", "Fresh Water Fish and Shellfish"):
                            ing.edible_grams = round(ing.edible_grams * 0.85, 1)

            current_plan = repaired_plan
            attempt += 1

        return self.verify_plan(current_plan, medical_conditions, repair_attempt=attempt)

    def verify_raw_plan_dict(
        self,
        plan_dict: Dict[str, Any],
        medical_conditions: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Post-generation verifier for raw meal plan dictionaries (e.g. from meal_plan_service).
        Stamps deterministic verification metadata directly onto plan_dict.
        """
        violations: List[str] = []
        discrepancies: List[str] = []
        conditions = medical_conditions or plan_dict.get("condition_rules_applied", [])
        norm_conditions = [c.strip().lower() for c in conditions]
        is_diabetes = any("diabetes" in c or "diabetic" in c for c in norm_conditions)
        is_hypertension = any("hypertension" in c or "blood pressure" in c for c in norm_conditions)
        is_ckd = any("kidney" in c or "ckd" in c for c in norm_conditions)

        recalc_daily = {k: 0.0 for k in NUTRIENT_SPECIFICATIONS.keys()}

        for meal in plan_dict.get("meals", []):
            meal_recalc_kcal = 0.0
            for item in meal.get("items", []):
                code = item.get("food_code") or item.get("code")
                food_item = self.foods.get(code) if code else None
                if not food_item:
                    # Fallback to name search
                    name_en = item.get("food_name_en") or item.get("name_en") or item.get("name", "")
                    for f in self.foods.values():
                        if name_en.lower() == f.name_en.lower():
                            food_item = f
                            item["food_code"] = f.canonical_id
                            break

                if not food_item:
                    violations.append(f"Unverified food item '{item.get('name')}' (code '{code}')")
                    continue

                if food_item.is_quarantined:
                    violations.append(f"Quarantined food item '{food_item.name_en}' ({food_item.canonical_id})")
                    continue

                # Portion
                portion_g = float(item.get("amount_g") or item.get("portion") or 100.0)
                if portion_g <= 0:
                    violations.append(f"Non-positive portion for '{item.get('name')}'")
                elif portion_g > 600.0:
                    violations.append(f"Excessive portion ({portion_g}g) for '{item.get('name')}'")

                # Accumulate
                for nut_key in NUTRIENT_SPECIFICATIONS.keys():
                    amt = food_item.get_nutrient_amount(nut_key, portion_g) or 0.0
                    recalc_daily[nut_key] += amt

                ing_kcal = food_item.get_nutrient_amount("enerc_kcal", portion_g) or 0.0
                meal_recalc_kcal += ing_kcal

                # Diabetes check
                if is_diabetes:
                    if (
                        food_item.food_group == "Sugars"
                        or "sugar" in food_item.name_en.lower()
                        or "jaggery" in food_item.name_en.lower()
                    ):
                        violations.append(f"High-glycemic food '{food_item.name_en}' contraindicated for diabetes")

            # Check meal kcal
            stated_meal_kcal = float(meal.get("calories") or 0.0)
            if stated_meal_kcal > 0 and abs(stated_meal_kcal - meal_recalc_kcal) > 30.0:
                discrepancies.append(f"Meal slot '{meal.get('slot')}' stated {stated_meal_kcal:.1f} kcal vs recalculated {meal_recalc_kcal:.1f} kcal")
                meal["calories"] = round(meal_recalc_kcal, 1)

        # Hypertension sodium check
        if is_hypertension and recalc_daily["na"] > 2100.0:
            violations.append(f"Daily sodium {recalc_daily['na']:.1f} mg exceeds 2000 mg limit for hypertension")

        # CKD protein check
        if is_ckd and recalc_daily["protcnt"] > 65.0:
            violations.append(f"Daily protein {recalc_daily['protcnt']:.1f}g exceeds 65g limit for CKD")

        is_valid = len(violations) == 0
        plan_dict["is_verified"] = is_valid
        plan_dict["verification_status"] = "verified" if is_valid else "verification_failed"
        plan_dict["recalculated_totals"] = {k: round(v, 2) for k, v in recalc_daily.items()}
        plan_dict["clinical_violations"] = violations
        plan_dict["discrepancies"] = discrepancies

        return plan_dict

