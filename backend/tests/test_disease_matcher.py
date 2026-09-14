"""
test_disease_matcher.py
Tests for Phase C fixes:
- Disease negation (\"no diabetes\" must not match Diabetes)
- Family history (\"my father has diabetes\" is not a personal diagnosis)
- Lifestyle goals (\"Maintain\" must not match Malnutrition)
- Gibberish (\"zzzzzzzzzz\" must not match Tonsillitis)
- RDA key structured returns (missing gender, unsupported age)
- Ambiguous nutrient label skipped (\"Vitamin B\")

All expected numeric totals are from independently stated requirements,
not from calling the same function under test.
"""

import pytest
from unittest.mock import patch, MagicMock
from typing import Optional

# Use the rag_engine planner as the canonical implementation
from rag_engine.planner import (
    find_best_disease_match,
    get_rda_key,
    map_clinical_to_scientific_nutrients,
    _has_negation,
    _has_family_history,
    _GOAL_TERMS,
)


# ---------------------------------------------------------------------------
# Minimal fixture: a mock ai_models dict with realistic disease list
# ---------------------------------------------------------------------------

FIXTURE_DISEASES = [
    "Anemia",
    "Diabetes",
    "Hypertension",
    "Malnutrition",
    "Obesity",
    "Tonsillitis",
    "CKD",  # Chronic Kidney Disease
]

FIXTURE_AI_MODELS = {
    "model": "lightweight_string_matcher",
    "predefined_diseases": FIXTURE_DISEASES,
    "disease_embeddings": None,
    "target_nutrient_corpus": [
        "Iron (Fe)",
        "Vitamin B12 (Cobalamin)",
        "Vitamin B1 (Thiamine)",
        "Vitamin B6 (Pyridoxine)",
        "Folate / Folic Acid (Vitamin B9)",
        "Calcium",
        "Zinc",
        "Protein",
    ],
    "nutrient_embeddings": None,
}


# ---------------------------------------------------------------------------
# Tests: Negation detection helper
# ---------------------------------------------------------------------------

class TestNegationHelper:
    def test_starts_with_no(self):
        assert _has_negation("no diabetes") is True

    def test_starts_with_dont_have(self):
        assert _has_negation("don't have diabetes") is True

    def test_starts_with_do_not_have(self):
        assert _has_negation("do not have hypertension") is True

    def test_contains_negation_mid_sentence(self):
        assert _has_negation("i do not have any condition") is True

    def test_plain_condition_not_negated(self):
        assert _has_negation("diabetes") is False

    def test_i_have_diabetes_not_negated(self):
        assert _has_negation("i have diabetes") is False

    def test_bangla_na_prefix(self):
        assert _has_negation("না ডায়াবেটিস") is True


# ---------------------------------------------------------------------------
# Tests: Family history helper
# ---------------------------------------------------------------------------

class TestFamilyHistoryHelper:
    def test_my_father_has(self):
        assert _has_family_history("my father has diabetes") is True

    def test_my_mother_has(self):
        assert _has_family_history("my mother has hypertension") is True

    def test_family_history_phrase(self):
        assert _has_family_history("family history of diabetes") is True

    def test_personal_diagnosis_no_match(self):
        assert _has_family_history("i have diabetes") is False

    def test_plain_disease_no_match(self):
        assert _has_family_history("diabetes") is False


# ---------------------------------------------------------------------------
# Tests: Disease matcher core — confirmed audit counterexamples
# ---------------------------------------------------------------------------

class TestFindBestDiseaseMatch:
    """
    Every case here is a CONFIRMED DEFECT from the audit.
    The BEFORE column shows what the old code returned.
    The AFTER column shows what the fixed code must return.
    """

    def test_gibberish_returns_none_not_tonsillitis(self):
        """BEFORE: 'zzzzzzzzzz' -> Tonsillitis (first in list). AFTER: None."""
        result = find_best_disease_match("zzzzzzzzzz", FIXTURE_AI_MODELS)
        assert result is None, (
            f"Expected None for gibberish, got '{result}'. "
            "The fallback to the first disease has been removed."
        )

    def test_no_diabetes_returns_none_not_diabetes(self):
        """BEFORE: 'no diabetes' -> Diabetes (substring match). AFTER: None (negation)."""
        result = find_best_disease_match("no diabetes", FIXTURE_AI_MODELS)
        assert result is None, (
            f"Expected None for 'no diabetes', got '{result}'. "
            "Negation must be detected before substring matching."
        )

    def test_maintain_returns_none_not_malnutrition(self):
        """BEFORE: 'Maintain' -> Malnutrition (substring 'main'). AFTER: None (goal term)."""
        result = find_best_disease_match("Maintain", FIXTURE_AI_MODELS)
        assert result is None, (
            f"Expected None for 'Maintain', got '{result}'. "
            "'Maintain' is a lifestyle goal, not a diagnosis."
        )

    def test_family_history_returns_none(self):
        """'My father has diabetes' must not become a personal diabetes diagnosis."""
        result = find_best_disease_match("my father has diabetes", FIXTURE_AI_MODELS)
        assert result is None, (
            f"Expected None for family history, got '{result}'."
        )

    def test_dont_have_hypertension_returns_none(self):
        """\"I don't have hypertension\" must return None, not Hypertension."""
        result = find_best_disease_match("I don't have hypertension", FIXTURE_AI_MODELS)
        assert result is None

    def test_exact_match_works(self):
        """Exact match should still succeed."""
        result = find_best_disease_match("Diabetes", FIXTURE_AI_MODELS)
        assert result == "Diabetes"

    def test_case_insensitive_exact_match(self):
        """Case-insensitive exact match should succeed."""
        result = find_best_disease_match("diabetes", FIXTURE_AI_MODELS)
        assert result == "Diabetes"

    def test_i_have_diabetes_matches(self):
        """Positive diagnosis containing disease name should match."""
        result = find_best_disease_match("I have diabetes", FIXTURE_AI_MODELS)
        assert result == "Diabetes"

    def test_anemia_typo_matches(self):
        """Close typo 'anaemia' should match 'Anemia'."""
        result = find_best_disease_match("anaemia", FIXTURE_AI_MODELS)
        assert result == "Anemia"

    def test_empty_input_returns_none(self):
        result = find_best_disease_match("", FIXTURE_AI_MODELS)
        assert result is None

    def test_none_input_returns_none(self):
        result = find_best_disease_match(None, FIXTURE_AI_MODELS)
        assert result is None

    def test_lose_weight_goal_returns_none(self):
        """'Lose weight' is a lifestyle goal, not a disease."""
        result = find_best_disease_match("lose weight", FIXTURE_AI_MODELS)
        assert result is None

    def test_healthy_goal_returns_none(self):
        result = find_best_disease_match("healthy", FIXTURE_AI_MODELS)
        assert result is None


# ---------------------------------------------------------------------------
# Tests: RDA key structured returns
# ---------------------------------------------------------------------------

class TestGetRdaKey:
    def test_valid_adult_male_returns_ok(self):
        result = get_rda_key(30, "male")
        assert result["status"] == "ok"
        assert result["key"] == "rda_male_19_30_mg"

    def test_valid_adult_female_returns_ok(self):
        result = get_rda_key(35, "female")
        assert result["status"] == "ok"
        assert result["key"] == "rda_female_31_50_mg"

    def test_elderly_male_returns_ok(self):
        result = get_rda_key(72, "male")
        assert result["status"] == "ok"
        assert result["key"] == "rda_male_gt_70_mg"

    def test_missing_gender_returns_needs_clarification_not_male(self):
        """
        BEFORE: missing gender silently mapped to 'male'.
        AFTER: returns needs_clarification.
        """
        result = get_rda_key(30, "")
        assert result["status"] == "needs_clarification", (
            "Missing gender must require clarification, not silently default to male."
        )

    def test_other_gender_returns_needs_clarification(self):
        """
        BEFORE: gender='other' silently mapped to 'male'.
        AFTER: returns needs_clarification.
        """
        result = get_rda_key(30, "other")
        assert result["status"] == "needs_clarification"

    def test_age_5_female_returns_unsupported_not_14_18(self):
        """
        BEFORE: age=5, female -> '9_13' -> silently remapped to 14_18 (adolescent RDA).
        AFTER: returns unsupported.
        """
        result = get_rda_key(5, "female")
        assert result["status"] == "unsupported", (
            f"Age 5 should be unsupported, not silently remapped to 14-18 bracket. Got: {result}"
        )

    def test_age_11_returns_unsupported_not_14_18(self):
        """
        BEFORE: age=11 -> silently remapped to 14_18.
        AFTER: returns unsupported (9-13 bracket absent from dataset).
        """
        result = get_rda_key(11, "male")
        assert result["status"] == "unsupported"

    def test_age_14_male_returns_ok(self):
        result = get_rda_key(14, "male")
        assert result["status"] == "ok"
        assert result["key"] == "rda_male_14_18_mg"

    def test_age_0_returns_unsupported(self):
        result = get_rda_key(0, "female")
        assert result["status"] == "unsupported"

    def test_no_key_field_when_not_ok(self):
        """Result must not have a 'key' field when status is not 'ok'."""
        result = get_rda_key(5, "female")
        assert "key" not in result


# ---------------------------------------------------------------------------
# Tests: Ambiguous nutrient label
# ---------------------------------------------------------------------------

class TestMapClinicalToScientificNutrients:
    def test_vitamin_b_is_skipped_not_guessed(self):
        """
        BEFORE: 'Vitamin B' silently mapped to an arbitrary B-vitamin.
        AFTER: skipped entirely, returns empty set (not a wrong match).
        """
        result = map_clinical_to_scientific_nutrients({"Vitamin B"}, FIXTURE_AI_MODELS)
        # Must not contain any B-vitamin guess
        for nutrient in result:
            assert "B12" not in nutrient and "B1" not in nutrient and "B6" not in nutrient, (
                f"'Vitamin B' should be skipped entirely, but mapped to '{nutrient}'."
            )
        # Can be empty or contain other non-ambiguous nutrients only
        # (In this case it should be empty since only "Vitamin B" was given)
        assert len(result) == 0

    def test_vitamin_b12_explicit_maps_correctly(self):
        """Explicit 'B12' or 'Vitamin B12' should still map."""
        result = map_clinical_to_scientific_nutrients({"Vitamin B12"}, FIXTURE_AI_MODELS)
        assert any("B12" in n for n in result), (
            "Explicit 'Vitamin B12' should map to the B12 nutrient."
        )

    def test_iron_maps_correctly(self):
        result = map_clinical_to_scientific_nutrients({"Iron"}, FIXTURE_AI_MODELS)
        assert any("Iron" in n for n in result)

    def test_food_code_junk_is_filtered(self):
        """Junk labels like 'Food Code' must be filtered out."""
        result = map_clinical_to_scientific_nutrients({"Food Code"}, FIXTURE_AI_MODELS)
        assert len(result) == 0

    def test_empty_input_returns_empty(self):
        result = map_clinical_to_scientific_nutrients(set(), FIXTURE_AI_MODELS)
        assert result == set()
