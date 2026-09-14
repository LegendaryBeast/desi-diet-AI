"""
Unit Tests for Portion-Based Planning Engine (Phase D)
DesiDiet Clinical Planning Pipeline
"""

import pytest
from app.data.reference_intakes import DemographicProfile
from app.logic.portion_planner import (
    PortionPlanner,
    PlanStatus,
    MealSlotName,
    MAX_SPICE_GRAMS_PER_MEAL,
    MAX_SALT_GRAMS_PER_DAY,
)


@pytest.fixture
def planner():
    return PortionPlanner()


class TestPortionPlannerCore:
    """Core mathematical correctness and slot structure."""

    def test_portion_formula_exactness(self, planner):
        prof = DemographicProfile(age=28.0, gender="female")
        plan = planner.plan_day(prof)
        assert plan.status == PlanStatus.FEASIBLE

        # Recalculate lunch calories independently from raw ingredients
        lunch_meal = next(m for m in plan.meals if m.slot_name == MealSlotName.LUNCH)
        manual_lunch_kcal = sum(ing.nutrients.get("enerc_kcal", 0.0) for ing in lunch_meal.ingredients)
        assert lunch_meal.total_kcal == pytest.approx(manual_lunch_kcal, abs=0.2)

    def test_five_meal_slots_present(self, planner):
        prof = DemographicProfile(age=35.0, gender="male")
        plan = planner.plan_day(prof)
        assert plan.status == PlanStatus.FEASIBLE
        slot_names = [m.slot_name for m in plan.meals]
        assert MealSlotName.BREAKFAST in slot_names
        assert MealSlotName.MORNING_SNACK in slot_names
        assert MealSlotName.LUNCH in slot_names
        assert MealSlotName.AFTERNOON_SNACK in slot_names
        assert MealSlotName.DINNER in slot_names

    def test_oil_and_salt_explicit_accounting(self, planner):
        prof = DemographicProfile(age=30.0, gender="female")
        plan = planner.plan_day(prof)
        assert plan.status == PlanStatus.FEASIBLE

        # Oil must be between 15g and 30g
        assert 15.0 <= plan.cooking_oil_g <= 30.0
        # Salt must be <= 5g/day
        assert plan.table_salt_g <= MAX_SALT_GRAMS_PER_DAY

        # Verify oil energy is in daily totals
        expected_oil_kcal = (plan.cooking_oil_g * 884.0) / 100.0
        assert plan.daily_totals["enerc_kcal"] >= expected_oil_kcal


class TestClinicalConstraints:
    """Clinical restrictions for hypertension, CKD, and diabetes."""

    def test_hypertension_sodium_reduction(self, planner):
        healthy_prof = DemographicProfile(age=45.0, gender="male")
        htn_prof = DemographicProfile(age=45.0, gender="male", medical_conditions=["Hypertension"])

        healthy_plan = planner.plan_day(healthy_prof)
        htn_plan = planner.plan_day(htn_prof)

        assert htn_plan.table_salt_g < healthy_plan.table_salt_g
        assert htn_plan.daily_totals["na"] <= 2000.0

    def test_ckd_protein_restriction(self, planner):
        ckd_prof = DemographicProfile(age=55.0, gender="male", medical_conditions=["Chronic Kidney Disease"])
        plan = planner.plan_day(ckd_prof)
        assert plan.status == PlanStatus.FEASIBLE

        # CKD limits protein strictly
        assert plan.daily_totals["protcnt"] <= 65.0

    def test_infeasible_conflicting_constraints(self, planner):
        # Severe CKD + extreme requested protein
        conflict_prof = DemographicProfile(
            age=40.0,
            gender="male",
            medical_conditions=["Chronic Kidney Disease"],
        )
        # Manually alter reference rule target to simulate conflicting demand
        # (In planner, this is caught when target_protein > 60 for CKD)
        from app.data.reference_intakes import NutrientReferenceRule, RequirementType
        from unittest.mock import patch

        def mock_resolve(p):
            return (
                from_app_status := p.age,
                {
                    "enerc_kcal": NutrientReferenceRule(
                        nutrient_key="enerc_kcal", nutrient_name="Energy", target_value=2500, unit="kcal", requirement_type=RequirementType.RDA, source_standard="MOCK"
                    ),
                    "protcnt": NutrientReferenceRule(
                        nutrient_key="protcnt", nutrient_name="Protein", target_value=120.0, unit="g", requirement_type=RequirementType.RDA, source_standard="MOCK"
                    ),
                },
                ["Conflict requested"],
            )

        with patch("app.logic.portion_planner.resolve_reference_intakes", side_effect=mock_resolve):
            plan = planner.plan_day(conflict_prof)
            assert plan.status == PlanStatus.INFEASIBLE
            assert any("Severe constraint conflict" in m for m in plan.diagnostic_messages)

    def test_unsupported_pediatric_rejection(self, planner):
        pediatric_prof = DemographicProfile(age=1.0, gender="female")
        plan = planner.plan_day(pediatric_prof)
        assert plan.status == PlanStatus.UNSUPPORTED_DEMOGRAPHIC
        assert any("under 2 years" in m for m in plan.diagnostic_messages)
