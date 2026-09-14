"""
Clinical Reference Intakes & Rule Selection (Phase C)
DesiDiet Clinical Planning Pipeline

Explicit demographic models, typed nutritional standards (RDA, EAR, AI, UL),
and clinical disease restrictions grounded in the National Dietary Guidelines for Bangladesh (NDG 2025)
and ICMR-NIN 2020.
"""

from __future__ import annotations
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class RequirementType(str, Enum):
    RDA = "RDA"  # Recommended Dietary Allowance (covers 97.5% of population)
    EAR = "EAR"  # Estimated Average Requirement (median physiological need)
    AI = "AI"    # Adequate Intake (when RDA cannot be determined)
    UL = "UL"    # Tolerable Upper Intake Level (safety cap)
    CLINICAL_RESTRICTION = "CLINICAL_RESTRICTION"  # Disease-specific therapeutic bound


class DemographicStatus(str, Enum):
    SUPPORTED = "supported"
    UNSUPPORTED = "unsupported"
    NEEDS_CLARIFICATION = "needs_clarification"


class DemographicProfile(BaseModel):
    """User demographic and physiological profile."""
    age: Optional[float] = None
    gender: Optional[str] = None  # "male", "female"
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    activity_level: str = "sedentary"  # "sedentary", "moderate", "heavy"
    is_pregnant: bool = False
    pregnancy_trimester: Optional[int] = None  # 1, 2, 3
    is_lactating: bool = False
    medical_conditions: List[str] = Field(default_factory=list)


class NutrientReferenceRule(BaseModel):
    """A typed reference intake requirement or clinical restriction."""
    nutrient_key: str
    nutrient_name: str
    target_value: float
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    unit: str
    requirement_type: RequirementType
    bioavailability_pct: Optional[float] = None
    source_standard: str
    clinical_notes: Optional[str] = None


# --- PRIMARY ADULT REFERENCE STANDARDS ---
# Grounded in National Dietary Guidelines for Bangladesh (NDG 2025, Table 18, 19, 20)
# and ICMR-NIN 2020 Recommended Dietary Allowances for Indians (applicable to South Asian diets).

def get_base_adult_rules(gender: str, age: float) -> Dict[str, NutrientReferenceRule]:
    """Base nutritional standards for adults (age 19-50)."""
    is_female = gender.strip().lower() == "female"

    if is_female:
        # Adult Female (19-50 years):
        # NDG 2025 Table 20: Energy 2130 kcal (moderate), Protein 46g, Calcium 1000 mg
        # IRON ADJUDICATION:
        # - Basal physiological requirement: ~8.1 mg/day (EAR at higher bioavailability)
        # - National RDA (10% bioavailability from cereal-dominated diet): 29.0 mg/day
        return {
            "enerc_kcal": NutrientReferenceRule(
                nutrient_key="enerc_kcal",
                nutrient_name="Energy",
                target_value=1900.0,
                min_value=1600.0,
                max_value=2200.0,
                unit="kcal",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_18",
                clinical_notes="Sedentary to moderate adult female baseline",
            ),
            "protcnt": NutrientReferenceRule(
                nutrient_key="protcnt",
                nutrient_name="Protein",
                target_value=46.0,
                min_value=40.0,
                unit="g",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_19",
                clinical_notes="0.83g/kg reference body weight",
            ),
            "fe": NutrientReferenceRule(
                nutrient_key="fe",
                nutrient_name="Iron",
                target_value=29.0,
                min_value=15.0,  # EAR baseline
                max_value=45.0,  # UL
                unit="mg",
                requirement_type=RequirementType.RDA,
                bioavailability_pct=10.0,
                source_standard="NDG_Bangladesh_2025_Table_20",
                clinical_notes=(
                    "Adult female non-pregnant RDA is 29 mg/day assuming 10% bioavailability on standard "
                    "Bangladeshi cereal-based diet. 8.1 mg/day is the basal physiological EAR."
                ),
            ),
            "ca": NutrientReferenceRule(
                nutrient_key="ca",
                nutrient_name="Calcium",
                target_value=1000.0,
                min_value=800.0,
                max_value=2500.0,
                unit="mg",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_20",
            ),
            "na": NutrientReferenceRule(
                nutrient_key="na",
                nutrient_name="Sodium",
                target_value=2000.0,
                max_value=2000.0,
                unit="mg",
                requirement_type=RequirementType.UL,
                source_standard="WHO_NDG_2025",
                clinical_notes="Maximum 2000 mg/day (equivalent to 5g table salt NaCl)",
            ),
            "vita": NutrientReferenceRule(
                nutrient_key="vita",
                nutrient_name="Vitamin A",
                target_value=840.0,
                unit="mcg",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_20",
            ),
            "vitc": NutrientReferenceRule(
                nutrient_key="vitc",
                nutrient_name="Vitamin C",
                target_value=65.0,
                min_value=40.0,
                unit="mg",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_20",
            ),
            "vitd": NutrientReferenceRule(
                nutrient_key="vitd",
                nutrient_name="Vitamin D",
                target_value=15.0,
                max_value=100.0,
                unit="mcg",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_20",
            ),
            "zn": NutrientReferenceRule(
                nutrient_key="zn",
                nutrient_name="Zinc",
                target_value=13.2,
                unit="mg",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_20",
            ),
            "folsum": NutrientReferenceRule(
                nutrient_key="folsum",
                nutrient_name="Folates",
                target_value=220.0,
                unit="mcg",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_20",
            ),
        }
    else:
        # Adult Male (19-50 years):
        return {
            "enerc_kcal": NutrientReferenceRule(
                nutrient_key="enerc_kcal",
                nutrient_name="Energy",
                target_value=2300.0,
                min_value=1900.0,
                max_value=2700.0,
                unit="kcal",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_18",
                clinical_notes="Sedentary to moderate adult male baseline",
            ),
            "protcnt": NutrientReferenceRule(
                nutrient_key="protcnt",
                nutrient_name="Protein",
                target_value=54.0,
                min_value=48.0,
                unit="g",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_19",
                clinical_notes="0.83g/kg reference body weight",
            ),
            "fe": NutrientReferenceRule(
                nutrient_key="fe",
                nutrient_name="Iron",
                target_value=19.0,
                min_value=11.0,  # EAR baseline
                max_value=45.0,  # UL
                unit="mg",
                requirement_type=RequirementType.RDA,
                bioavailability_pct=10.0,
                source_standard="NDG_Bangladesh_2025_Table_20",
                clinical_notes="Adult male RDA is 19 mg/day at 10% bioavailability. EAR is 11 mg/day.",
            ),
            "ca": NutrientReferenceRule(
                nutrient_key="ca",
                nutrient_name="Calcium",
                target_value=1000.0,
                min_value=800.0,
                max_value=2500.0,
                unit="mg",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_20",
            ),
            "na": NutrientReferenceRule(
                nutrient_key="na",
                nutrient_name="Sodium",
                target_value=2000.0,
                max_value=2000.0,
                unit="mg",
                requirement_type=RequirementType.UL,
                source_standard="WHO_NDG_2025",
                clinical_notes="Maximum 2000 mg/day (equivalent to 5g table salt NaCl)",
            ),
            "vita": NutrientReferenceRule(
                nutrient_key="vita",
                nutrient_name="Vitamin A",
                target_value=1000.0,
                unit="mcg",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_20",
            ),
            "vitc": NutrientReferenceRule(
                nutrient_key="vitc",
                nutrient_name="Vitamin C",
                target_value=80.0,
                min_value=40.0,
                unit="mg",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_20",
            ),
            "vitd": NutrientReferenceRule(
                nutrient_key="vitd",
                nutrient_name="Vitamin D",
                target_value=15.0,
                max_value=100.0,
                unit="mcg",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_20",
            ),
            "zn": NutrientReferenceRule(
                nutrient_key="zn",
                nutrient_name="Zinc",
                target_value=17.0,
                unit="mg",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_20",
            ),
            "folsum": NutrientReferenceRule(
                nutrient_key="folsum",
                nutrient_name="Folates",
                target_value=300.0,
                unit="mcg",
                requirement_type=RequirementType.RDA,
                source_standard="NDG_Bangladesh_2025_Table_20",
            ),
        }


def apply_pregnancy_lactation_adjustments(
    rules: Dict[str, NutrientReferenceRule], profile: DemographicProfile
) -> None:
    """Adjusts reference intakes for pregnancy or lactation."""
    if profile.is_pregnant:
        # Pregnancy increases Iron, Protein, Energy, Calcium, Folate
        rules["fe"] = NutrientReferenceRule(
            nutrient_key="fe",
            nutrient_name="Iron",
            target_value=38.0,
            min_value=27.0,
            max_value=45.0,
            unit="mg",
            requirement_type=RequirementType.RDA,
            bioavailability_pct=10.0,
            source_standard="NDG_Bangladesh_2025_Table_20",
            clinical_notes="Pregnancy RDA 38 mg/day. Routine elemental iron supplementation recommended.",
        )
        rules["protcnt"].target_value += 15.0
        rules["enerc_kcal"].target_value += 350.0
        rules["ca"].target_value = 1200.0
        rules["folsum"].target_value = 570.0
    elif profile.is_lactating:
        rules["protcnt"].target_value += 17.0
        rules["enerc_kcal"].target_value += 500.0
        rules["ca"].target_value = 1200.0
        rules["vita"].target_value += 400.0


def apply_disease_restrictions(
    rules: Dict[str, NutrientReferenceRule], conditions: List[str]
) -> List[str]:
    """
    Applies evidence-grounded clinical restrictions for chronic diseases.
    When multiple diseases apply, the stricter therapeutic restriction takes precedence.
    Returns audit trail of applied clinical rules.
    """
    audit: List[str] = []
    norm_conditions = [c.strip().lower() for c in conditions]

    # 1. Hypertension
    if any("hypertension" in c or "high blood pressure" in c for c in norm_conditions):
        rules["na"] = NutrientReferenceRule(
            nutrient_key="na",
            nutrient_name="Sodium",
            target_value=1500.0,
            max_value=1500.0,
            unit="mg",
            requirement_type=RequirementType.CLINICAL_RESTRICTION,
            source_standard="AHA_NDG_2025_Hypertension",
            clinical_notes="Strict restriction: < 1500 mg sodium/day (equivalent to < 3.75g table salt).",
        )
        audit.append("Hypertension: Sodium capped at 1500 mg/day.")

    # 2. Chronic Kidney Disease (CKD Stage 3-5 non-dialysis)
    if any("kidney" in c or "ckd" in c or "renal" in c for c in norm_conditions):
        # Strict protein restriction (0.6 - 0.8 g/kg) -> default cap 40g
        rules["protcnt"] = NutrientReferenceRule(
            nutrient_key="protcnt",
            nutrient_name="Protein",
            target_value=38.0,
            max_value=45.0,
            unit="g",
            requirement_type=RequirementType.CLINICAL_RESTRICTION,
            source_standard="KDIGO_2024_Clinical_Guideline",
            clinical_notes="CKD Stage 3-5: Low protein diet (0.6-0.8 g/kg/day) to slow progression.",
        )
        # Phosphorus restriction
        rules["p"] = NutrientReferenceRule(
            nutrient_key="p",
            nutrient_name="Phosphorus",
            target_value=800.0,
            max_value=1000.0,
            unit="mg",
            requirement_type=RequirementType.CLINICAL_RESTRICTION,
            source_standard="KDIGO_2024_Clinical_Guideline",
            clinical_notes="CKD Phosphorus restricted to < 800-1000 mg/day.",
        )
        # Potassium cap
        rules["k"] = NutrientReferenceRule(
            nutrient_key="k",
            nutrient_name="Potassium",
            target_value=2000.0,
            max_value=2500.0,
            unit="mg",
            requirement_type=RequirementType.CLINICAL_RESTRICTION,
            source_standard="KDIGO_2024_Clinical_Guideline",
            clinical_notes="CKD Potassium restricted to prevent hyperkalemia.",
        )
        audit.append("CKD: Protein capped at 45g/day, Phosphorus < 1000 mg, Potassium < 2500 mg.")

    # 3. Type 2 Diabetes
    if any("diabetes" in c or "t2d" in c or "diabetic" in c for c in norm_conditions):
        # Fiber target elevated
        rules["fibtg"] = NutrientReferenceRule(
            nutrient_key="fibtg",
            nutrient_name="Dietary Fiber",
            target_value=30.0,
            min_value=25.0,
            unit="g",
            requirement_type=RequirementType.CLINICAL_RESTRICTION,
            source_standard="ADA_NDG_2025_Diabetes",
            clinical_notes="High fiber (>25-30g/day) to improve glycemic regulation.",
        )
        audit.append("Diabetes: Dietary fiber minimum target set to >= 25-30g/day.")

    return audit


def resolve_reference_intakes(
    profile: DemographicProfile,
) -> Tuple[DemographicStatus, Dict[str, NutrientReferenceRule], List[str]]:
    """
    Main entry point to resolve demographic and clinical reference intakes.
    Enforces demographic validity:
    - Missing age or gender -> NEEDS_CLARIFICATION
    - Age < 2 years -> UNSUPPORTED (pediatric referral)
    - Returns (status, rules, audit_messages)
    """
    messages: List[str] = []

    # 1. Check for missing mandatory attributes
    if profile.age is None or profile.gender is None:
        return (
            DemographicStatus.NEEDS_CLARIFICATION,
            {},
            ["Age and gender are required to determine clinical reference intakes."],
        )

    # 2. Check for unsupported age (< 2 years)
    if profile.age < 2.0:
        return (
            DemographicStatus.UNSUPPORTED,
            {},
            ["Infants under 2 years of age require specialized pediatric nutrition guidelines."],
        )

    gender_norm = profile.gender.strip().lower()
    if gender_norm not in ("male", "female"):
        return (
            DemographicStatus.NEEDS_CLARIFICATION,
            {},
            [f"Unsupported gender specification '{profile.gender}'. Expected 'male' or 'female'."],
        )

    # 3. Base adult rules (19+)
    rules = get_base_adult_rules(gender_norm, profile.age)

    # 4. Pregnancy / Lactation
    if gender_norm == "female":
        apply_pregnancy_lactation_adjustments(rules, profile)

    # 5. Clinical condition adjustments
    if profile.medical_conditions:
        disease_audit = apply_disease_restrictions(rules, profile.medical_conditions)
        messages.extend(disease_audit)

    return (DemographicStatus.SUPPORTED, rules, messages)
