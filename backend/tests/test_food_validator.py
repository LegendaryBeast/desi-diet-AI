"""
Unit and Integration Tests for Food Validator & Normalization (Phase B)
DesiDiet Clinical Planning Pipeline
"""

import pytest
import math
from app.data.food_validator import (
    FoodValidator,
    CanonicalFoodItem,
    NutrientValue,
    MeasurementStatus,
    convert_mass,
    convert_energy,
    load_and_validate_food_database,
    LEGACY_CODE_MAPPINGS,
)


class TestUnitConversions:
    """Explicit unit conversions without magnitude guessing."""

    def test_mass_conversions_exact(self):
        # 1 g = 1000 mg
        assert convert_mass(1.0, "g", "mg") == pytest.approx(1000.0)
        # 1000 mg = 1 g
        assert convert_mass(1000.0, "mg", "g") == pytest.approx(1.0)
        # 1 mg = 1000 mcg
        assert convert_mass(1.0, "mg", "mcg") == pytest.approx(1000.0)
        assert convert_mass(500.0, "ug", "mg") == pytest.approx(0.5)
        assert convert_mass(250.0, "µg", "mg") == pytest.approx(0.25)
        # Round trip
        val = 12.34
        assert convert_mass(convert_mass(val, "mg", "g"), "g", "mg") == pytest.approx(val)

    def test_mass_invalid_units_raise(self):
        with pytest.raises(ValueError, match="Unsupported mass source unit"):
            convert_mass(10.0, "cups", "g")
        with pytest.raises(ValueError, match="Unsupported mass target unit"):
            convert_mass(10.0, "g", "liters")

    def test_energy_conversions_exact(self):
        # 1 kcal = 4.184 kJ
        assert convert_energy(1.0, "kcal", "kj") == pytest.approx(4.184)
        assert convert_energy(4.184, "kj", "kcal") == pytest.approx(1.0)
        # 2000 kcal = 8368 kJ
        assert convert_energy(2000.0, "kcal", "kj") == pytest.approx(8368.0)

    def test_energy_invalid_units_raise(self):
        with pytest.raises(ValueError, match="Unsupported energy source unit"):
            convert_energy(100.0, "watts", "kcal")

    def test_non_finite_rejection(self):
        with pytest.raises(ValueError):
            convert_mass(float("nan"), "g", "mg")
        with pytest.raises(ValueError):
            convert_energy(float("inf"), "kcal", "kj")


class TestNutrientParsingAndStatus:
    """Distinction between measured, trace, and missing."""

    def test_parse_measured_numeric(self):
        nv = FoodValidator.parse_nutrient_cell("15.75", "protcnt")
        assert nv.status == MeasurementStatus.MEASURED
        assert nv.value == 15.75
        assert nv.unit == "g"
        assert nv.is_available() is True
        assert nv.numeric_value() == 15.75

    def test_parse_trace_variants(self):
        for raw in ["Tr", "tr", "TRACE", "Trace", "<0.01"]:
            nv = FoodValidator.parse_nutrient_cell(raw, "fe")
            assert nv.status == MeasurementStatus.TRACE
            assert nv.value == 0.0
            assert nv.unit == "mg"
            assert nv.is_available() is True
            assert nv.numeric_value() == 0.0

    def test_parse_missing_variants(self):
        for raw in [None, float("nan"), "-", "ND", "na", "", "nil"]:
            nv = FoodValidator.parse_nutrient_cell(raw, "vitd")
            assert nv.status == MeasurementStatus.MISSING
            assert nv.value is None
            assert nv.unit == "mcg"
            assert nv.is_available() is False
            assert nv.numeric_value() == 0.0


class TestPlausibilityAndQuarantine:
    """Physical plausibility and quarantine checks."""

    def test_negative_value_is_quarantined(self):
        row = {
            "code": "TEST_001",
            "name": "Invalid Negative Food",
            "lang": "invalid",
            "lang_bn": "অবৈধ",
            "grup": "Vegetables",
            "source": "TEST",
            "water": 80.0,
            "protcnt": -5.0,  # Negative!
            "fatce": 1.0,
            "cho": 10.0,
            "fibtg": 2.0,
            "ash": 1.0,
        }
        item = FoodValidator.validate_food_record(row)
        assert item.is_quarantined is True
        assert any("Negative value for protcnt" in r for r in item.quarantine_reasons)

    def test_impossible_proximate_sum_quarantined(self):
        row = {
            "code": "TEST_002",
            "name": "Superdense Food",
            "lang": "dense",
            "lang_bn": "ঘন খাবার",
            "grup": "Cereals",
            "source": "TEST",
            "water": 50.0,
            "protcnt": 30.0,
            "fatce": 20.0,
            "cho": 40.0,  # Sum without fiber = 50 + 30 + 20 + 40 = 140g per 100g
            "fibtg": 5.0,
            "ash": 2.0,
        }
        item = FoodValidator.validate_food_record(row)
        assert item.is_quarantined is True
        assert any("Physically impossible proximate sum" in r for r in item.quarantine_reasons)

    def test_valid_item_portion_calculation(self):
        # In bd_food_nutrients.csv, mass nutrients are stored in grams (g)
        # fe: 0.003g -> 3.0 mg per 100g
        row = {
            "code": "TEST_003",
            "name": "Healthy Dal",
            "lang": "dal",
            "lang_bn": "ডাল",
            "grup": "Grain Legumes",
            "source": "TEST",
            "enerc_kcal": 100.0,
            "water": 70.0,
            "protcnt": 8.0,
            "fatce": 2.0,
            "cho": 15.0,
            "fibtg": 3.0,
            "ash": 1.5,
            "fe": 0.003,
        }
        item = FoodValidator.validate_food_record(row)
        assert item.is_quarantined is False
        # Calculate for 150g edible portion: (150 * 8.0) / 100 = 12.0g protein
        assert item.get_nutrient_amount("protcnt", 150.0) == pytest.approx(12.0)
        # Iron: 0.003g/100g = 3.0 mg/100g. For 150g portion: (150 * 3.0) / 100 = 4.5 mg
        assert item.get_nutrient_amount("fe", 150.0) == pytest.approx(4.5)
        # Missing nutrient returns None
        assert item.get_nutrient_amount("vitd", 150.0) is None


class TestDatasetValidationIntegration:
    """Integration test against the authoritative bd_food_nutrients.csv."""

    def test_dataset_full_validation(self):
        foods, report = load_and_validate_food_database()
        assert report.total_records == 582
        # Quarantine isolates foods with unit conflicts or extreme outliers
        assert report.valid_records == 525
        assert report.quarantined_records == 57
        assert len(foods) == 582

        # Quarantined foods cannot be used as valid foods
        for item in report.quarantined_items:
            assert foods[item["code"]].is_quarantined is True

        # Check canonical IDs for previously colliding placeholder codes
        assert "01_0045" in foods
        assert foods["01_0045"].name_en == "Barley"
        assert "01_0049" in foods
        assert foods["01_0049"].name_en == "Rice puffed"
        assert "01_0050" in foods
        assert foods["01_0050"].name_en == "Rice parboiled milled"

        # Check disambiguated duplicates
        assert "02_0001" in foods
        assert "02_0017" in foods  # Roasted Bengal gram
        assert "02_0014" in foods
        assert "02_0014_alt" in foods


        # Check zero-tolerance for missing core macronutrients
        for fid in ["01_0045", "02_0001", "01_0050"]:
            item = foods[fid]
            assert item.get_nutrient("protcnt").is_available() is True
            assert item.get_nutrient("enerc_kcal").is_available() is True
