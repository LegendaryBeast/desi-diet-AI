"""
test_portion_mapping.py
Unit tests verifying pure quantifiable household measurements (ছোট ১ বাটি, ১ কাপ, ২টি, ইত্যাদি)
without food name redundancy.
"""

import pytest
from app.utils_portion import compute_household_measure, attach_household_measurements, to_bn_digits


def test_to_bn_digits():
    assert to_bn_digits(0) == "০"
    assert to_bn_digits(150) == "১৫০"
    assert to_bn_digits(1.5) == "১.৫"
    assert to_bn_digits("100") == "১০০"


def test_rice_portions():
    # 1/2 cup
    p1 = compute_household_measure("সাদা ভাত", "White Rice", "Cereals", 80)
    assert p1["household_measure_bn"] == "১/২ কাপ"
    assert p1["household_measure_en"] == "1/2 cup"
    assert p1["portion_bn"] == "১/২ কাপ (৮০ গ্রাম)"

    # 1 cup
    p2 = compute_household_measure("ভাত", "Cooked Rice", "Cereals", 130)
    assert p2["household_measure_bn"] == "১ কাপ"
    assert p2["household_measure_en"] == "1 cup"
    assert p2["portion_bn"] == "১ কাপ (১৩০ গ্রাম)"

    # 1 medium bowl
    p3 = compute_household_measure("ভাত", "Rice", "Cereals", 170)
    assert p3["household_measure_bn"] == "মাঝারি ১ বাটি"
    assert p3["household_measure_en"] == "1 medium bowl"

    # 1 large bowl
    p4 = compute_household_measure("ভাত", "Rice", "Cereals", 220)
    assert p4["household_measure_bn"] == "বড় ১ বাটি"
    assert p4["household_measure_en"] == "1 large bowl"


def test_roti_portions():
    # 1 roti
    p1 = compute_household_measure("লাল আটার রুটি", "Atta Roti", "Cereals", 35)
    assert p1["household_measure_bn"] == "১টি"
    assert p1["household_measure_en"] == "1 pc"

    # 2 rotis
    p2 = compute_household_measure("রুটি", "Whole Wheat Roti", "Cereals", 70)
    assert p2["household_measure_bn"] == "২টি"
    assert p2["household_measure_en"] == "2 pcs"

    # 3 rotis
    p3 = compute_household_measure("রুটি", "Roti", "Cereals", 105)
    assert p3["household_measure_bn"] == "৩টি"
    assert p3["household_measure_en"] == "3 pcs"


def test_egg_portions():
    # 1 boiled egg
    p1 = compute_household_measure("সিদ্ধ ডিম", "Boiled Egg", "Eggs", 50)
    assert p1["household_measure_bn"] == "১টি"
    assert p1["household_measure_en"] == "1 pc"

    # 2 eggs
    p2 = compute_household_measure("মুরগির ডিম", "Hen Egg", "Eggs", 100)
    assert p2["household_measure_bn"] == "২টি"
    assert p2["household_measure_en"] == "2 pcs"

    # egg whites
    p3 = compute_household_measure("ডিমের সাদা অংশ", "Egg white", "Eggs", 65)
    assert p3["household_measure_bn"] == "২টি (সাদা অংশ)"


def test_fish_portions():
    # 1 piece
    p1 = compute_household_measure("রুই মাছ", "Rohu Fish", "Fish & Seafood", 60)
    assert p1["household_measure_bn"] == "মাঝারি ১ টুকরা"
    assert p1["household_measure_en"] == "1 medium piece"

    # 2 pieces
    p2 = compute_household_measure("কাতলা মাছের পেটি", "Katla Fish", "Fish & Seafood", 120)
    assert p2["household_measure_bn"] == "২ টুকরা"
    assert p2["household_measure_en"] == "2 pieces"

    # Small fish
    p3 = compute_household_measure("কাঁচকি ছোট মাছের চচ্চড়ি", "Kachki Small Fish", "Fish & Seafood", 70)
    assert p3["household_measure_bn"] == "ছোট ১ বাটি"


def test_meat_and_dairy_distinction():
    # Chicken
    p1 = compute_household_measure("চামড়াহীন মুরগির মাংস", "Chicken Meat", "Poultry", 80)
    assert p1["household_measure_bn"] == "১-২ টুকরা"

    # Cow Milk must NOT be classified as meat
    p2 = compute_household_measure("গরুর খাঁটি দুধ", "Pure Cow Milk", "Milk & Dairy", 200)
    assert p2["household_measure_bn"] == "১ গ্লাস"
    assert "মিলি" in p2["portion_bn"]

    # Curd / Yogurt
    p3 = compute_household_measure("টক দই", "Sour Curd / Plain Yogurt", "Milk & Dairy", 150)
    assert p3["household_measure_bn"] == "১ কাপ"


def test_dal_and_vegetable_portions():
    # Dal -> "ছোট ১ বাটি"
    p1 = compute_household_measure("ঘন মসুর ডাল", "Thick Red Lentil Dal", "Pulses & Legumes", 120)
    assert p1["household_measure_bn"] == "ছোট ১ বাটি"
    assert p1["portion_bn"] == "ছোট ১ বাটি (১২০ গ্রাম)"

    # Leafy greens -> "ছোট ১ বাটি"
    p2 = compute_household_measure("পালং শাক ভাজি", "Spinach Bhaji", "Leafy Vegetables", 80)
    assert p2["household_measure_bn"] == "ছোট ১ বাটি"

    # Mixed veg -> "মাঝারি ১ বাটি"
    p3 = compute_household_measure("মিক্সড সবজি", "Mixed Vegetables", "Vegetables", 160)
    assert p3["household_measure_bn"] == "মাঝারি ১ বাটি"


def test_attach_household_measurements_full_plan():
    plan = {
        "meals": [
            {
                "slot": "breakfast",
                "items": [
                    {"name_bn": "লাল আটার রুটি", "name_en": "Atta Roti", "amount_g": 70, "calories": 180},
                    {"name_bn": "সিদ্ধ ডিম", "name_en": "Boiled Egg", "amount_g": 50, "calories": 75},
                    {"name_bn": "সবজি ভাজি", "name_en": "Vegetable Fry", "amount_g": 100, "calories": 60}
                ]
            },
            {
                "slot": "lunch",
                "items": [
                    {"name_bn": "ভাত", "name_en": "Cooked Rice", "amount_g": 130, "calories": 170},
                    {"name_bn": "রুই মাছ ভুনা", "name_en": "Rohu Fish Curry", "amount_g": 60, "calories": 120},
                    {"name_bn": "মসুর ডাল", "name_en": "Lentil Dal", "amount_g": 120, "calories": 110}
                ]
            }
        ]
    }

    attach_household_measurements(plan)

    # Check Breakfast items
    bfast_items = plan["meals"][0]["items"]
    assert bfast_items[0]["household_measure_bn"] == "২টি"
    assert "২টি (৭০ গ্রাম)" in bfast_items[0]["portion_bn"]

    assert bfast_items[1]["household_measure_bn"] == "১টি"
    assert "১টি (৫০ গ্রাম)" in bfast_items[1]["portion_bn"]

    assert bfast_items[2]["household_measure_bn"] == "ছোট ১ বাটি"
    assert "ছোট ১ বাটি (১০০ গ্রাম)" in bfast_items[2]["portion_bn"]

    # Check Lunch items
    lunch_items = plan["meals"][1]["items"]
    assert lunch_items[0]["household_measure_bn"] == "১ কাপ"
    assert "১ কাপ (১৩০ গ্রাম)" in lunch_items[0]["portion_bn"]

    assert lunch_items[1]["household_measure_bn"] == "মাঝারি ১ টুকরা"
    assert "মাঝারি ১ টুকরা (৬০ গ্রাম)" in lunch_items[1]["portion_bn"]

    assert lunch_items[2]["household_measure_bn"] == "ছোট ১ বাটি"
    assert "ছোট ১ বাটি (১২০ গ্রাম)" in lunch_items[2]["portion_bn"]
