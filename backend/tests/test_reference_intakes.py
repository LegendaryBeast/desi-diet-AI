"""
Unit Tests for Reference Intakes & Iron Standard Adjudication (Phase C)
DesiDiet Clinical Planning Pipeline
"""

import pytest
from app.data.reference_intakes import (
    DemographicProfile,
    DemographicStatus,
    RequirementType,
    resolve_reference_intakes,
)


class TestDemographicSafetyGuards:
    """Missing or unsupported demographics must produce defined safe states."""

    def test_missing_age_returns_needs_clarification(self):
        profile = DemographicProfile(gender="female", age=None)
        status, rules, messages = resolve_reference_intakes(profile)
        assert status == DemographicStatus.NEEDS_CLARIFICATION
        assert len(rules) == 0
        assert any("Age and gender are required" in m for m in messages)

    def test_missing_gender_returns_needs_clarification(self):
        profile = DemographicProfile(age=25.0, gender=None)
        status, rules, messages = resolve_reference_intakes(profile)
        assert status == DemographicStatus.NEEDS_CLARIFICATION
        assert len(rules) == 0

    def test_pediatric_under_2_returns_unsupported(self):
        profile = DemographicProfile(age=1.5, gender="male")
        status, rules, messages = resolve_reference_intakes(profile)
        assert status == DemographicStatus.UNSUPPORTED
        assert len(rules) == 0
        assert any("under 2 years" in m for m in messages)


class TestIronStandardAdjudication:
    """Rigorous verification of the female and male iron standards."""

    def test_adult_female_iron_rda_and_bioavailability(self):
        profile = DemographicProfile(age=28.0, gender="female")
        status, rules, _ = resolve_reference_intakes(profile)
        assert status == DemographicStatus.SUPPORTED

        fe_rule = rules.get("fe")
        assert fe_rule is not None
        assert fe_rule.target_value == 29.0
        assert fe_rule.requirement_type == RequirementType.RDA
        assert fe_rule.bioavailability_pct == 10.0
        assert fe_rule.min_value == 15.0  # EAR baseline
        assert "29 mg/day" in fe_rule.clinical_notes

    def test_adult_male_iron_rda(self):
        profile = DemographicProfile(age=30.0, gender="male")
        status, rules, _ = resolve_reference_intakes(profile)
        assert status == DemographicStatus.SUPPORTED

        fe_rule = rules.get("fe")
        assert fe_rule is not None
        assert fe_rule.target_value == 19.0
        assert fe_rule.requirement_type == RequirementType.RDA
        assert fe_rule.bioavailability_pct == 10.0

    def test_pregnancy_iron_escalation(self):
        profile = DemographicProfile(age=26.0, gender="female", is_pregnant=True, pregnancy_trimester=2)
        status, rules, _ = resolve_reference_intakes(profile)
        assert status == DemographicStatus.SUPPORTED

        fe_rule = rules.get("fe")
        assert fe_rule is not None
        assert fe_rule.target_value == 38.0  # Pregnancy RDA
        assert "Routine elemental iron supplementation" in fe_rule.clinical_notes
        # Pregnancy increases protein and energy
        assert rules["protcnt"].target_value > 46.0
        assert rules["enerc_kcal"].target_value > 1900.0


class TestClinicalDiseaseRestrictions:
    """Chronic disease rules and multi-disease conflict resolution."""

    def test_hypertension_sodium_restriction(self):
        profile = DemographicProfile(
            age=50.0,
            gender="male",
            medical_conditions=["Hypertension"],
        )
        status, rules, audit = resolve_reference_intakes(profile)
        assert status == DemographicStatus.SUPPORTED
        assert rules["na"].requirement_type == RequirementType.CLINICAL_RESTRICTION
        assert rules["na"].target_value == 1500.0
        assert rules["na"].max_value == 1500.0
        assert any("Hypertension" in a for a in audit)

    def test_ckd_protein_phosphorus_potassium_restriction(self):
        profile = DemographicProfile(
            age=55.0,
            gender="male",
            medical_conditions=["Chronic Kidney Disease Stage 3"],
        )
        status, rules, audit = resolve_reference_intakes(profile)
        assert status == DemographicStatus.SUPPORTED
        assert rules["protcnt"].requirement_type == RequirementType.CLINICAL_RESTRICTION
        assert rules["protcnt"].max_value == 45.0
        assert rules["p"].max_value == 1000.0
        assert rules["k"].max_value == 2500.0

    def test_comorbid_diabetes_and_ckd_precedence(self):
        profile = DemographicProfile(
            age=60.0,
            gender="female",
            medical_conditions=["Type 2 Diabetes", "Chronic Kidney Disease"],
        )
        status, rules, audit = resolve_reference_intakes(profile)
        assert status == DemographicStatus.SUPPORTED
        # Both fiber target (diabetes) and low protein (CKD) are applied
        assert rules["fibtg"].min_value == 25.0
        assert rules["protcnt"].max_value == 45.0
        assert len(audit) == 2
