"""
Food Data Validator & Normalization Layer (Phase B)
DesiDiet Clinical Planning Pipeline

Strict validation, explicit unit conversions, plausibility checks,
and anomaly quarantine for authoritative Bangladeshi food datasets.
"""

from __future__ import annotations
import math
import os
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union
import pandas as pd
from pydantic import BaseModel, Field


class MeasurementStatus(str, Enum):
    MEASURED = "measured"
    TRACE = "trace"
    MISSING = "missing"
    CALCULATED = "calculated"
    CONFLICTING = "conflicting"


class FoodState(str, Enum):
    RAW = "raw"
    COOKED = "cooked"
    BOILED = "boiled"
    FRIED = "fried"
    ROASTED = "roasted"
    DRIED = "dried"
    PROCESSED = "processed"
    UNKNOWN = "unknown"


# Standard reference units for bd_food_nutrients.csv (source FCT 2014 per 100g edible portion)
# In bd_food_nutrients.csv, all nutrient mass values are stored in GRAMS (g).
# Canonical clinical units are converted explicitly:
# - Minerals (ca, fe, mg, p, k, na, zn, cu) -> mg
# - Micro-vitamins (vita, retol, cartbeq, vitd, folsum) -> mcg (µg)
# - Macro-vitamins (vite, thia, ribf, nia, vitb6c, vitc) -> mg
NUTRIENT_SPECIFICATIONS: Dict[str, Dict[str, Any]] = {
    "enerc_kcal": {"name": "Energy", "source_unit": "kcal", "canonical_unit": "kcal", "category": "energy", "max_plausible": 900.0},
    "water": {"name": "Water / Moisture", "source_unit": "g", "canonical_unit": "g", "category": "macro", "max_plausible": 100.0},
    "protcnt": {"name": "Protein", "source_unit": "g", "canonical_unit": "g", "category": "macro", "max_plausible": 100.0},
    "fatce": {"name": "Total Fat", "source_unit": "g", "canonical_unit": "g", "category": "macro", "max_plausible": 100.0},
    "cho": {"name": "Carbohydrate", "source_unit": "g", "canonical_unit": "g", "category": "macro", "max_plausible": 100.0},
    "fibtg": {"name": "Dietary Fiber", "source_unit": "g", "canonical_unit": "g", "category": "macro", "max_plausible": 100.0},
    "ash": {"name": "Ash", "source_unit": "g", "canonical_unit": "g", "category": "macro", "max_plausible": 100.0},
    "ca": {"name": "Calcium", "source_unit": "g", "canonical_unit": "mg", "category": "mineral", "max_plausible": 10000.0},
    "fe": {"name": "Iron", "source_unit": "g", "canonical_unit": "mg", "category": "mineral", "max_plausible": 500.0},
    "mg": {"name": "Magnesium", "source_unit": "g", "canonical_unit": "mg", "category": "mineral", "max_plausible": 2000.0},
    "p": {"name": "Phosphorus", "source_unit": "g", "canonical_unit": "mg", "category": "mineral", "max_plausible": 5000.0},
    "k": {"name": "Potassium", "source_unit": "g", "canonical_unit": "mg", "category": "mineral", "max_plausible": 10000.0},
    "na": {"name": "Sodium", "source_unit": "g", "canonical_unit": "mg", "category": "mineral", "max_plausible": 40000.0},
    "zn": {"name": "Zinc", "source_unit": "g", "canonical_unit": "mg", "category": "mineral", "max_plausible": 200.0},
    "cu": {"name": "Copper", "source_unit": "g", "canonical_unit": "mg", "category": "mineral", "max_plausible": 50.0},
    "vita": {"name": "Vitamin A (RAE)", "source_unit": "g", "canonical_unit": "mcg", "category": "vitamin", "max_plausible": 50000.0},
    "retol": {"name": "Retinol", "source_unit": "g", "canonical_unit": "mcg", "category": "vitamin", "max_plausible": 50000.0},
    "cartbeq": {"name": "Beta-Carotene Eq", "source_unit": "g", "canonical_unit": "mcg", "category": "vitamin", "max_plausible": 100000.0},
    "vitd": {"name": "Vitamin D", "source_unit": "g", "canonical_unit": "mcg", "category": "vitamin", "max_plausible": 2000.0},
    "vite": {"name": "Vitamin E", "source_unit": "g", "canonical_unit": "mg", "category": "vitamin", "max_plausible": 200.0},
    "thia": {"name": "Thiamine (B1)", "source_unit": "g", "canonical_unit": "mg", "category": "vitamin", "max_plausible": 50.0},
    "ribf": {"name": "Riboflavin (B2)", "source_unit": "g", "canonical_unit": "mg", "category": "vitamin", "max_plausible": 50.0},
    "nia": {"name": "Niacin (B3)", "source_unit": "g", "canonical_unit": "mg", "category": "vitamin", "max_plausible": 200.0},
    "vitb6c": {"name": "Vitamin B6", "source_unit": "g", "canonical_unit": "mg", "category": "vitamin", "max_plausible": 50.0},
    "folsum": {"name": "Folates (B9)", "source_unit": "g", "canonical_unit": "mcg", "category": "vitamin", "max_plausible": 5000.0},
    "vitc": {"name": "Vitamin C", "source_unit": "g", "canonical_unit": "mg", "category": "vitamin", "max_plausible": 5000.0},
}


# Legacy code mappings
LEGACY_CODE_MAPPINGS: Dict[str, str] = {
    # 6 cereal foods with placeholder code 'code' mapped to canonical 01_xxxx codes
    "code_Barley": "01_0045",
    "code_Maize dry": "01_0046",
    "code_Maize tender local": "01_0047",
    "code_Maize tender sweet": "01_0048",
    "code_Rice puffed": "01_0049",
    "code_Rice parboiled milled": "01_0050",
    # Duplicate FCT 2014 codes
    "02_0001_bhaja": "02_0017",
    "02_0014_alt": "02_0014_alt",
}


def convert_mass(value: float, from_unit: str, to_unit: str) -> float:
    """
    Explicit dimensional mass conversion.
    Strictly forbids magnitude-based guessing.
    Supports: g, mg, mcg / µg, kg.
    """
    if math.isnan(value) or math.isinf(value):
        raise ValueError(f"Cannot convert non-finite mass value: {value}")

    norm_from = from_unit.strip().lower()
    norm_to = to_unit.strip().lower()

    if norm_from in ("mcg", "ug", "µg"):
        factor_to_g = 1e-6
    elif norm_from == "mg":
        factor_to_g = 1e-3
    elif norm_from == "g":
        factor_to_g = 1.0
    elif norm_from == "kg":
        factor_to_g = 1000.0
    else:
        raise ValueError(f"Unsupported mass source unit: '{from_unit}'")

    if norm_to in ("mcg", "ug", "µg"):
        factor_from_g = 1e6
    elif norm_to == "mg":
        factor_from_g = 1e3
    elif norm_to == "g":
        factor_from_g = 1.0
    elif norm_to == "kg":
        factor_from_g = 1e-3
    else:
        raise ValueError(f"Unsupported mass target unit: '{to_unit}'")

    return value * factor_to_g * factor_from_g


def convert_energy(value: float, from_unit: str, to_unit: str) -> float:
    """
    Explicit energy conversion.
    Supports: kcal, kj, j, cal.
    Standard: 1 kcal = 4.184 kJ.
    """
    if math.isnan(value) or math.isinf(value):
        raise ValueError(f"Cannot convert non-finite energy value: {value}")

    norm_from = from_unit.strip().lower()
    norm_to = to_unit.strip().lower()

    if norm_from == "kcal":
        val_kcal = value
    elif norm_from == "kj":
        val_kcal = value / 4.184
    elif norm_from == "j":
        val_kcal = (value / 1000.0) / 4.184
    elif norm_from == "cal":
        val_kcal = value / 1000.0
    else:
        raise ValueError(f"Unsupported energy source unit: '{from_unit}'")

    if norm_to == "kcal":
        return val_kcal
    elif norm_to == "kj":
        return val_kcal * 4.184
    elif norm_to == "j":
        return val_kcal * 4.184 * 1000.0
    elif norm_to == "cal":
        return val_kcal * 1000.0
    else:
        raise ValueError(f"Unsupported energy target unit: '{to_unit}'")


def infer_food_state(name: str) -> FoodState:
    """Infers food preparation state from food name descriptors."""
    lower = name.lower()
    if "boiled" in lower:
        return FoodState.BOILED
    elif "fried" in lower or "bhaja" in lower:
        return FoodState.FRIED
    elif "roasted" in lower or "roasted" in lower:
        return FoodState.ROASTED
    elif "dried" in lower or "shukna" in lower:
        return FoodState.DRIED
    elif "cooked" in lower or "ranna" in lower:
        return FoodState.COOKED
    elif "raw" in lower:
        return FoodState.RAW
    elif "puffed" in lower or "milled" in lower:
        return FoodState.PROCESSED
    return FoodState.UNKNOWN


class NutrientValue(BaseModel):
    """
    Individual nutrient record with explicit unit, measurement status,
    and original representation.
    """
    nutrient_key: str
    value: Optional[float] = None
    unit: str
    status: MeasurementStatus
    original_str: Optional[str] = None

    def is_available(self) -> bool:
        return self.status in (MeasurementStatus.MEASURED, MeasurementStatus.TRACE, MeasurementStatus.CALCULATED)

    def numeric_value(self) -> float:
        """Returns numeric value for calculation. Trace is treated as 0.0 with status preserved."""
        if self.value is None or self.status == MeasurementStatus.MISSING:
            return 0.0
        return self.value


class CanonicalFoodItem(BaseModel):
    """
    Canonical food model representing a verified, standardized food item.
    """
    canonical_id: str
    legacy_code: Optional[str] = None
    name_en: str
    name_bn: str
    name_original: str
    food_group: str
    source: str
    food_state: FoodState = FoodState.RAW
    edible_factor: float = 1.0  # Fraction of food that is edible
    reference_mass_g: float = 100.0  # Composition is per 100g edible portion
    nutrients: Dict[str, NutrientValue] = Field(default_factory=dict)
    is_quarantined: bool = False
    quarantine_reasons: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

    def get_nutrient(self, key: str) -> Optional[NutrientValue]:
        return self.nutrients.get(key)

    def get_nutrient_amount(self, key: str, edible_grams: float) -> Optional[float]:
        """
        Calculate nutrient amount for a specific edible portion in grams:
        nutrient_total = edible_grams * nutrient_per_100g / 100.0
        Returns None if the nutrient is missing in the database.
        """
        nv = self.nutrients.get(key)
        if nv is None or not nv.is_available() or nv.value is None:
            return None
        return (edible_grams * nv.value) / self.reference_mass_g


@dataclass
class ValidationReport:
    """Summary metrics of dataset validation and anomaly quarantine."""
    total_records: int = 0
    valid_records: int = 0
    quarantined_records: int = 0
    quarantined_items: List[Dict[str, Any]] = field(default_factory=list)
    warnings: List[Dict[str, Any]] = field(default_factory=list)
    missingness_by_nutrient: Dict[str, float] = field(default_factory=dict)
    food_groups: Dict[str, int] = field(default_factory=dict)


class FoodValidator:
    """
    Validation engine for raw food nutrient data records.
    Enforces physical invariants, detects anomalies, and manages quarantine.
    """

    @staticmethod
    def parse_nutrient_cell(raw_val: Any, nutrient_key: str) -> NutrientValue:
        """
        Parses a cell value into a NutrientValue, distinguishing:
        - Measured numeric value (e.g. 12.5)
        - Trace value (e.g. 'Tr', 'trace', '<0.1')
        - Missing value (e.g. NaN, None, '-', 'ND', 'na', '')
        """
        spec = NUTRIENT_SPECIFICATIONS.get(nutrient_key, {"canonical_unit": "g"})
        canonical_unit = spec["canonical_unit"]

        if raw_val is None or (isinstance(raw_val, float) and (math.isnan(raw_val) or math.isinf(raw_val))):
            return NutrientValue(
                nutrient_key=nutrient_key,
                value=None,
                unit=canonical_unit,
                status=MeasurementStatus.MISSING,
                original_str=str(raw_val),
            )

        str_val = str(raw_val).strip()

        if not str_val or str_val.lower() in ("nan", "none", "-", "nd", "na", "null", "nil"):
            return NutrientValue(
                nutrient_key=nutrient_key,
                value=None,
                unit=canonical_unit,
                status=MeasurementStatus.MISSING,
                original_str=str_val,
            )

        # Check for Trace
        if str_val.lower() in ("tr", "trace") or str_val.startswith("<"):
            return NutrientValue(
                nutrient_key=nutrient_key,
                value=0.0,
                unit=canonical_unit,
                status=MeasurementStatus.TRACE,
                original_str=str_val,
            )

        try:
            val_float = float(str_val)
            source_unit = spec.get("source_unit", canonical_unit)
            if source_unit != canonical_unit:
                canonical_val = convert_mass(val_float, from_unit=source_unit, to_unit=canonical_unit)
            else:
                canonical_val = val_float

            return NutrientValue(
                nutrient_key=nutrient_key,
                value=round(canonical_val, 4),
                unit=canonical_unit,
                status=MeasurementStatus.MEASURED,
                original_str=str_val,
            )
        except ValueError:

            return NutrientValue(
                nutrient_key=nutrient_key,
                value=None,
                unit=canonical_unit,
                status=MeasurementStatus.MISSING,
                original_str=str_val,
            )

    @classmethod
    def validate_food_record(cls, row_dict: Dict[str, Any]) -> CanonicalFoodItem:
        """
        Validates a single food record, checking:
        1. Non-negative nutrient values.
        2. Macronutrient mass plausibility (sum <= 105.0g per 100g).
        3. Micronutrient maximum plausible thresholds.
        4. Energy calculation consistency (Atwater check).
        """
        canonical_id = str(row_dict.get("code", "")).strip()
        legacy_code = canonical_id
        name_en = str(row_dict.get("name", "")).strip()
        name_bn = str(row_dict.get("lang_bn", "")).strip()
        name_orig = str(row_dict.get("lang", "")).strip()
        food_group = str(row_dict.get("grup", "")).strip()
        source = str(row_dict.get("source", "")).strip()

        food_state = infer_food_state(name_en + " " + name_orig)

        nutrients: Dict[str, NutrientValue] = {}
        quarantine_reasons: List[str] = []
        warnings: List[str] = []

        for nut_key in NUTRIENT_SPECIFICATIONS.keys():
            if nut_key in row_dict:
                nutrients[nut_key] = cls.parse_nutrient_cell(row_dict[nut_key], nut_key)
            else:
                nutrients[nut_key] = NutrientValue(
                    nutrient_key=nut_key,
                    value=None,
                    unit=NUTRIENT_SPECIFICATIONS[nut_key]["canonical_unit"],
                    status=MeasurementStatus.MISSING,
                )

        # 1. Non-negativity check
        for nut_key, nv in nutrients.items():
            if nv.value is not None and nv.value < 0:
                quarantine_reasons.append(f"Negative value for {nut_key}: {nv.value}")

        # 2. Maximum plausible threshold checks
        for nut_key, nv in nutrients.items():
            if nv.value is not None:
                max_plausible = NUTRIENT_SPECIFICATIONS[nut_key].get("max_plausible")
                if max_plausible and nv.value > max_plausible:
                    # Special check: salt can have high sodium
                    if nut_key == "na" and ("salt" in name_en.lower() or "salt" in name_orig.lower()):
                        pass
                    else:
                        quarantine_reasons.append(
                            f"Nutrient {nut_key} value {nv.value} exceeds physical bound {max_plausible}"
                        )

        # 3. Macronutrient sum plausibility
        # Standard food composition tables report CHO either as:
        # (a) Available carbohydrate (choavldf), where proximate sum includes fiber: W + P + F + C + Fib + A ~ 100g
        # (b) Total carbohydrate by difference, which already includes fiber: W + P + F + C + A ~ 100g
        macro_components_no_fib = ["water", "protcnt", "fatce", "cho", "ash"]
        macro_sum_no_fib = sum(nutrients[k].value for k in macro_components_no_fib if nutrients[k].value is not None)
        fib_val = nutrients["fibtg"].value or 0.0
        macro_sum_with_fib = macro_sum_no_fib + fib_val

        # If even without fiber the sum exceeds 105g, it is physically impossible
        if macro_sum_no_fib > 105.0:
            quarantine_reasons.append(
                f"Physically impossible proximate sum (without fiber): {macro_sum_no_fib:.2f}g per 100g (must be <= 105g)"
            )
        elif macro_sum_with_fib > 105.0:
            # Stored CHO is Total Carbohydrate inclusive of fiber; note warning
            warnings.append(
                f"CHO appears to be Total Carbohydrate inclusive of fiber: sum with fiber is {macro_sum_with_fib:.2f}g, sum without fiber is {macro_sum_no_fib:.2f}g"
            )


        # 4. Energy plausibility (Atwater estimation comparison)
        p = nutrients["protcnt"].value or 0.0
        f = nutrients["fatce"].value or 0.0
        c = nutrients["cho"].value or 0.0
        fib = nutrients["fibtg"].value or 0.0
        enerc = nutrients["enerc_kcal"].value

        if enerc is not None and enerc > 0 and (p > 0 or f > 0 or c > 0):
            # General Atwater factor: 4 * P + 9 * F + 4 * C + 2 * Fiber
            calc_energy = (4.0 * p) + (9.0 * f) + (4.0 * c) + (2.0 * fib)
            diff = abs(enerc - calc_energy)
            # Flag if absolute difference exceeds 60 kcal and relative diff exceeds 35%
            if diff > 60.0 and (diff / enerc) > 0.35:
                warnings.append(
                    f"Energy discrepancy: stated {enerc} kcal vs Atwater calculated {calc_energy:.1f} kcal (diff {diff:.1f} kcal)"
                )

        is_quarantined = len(quarantine_reasons) > 0

        return CanonicalFoodItem(
            canonical_id=canonical_id,
            legacy_code=legacy_code,
            name_en=name_en,
            name_bn=name_bn,
            name_original=name_orig,
            food_group=food_group,
            source=source,
            food_state=food_state,
            edible_factor=1.0,
            reference_mass_g=100.0,
            nutrients=nutrients,
            is_quarantined=is_quarantined,
            quarantine_reasons=quarantine_reasons,
            warnings=warnings,
        )


def load_and_validate_food_database(
    csv_path: Optional[str] = None,
) -> Tuple[Dict[str, CanonicalFoodItem], ValidationReport]:
    """
    Loads and validates the authoritative food dataset.
    Returns:
      (food_dict: Dict[canonical_id, CanonicalFoodItem], report: ValidationReport)
    """
    if csv_path is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        csv_path = os.path.join(base_dir, "data", "bd_food_nutrients.csv")

    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Authoritative food dataset not found at {csv_path}")

    df = pd.read_csv(csv_path)
    report = ValidationReport()
    report.total_records = len(df)

    food_dict: Dict[str, CanonicalFoodItem] = {}
    missing_counts: Dict[str, int] = {k: 0 for k in NUTRIENT_SPECIFICATIONS.keys()}

    for _, row in df.iterrows():
        row_dict = row.to_dict()
        food_item = FoodValidator.validate_food_record(row_dict)

        # Track food groups
        grp = food_item.food_group or "Unknown"
        report.food_groups[grp] = report.food_groups.get(grp, 0) + 1

        # Track missingness
        for k in NUTRIENT_SPECIFICATIONS.keys():
            nv = food_item.nutrients.get(k)
            if nv is None or nv.status == MeasurementStatus.MISSING:
                missing_counts[k] += 1

        if food_item.is_quarantined:
            report.quarantined_records += 1
            report.quarantined_items.append({
                "code": food_item.canonical_id,
                "name": food_item.name_en,
                "reasons": food_item.quarantine_reasons,
            })
        else:
            report.valid_records += 1

        if food_item.warnings:
            report.warnings.append({
                "code": food_item.canonical_id,
                "name": food_item.name_en,
                "warnings": food_item.warnings,
            })

        food_dict[food_item.canonical_id] = food_item

    # Compute missingness percentages
    if report.total_records > 0:
        report.missingness_by_nutrient = {
            k: round((missing_counts[k] / report.total_records) * 100.0, 2)
            for k in NUTRIENT_SPECIFICATIONS.keys()
        }

    return food_dict, report
