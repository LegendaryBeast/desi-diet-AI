"""
Unit Tests for Deterministic Plan Verifier (Phase E)
DesiDiet Clinical Planning Pipeline
"""

import pytest
from app.data.reference_intakes import DemographicProfile
from app.logic.portion_planner import PortionPlanner, PlannedIngredient
from app.logic.plan_verifier import PlanVerifier, VerificationStatus


@pytest.fixture
def planner_and_verifier():
    planner = PortionPlanner()
    verifier = PlanVerifier(planner.foods)
    return planner, verifier


class TestPlanVerifierIntegrity:
    """Testing schema, food ID validation, and recalculation accuracy."""

    def test_valid_plan_verifies_cleanly(self, planner_and_verifier):
        planner, verifier = planner_and_verifier
        prof = DemographicProfile(age=28.0, gender="female")
        plan = planner.plan_day(prof)

        result = verifier.verify_plan(plan)
        assert result.is_valid is True
        assert result.status == VerificationStatus.VERIFIED
        assert len(result.clinical_violations) == 0
        assert result.verified_plan is not None

    def test_hallucinated_food_rejected(self, planner_and_verifier):
        planner, verifier = planner_and_verifier
        prof = DemographicProfile(age=28.0, gender="female")
        plan = planner.plan_day(prof)

        # Inject a fake/hallucinated food ID into lunch
        fake_ingredient = PlannedIngredient(
            food_id="NON_EXISTENT_SUPERFOOD_999",
            food_name_en="Magic Miracle Berry",
            food_name_bn="অলৌকিক ফল",
            food_group="Fruits",
            edible_grams=100.0,
            nutrients={"enerc_kcal": 50.0},
        )
        plan.meals[2].ingredients.append(fake_ingredient)

        result = verifier.verify_plan(plan)
        assert result.is_valid is False
        assert result.status in (VerificationStatus.VERIFICATION_FAILED, VerificationStatus.NEEDS_REPAIR)
        assert any("Unauthorized / Hallucinated ingredient" in v for v in result.clinical_violations)
        assert result.verified_plan is None

    def test_non_positive_portion_rejected(self, planner_and_verifier):
        planner, verifier = planner_and_verifier
        prof = DemographicProfile(age=30.0, gender="male")
        plan = planner.plan_day(prof)

        # Corrupt an ingredient portion to 0g
        plan.meals[0].ingredients[0].edible_grams = 0.0

        result = verifier.verify_plan(plan)
        assert result.is_valid is False
        assert any("non-positive edible portion" in v for v in result.clinical_violations)

    def test_excessive_spice_rejected(self, planner_and_verifier):
        planner, verifier = planner_and_verifier
        prof = DemographicProfile(age=30.0, gender="male")
        plan = planner.plan_day(prof)

        # Inject 50g of Spices (pathological density exploit)
        spice_ing = PlannedIngredient(
            food_id="07_0009",  # Fennel seeds in Spices and Condiments
            food_name_en="Fennel seeds",
            food_name_bn="মৌরি",
            food_group="Spices and Condiments",
            edible_grams=50.0,  # > 15g!
            nutrients={"enerc_kcal": 150.0},
        )
        plan.meals[0].ingredients.append(spice_ing)

        result = verifier.verify_plan(plan)
        assert result.is_valid is False
        assert any("Spice bound exceeded" in v for v in result.clinical_violations)


class TestClinicalSafetyVerification:
    """Clinical contraindications and safety boundaries."""

    def test_diabetes_sugar_injection_rejected(self, planner_and_verifier):
        planner, verifier = planner_and_verifier
        prof = DemographicProfile(age=45.0, gender="male", medical_conditions=["Type 2 Diabetes"])
        plan = planner.plan_day(prof)

        # Inject jaggery / cane sugar into dinner
        sugar_ing = PlannedIngredient(
            food_id="I001",  # Jaggery cane in Sugars group
            food_name_en="Jaggery cane",
            food_name_bn="আখের গুড়",
            food_group="Sugars",
            edible_grams=40.0,
            nutrients={"enerc_kcal": 150.0},
        )
        plan.meals[4].ingredients.append(sugar_ing)


        result = verifier.verify_plan(plan, medical_conditions=["Type 2 Diabetes"])
        assert result.is_valid is False
        assert any("Diabetes" in v for v in result.clinical_violations)

    def test_bounded_repair_loop_executes(self, planner_and_verifier):
        planner, verifier = planner_and_verifier
        prof = DemographicProfile(age=50.0, gender="male", medical_conditions=["Hypertension"])
        plan = planner.plan_day(prof)

        # Artificially set high salt to trigger repair
        plan.table_salt_g = 6.0

        result = verifier.verify_and_repair_plan(plan, medical_conditions=["Hypertension"], max_repairs=2)
        # Bounded repair reduces salt or terminates cleanly
        assert result.repair_attempts <= 2
