"""
Generate comprehensive food_compatibility.csv and food_pairings.csv
from the full bd_food_nutrients.csv database.

Run from project root:
    python3 backend/scripts/generate_food_csv.py
"""

import csv
import os
from itertools import combinations

SRC = "backend/data/bd_food_nutrients.csv"
OUT_COMPAT = "backend/data/food_compatibility.csv"
OUT_PAIRS = "backend/data/food_pairings.csv"

# ─────────────────────────────────────────────────────────────────────────────
# Group-level rules: (meal_slots, role, pairs_with_groups, score, notes)
# ─────────────────────────────────────────────────────────────────────────────
GROUP_RULES = {
    "Cereals and Millets": (
        "lunch,dinner",
        "staple",
        "Grain Legumes|Animal Meat|Poultry|Marine Fish|Fresh Water Fish and Shellfish|Green Leafy Vegetables|Other Vegetables|Roots and Tubers|Egg and Egg Products|Milk and Milk Products|Spices and Condiments",
        1.0,
        "Core staple. Rice/roti is the base of every Bangladeshi meal. Pairs with almost everything.",
    ),
    "Grain Legumes": (
        "breakfast,lunch,dinner",
        "main",
        "Cereals and Millets|Green Leafy Vegetables|Other Vegetables|Spices and Condiments|Edible Oils and Fats|Roots and Tubers",
        0.95,
        "Dal (lentil curry) is an everyday essential. Served with rice at lunch/dinner; used in breakfast items like dal-ruti.",
    ),
    "Animal Meat": (
        "lunch,dinner",
        "main",
        "Cereals and Millets|Grain Legumes|Other Vegetables|Roots and Tubers|Spices and Condiments|Edible Oils and Fats",
        0.9,
        "Meat curry served with rice. Beef/mutton/goat preferred at lunch or dinner. Not typical at breakfast.",
    ),
    "Poultry": (
        "lunch,dinner",
        "main",
        "Cereals and Millets|Grain Legumes|Other Vegetables|Roots and Tubers|Spices and Condiments|Edible Oils and Fats",
        0.92,
        "Chicken curry is very popular with rice. Suitable for lunch and dinner. Occasionally used in breakfast egg dishes.",
    ),
    "Marine Fish": (
        "lunch,dinner",
        "main",
        "Cereals and Millets|Grain Legumes|Green Leafy Vegetables|Other Vegetables|Roots and Tubers|Spices and Condiments|Edible Oils and Fats",
        0.95,
        "Fish is the heart of Bangladeshi cuisine. Ilish, Rui, Catla etc. served with rice. Pairs with mustard-based gravies.",
    ),
    "Fresh Water Fish and Shellfish": (
        "lunch,dinner",
        "main",
        "Cereals and Millets|Grain Legumes|Green Leafy Vegetables|Other Vegetables|Roots and Tubers|Spices and Condiments",
        0.95,
        "Freshwater fish (Macher Jhol) are everyday protein. Pairs with rice, dal, and vegetables.",
    ),
    "Marine Shellfish": (
        "lunch,dinner",
        "main",
        "Cereals and Millets|Grain Legumes|Other Vegetables|Roots and Tubers|Spices and Condiments",
        0.85,
        "Prawns/shrimp are widely eaten as curry with rice. Also used in vegetable dishes (chingri malaikari, etc.).",
    ),
    "Marine Mollusks": (
        "lunch,dinner",
        "side",
        "Cereals and Millets|Spices and Condiments|Other Vegetables",
        0.7,
        "Clam/octopus are occasional seafood items. Served as side dish with rice.",
    ),
    "Egg and Egg Products": (
        "breakfast,lunch,dinner",
        "main",
        "Cereals and Millets|Grain Legumes|Green Leafy Vegetables|Other Vegetables|Roots and Tubers|Milk and Milk Products|Spices and Condiments",
        1.0,
        "Eggs are universal. Roti+egg at breakfast, rice+egg at any meal. Highly versatile across all meal slots.",
    ),
    "Milk and Milk Products": (
        "breakfast,snack,all",
        "supplementary",
        "Cereals and Millets|Fruits|Nuts and Oil Seeds|Grain Legumes|Egg and Egg Products|Sugars",
        0.95,
        "Milk/dahi/paneer are supplementary with all meals. Doodh-ruti at breakfast; curd with lunch; lassi as snack.",
    ),
    "Green Leafy Vegetables": (
        "lunch,dinner",
        "side",
        "Cereals and Millets|Grain Legumes|Marine Fish|Fresh Water Fish and Shellfish|Other Vegetables|Spices and Condiments|Edible Oils and Fats",
        0.9,
        "Shak (leafy greens) are an essential side with rice. Iron-rich pairings with fish and dal boost nutrition.",
    ),
    "Other Vegetables": (
        "lunch,dinner",
        "side",
        "Cereals and Millets|Grain Legumes|Marine Fish|Fresh Water Fish and Shellfish|Animal Meat|Poultry|Spices and Condiments|Edible Oils and Fats",
        0.88,
        "Vegetable curries (torkari) accompany every meal. Broad pairing range with proteins and staples.",
    ),
    "Roots and Tubers": (
        "lunch,dinner",
        "side",
        "Cereals and Millets|Grain Legumes|Marine Fish|Fresh Water Fish and Shellfish|Green Leafy Vegetables|Spices and Condiments|Edible Oils and Fats",
        0.85,
        "Potato, taro, sweet potato used as curry base or side. Pairs well with fish curries and dal.",
    ),
    "Fruits": (
        "breakfast,snack",
        "supplementary",
        "Milk and Milk Products|Nuts and Oil Seeds|Cereals and Millets|Sugars",
        0.8,
        "Fruits eaten as snack or at breakfast. Not typically mixed with main course. Pairs well with milk/yogurt.",
    ),
    "Nuts and Oil Seeds": (
        "breakfast,snack",
        "supplementary",
        "Milk and Milk Products|Fruits|Cereals and Millets|Sugars",
        0.78,
        "Nuts and seeds used as snack or added to breakfast dishes. Not common in heavy lunch/dinner.",
    ),
    "Spices and Condiments": (
        "breakfast,lunch,dinner,snack",
        "condiment",
        "Cereals and Millets|Grain Legumes|Animal Meat|Poultry|Marine Fish|Fresh Water Fish and Shellfish|Green Leafy Vegetables|Other Vegetables|Roots and Tubers|Egg and Egg Products",
        0.6,
        "Spices are universal flavor agents. Used in all savory dishes across every meal slot.",
    ),
    "Edible Oils and Fats": (
        "breakfast,lunch,dinner",
        "condiment",
        "Cereals and Millets|Grain Legumes|Animal Meat|Poultry|Marine Fish|Fresh Water Fish and Shellfish|Green Leafy Vegetables|Other Vegetables|Roots and Tubers|Egg and Egg Products",
        0.55,
        "Cooking oils used in virtually all preparations. Mustard oil is the signature Bangladeshi cooking fat.",
    ),
    "Sugars": (
        "breakfast,snack",
        "condiment",
        "Cereals and Millets|Milk and Milk Products|Nuts and Oil Seeds|Fruits",
        0.6,
        "Jaggery/sugar used in sweets and sweetened beverages. Not combined with savory mains.",
    ),
    "Mushrooms": (
        "lunch,dinner",
        "side",
        "Cereals and Millets|Grain Legumes|Other Vegetables|Egg and Egg Products|Spices and Condiments",
        0.75,
        "Mushroom curries served with rice at lunch or dinner. Umami-rich pairing with egg or dal.",
    ),
    "Miscellaneous Foods": (
        "snack,breakfast",
        "supplementary",
        "Fruits|Nuts and Oil Seeds|Cereals and Millets",
        0.5,
        "Coconut water, betel, vinegar, etc. Occasional beverages and condiments. Best as a snack or palate cleanser.",
    ),
    "Beverages": (
        "breakfast,snack",
        "supplementary",
        "Cereals and Millets|Milk and Milk Products|Nuts and Oil Seeds",
        0.5,
        "Tea, coffee, soft drinks. Supplementary beverages consumed at breakfast or as snacks.",
    ),
}

# ─────────────────────────────────────────────────────────────────────────────
# Food-specific overrides (food_code -> partial override dict)
# For foods needing more nuanced treatment than group defaults
# ─────────────────────────────────────────────────────────────────────────────
FOOD_OVERRIDES = {
    # Rice variants — primary Bangladeshi staple
    "01_0017": {"meal_slots": "lunch,dinner", "score": 1.0, "notes": "Plain cooked rice (ভাত) — the cornerstone of every Bangladeshi meal. Universal pairing."},
    "01_0018": {"meal_slots": "lunch,dinner", "score": 0.95, "notes": "Biriyani rice — festive preparation. Pairs with raita, salad, and meat."},
    "01_0019": {"meal_slots": "breakfast,snack", "score": 0.95, "notes": "Rice flattened/puffed (chira/muri) — used in breakfast or snack with milk, yogurt, or banana."},
    # Grains/Cereals slot overrides to prevent sweet/snack foods appearing in lunch/dinner
    "01_0001": {"meal_slots": "breakfast,snack", "notes": "Barley — typically used for breakfast porridges or snacks."},
    "01_0002": {"meal_slots": "breakfast,dinner", "score": 0.95, "notes": "Bread/roti — breakfast staple. Pairs with egg, dal, vegetables, and milk."},
    "01_0003": {"meal_slots": "breakfast,dinner", "score": 0.95, "notes": "White bread — breakfast or dinner staple. Pairs with egg, dal, vegetables, and milk."},
    "01_0008": {"meal_slots": "breakfast,snack", "notes": "Pear millet — eaten as breakfast or snack porridge."},
    "01_0009": {"meal_slots": "snack", "role": "supplementary", "notes": "Popcorn — snack item only. Not appropriate for breakfast, lunch, or dinner staples."},
    "01_0010": {"meal_slots": "breakfast,snack", "role": "supplementary", "notes": "Rice flaked (chira) — breakfast or snack item. Often eaten with milk, yogurt, or banana."},
    "01_0011": {"meal_slots": "breakfast,snack", "role": "supplementary", "notes": "Water-soaked chira — breakfast or snack item. Often eaten with milk, yogurt, or banana."},
    "01_0022": {"meal_slots": "breakfast,snack", "role": "supplementary", "notes": "Rice popped (khoi) — breakfast or snack item. Often eaten with milk, yogurt, or banana."},
    "01_0023": {"meal_slots": "breakfast,snack", "role": "supplementary", "notes": "Rice puffed (muri) — breakfast or snack item. Often eaten with milk, yogurt, or banana."},
    "01_0026": {"meal_slots": "breakfast,snack", "role": "supplementary", "notes": "Wheat semolina (suji) — breakfast or snack item. Often prepared as sweet halwa."},
    "01_0027": {"meal_slots": "breakfast,snack", "notes": "Sorghum — breakfast or snack grain."},
    "01_0029": {"meal_slots": "breakfast,snack", "role": "supplementary", "notes": "Wheat vermicelli (semai) — breakfast or snack item. Often prepared as sweet semai."},
    "01_0032": {"meal_slots": "breakfast,dinner", "notes": "Refined wheat flour (mayda) — used to make roti/paratha for breakfast or dinner."},
    "01_0034": {"meal_slots": "snack", "role": "supplementary", "notes": "Sweet biscuit — snack item only."},
    "01_0035": {"meal_slots": "breakfast,lunch,dinner", "notes": "Plain Khichuri — comforting meal suitable for breakfast, lunch, or dinner."},
    "01_0042": {"meal_slots": "breakfast,dinner", "notes": "Roti — standard wheat flatbread. Breakfast or dinner staple. Pairs with egg, dal, vegetables."},
    "A016": {"meal_slots": "breakfast,snack", "role": "supplementary", "notes": "Sweet semai (vermicelli) — breakfast or snack item."},
    "A018": {"meal_slots": "breakfast,dinner", "notes": "Refined wheat flour (mayda) — used for making paratha/roti for breakfast or dinner."},
    "A022": {"meal_slots": "breakfast,snack", "role": "supplementary", "notes": "Wheat semolina (suji) — breakfast or snack item, typically halwa."},
    "A023": {"meal_slots": "breakfast,snack", "role": "supplementary", "notes": "Wheat vermicelli (semai) — breakfast or snack item, typically sweet."},
    "A024": {"meal_slots": "breakfast,snack", "role": "supplementary", "notes": "Wheat vermicelli roasted (semai) — breakfast or snack item, typically sweet."},
    # Ilish (Hilsa) — national fish
    "09_0054": {"meal_slots": "lunch,dinner", "score": 1.0, "notes": "Ilish (Hilsa) — national fish. Sarsha ilish with rice is iconic. Premium pairing."},
    # Mustard oil — key Bangladeshi cooking fat
    "13_0007": {"score": 0.8, "notes": "Mustard oil — the dominant cooking fat in Bangladeshi cuisine. Essential for fish and vegetable curries."},
    # Milk
    "12_0007": {"meal_slots": "breakfast,snack,all", "score": 1.0, "notes": "Cow milk — universal supplement. Doodh-ruti at breakfast; glass of milk at any time."},
    # Dahi/yogurt
    "12_0003": {"meal_slots": "lunch,snack", "score": 0.9, "notes": "Sweetened curd (mishti doi) — iconic Bengali dessert. Pairs with rice or as dessert after meal."},
    # Turmeric
    "07_0011": {"score": 0.7, "notes": "Turmeric — essential spice in almost every Bangladeshi curry. Anti-inflammatory properties."},
    # Green chilli
    "07_0004": {"score": 0.65, "notes": "Green chilli — ubiquitous condiment used raw or cooked in virtually all savory dishes."},
    # Coconut water
    "14_0001": {"meal_slots": "snack,breakfast", "score": 0.7, "notes": "Coconut water (dabar pani) — refreshing natural beverage. Best consumed fresh as a standalone snack."},
    # Banana
    "E020": {"meal_slots": "breakfast,snack,lunch", "score": 0.85, "notes": "Banana (kola) — widely eaten at breakfast with rice flakes or as a snack. Also eaten with rice and ghee."},
    # Potato
    "05_0007": {"meal_slots": "lunch,dinner", "score": 0.95, "notes": "Potato (aloo) — extremely versatile. Used in almost every vegetable curry and fish dish."},
    # Onion
    "03_0066": {"meal_slots": "breakfast,lunch,dinner,snack", "score": 0.7, "notes": "Onion — base aromatics for all savory curries. Used raw in salads and cooked in gravies."},
    # Garlic
    "07_0005": {"score": 0.7, "notes": "Garlic — key aromatic in meat, fish, and vegetable curries. Pairs with ginger and onion."},
    # Ginger
    "07_0007": {"score": 0.7, "notes": "Ginger — essential in fish marinades and meat curries. Pairs with garlic and cumin."},
    # Rui (Rohu fish)
    "S006": {"meal_slots": "lunch,dinner", "score": 0.95, "notes": "Rohu (রুই) — most popular freshwater fish. Classic Macher Jhol with potato and turmeric."},
    # Catla
    "S002": {"meal_slots": "lunch,dinner", "score": 0.92, "notes": "Catla (কাতল) — large carp. Excellent in mustard curry. Pairs with rice and dal."},
    # Chicken
    "N001": {"meal_slots": "lunch,dinner", "score": 0.92, "notes": "Chicken curry (murgi) — everyday protein. Pairs with rice, roti, and dal."},
    "N003": {"meal_slots": "lunch,dinner", "score": 0.92, "notes": "Chicken breast — lean protein. Used in grilled, curry, or biryani preparations."},
    # Beef
    "10_0002": {"meal_slots": "lunch,dinner", "score": 0.88, "notes": "Beef (goru mangsho) — popular at special occasions and Eid. Rich curry served with rice or roti."},
    # Lentils (red/masur)
    "02_0008": {"meal_slots": "breakfast,lunch,dinner", "score": 0.95, "notes": "Red lentil (masur dal) — most popular dal. Everyday protein source. Pairs with rice at every meal."},
    # Spinach
    "04_0026": {"meal_slots": "lunch,dinner", "score": 0.88, "notes": "Spinach (palang shak) — iron-rich green. Excellent paired with rice and small fish."},
    # Sweet potato
    "05_0008": {"meal_slots": "breakfast,snack,lunch", "score": 0.8, "notes": "Sweet potato (mishti aloo) — nutritious root. Used boiled, roasted or in curry. High fiber."},
    # Egg (farmed chicken)
    "11_0001": {"meal_slots": "breakfast,lunch,dinner", "score": 1.0, "notes": "Chicken egg — most versatile protein. Fried, boiled, or scrambled at breakfast; curry at lunch/dinner."},
    # Tea
    "14_0007": {"meal_slots": "breakfast,snack", "score": 0.7, "notes": "Tea (cha) — the national beverage. Pairs with biscuits, roti, and puffed rice as a snack."},
}

# ─────────────────────────────────────────────────────────────────────────────
# Pairing rules: group-to-group with popularity and type
# ─────────────────────────────────────────────────────────────────────────────
PAIRING_RULES = [
    # (group1, group2, popularity, pairing_type, meal_slot)
    ("Cereals and Millets", "Grain Legumes",         3.0, "staple_dal",      "all"),
    ("Cereals and Millets", "Marine Fish",            3.0, "staple_fish",     "lunch_dinner"),
    ("Cereals and Millets", "Fresh Water Fish and Shellfish", 3.0, "staple_fish", "lunch_dinner"),
    ("Cereals and Millets", "Marine Shellfish",       2.5, "staple_fish",     "lunch_dinner"),
    ("Cereals and Millets", "Poultry",                2.8, "staple_curry",    "lunch_dinner"),
    ("Cereals and Millets", "Animal Meat",            2.5, "staple_curry",    "lunch_dinner"),
    ("Cereals and Millets", "Egg and Egg Products",   2.8, "staple_egg",      "all"),
    ("Cereals and Millets", "Green Leafy Vegetables", 2.5, "staple_shak",     "lunch_dinner"),
    ("Cereals and Millets", "Other Vegetables",       2.8, "staple_torkari",  "lunch_dinner"),
    ("Cereals and Millets", "Roots and Tubers",       2.5, "staple_torkari",  "lunch_dinner"),
    ("Cereals and Millets", "Milk and Milk Products", 2.2, "staple_milk",     "breakfast_snack"),
    ("Cereals and Millets", "Spices and Condiments",  2.0, "staple_spice",    "all"),
    ("Cereals and Millets", "Edible Oils and Fats",   1.8, "cooking_fat",     "all"),
    ("Grain Legumes",       "Green Leafy Vegetables", 2.2, "dal_shak",        "lunch_dinner"),
    ("Grain Legumes",       "Other Vegetables",       2.3, "dal_torkari",     "lunch_dinner"),
    ("Grain Legumes",       "Spices and Condiments",  2.0, "dal_spice",       "lunch_dinner"),
    ("Grain Legumes",       "Edible Oils and Fats",   1.8, "cooking_fat",     "lunch_dinner"),
    ("Grain Legumes",       "Egg and Egg Products",   1.8, "protein_boost",   "all"),
    ("Marine Fish",         "Green Leafy Vegetables", 2.3, "fish_shak",       "lunch_dinner"),
    ("Marine Fish",         "Other Vegetables",       2.5, "fish_torkari",    "lunch_dinner"),
    ("Marine Fish",         "Roots and Tubers",       2.4, "fish_aloo",       "lunch_dinner"),
    ("Marine Fish",         "Spices and Condiments",  2.5, "fish_spice",      "lunch_dinner"),
    ("Marine Fish",         "Edible Oils and Fats",   2.0, "cooking_fat",     "lunch_dinner"),
    ("Fresh Water Fish and Shellfish", "Other Vegetables", 2.5, "fish_torkari", "lunch_dinner"),
    ("Fresh Water Fish and Shellfish", "Green Leafy Vegetables", 2.2, "fish_shak", "lunch_dinner"),
    ("Fresh Water Fish and Shellfish", "Roots and Tubers", 2.3, "fish_aloo", "lunch_dinner"),
    ("Fresh Water Fish and Shellfish", "Spices and Condiments", 2.5, "fish_spice", "lunch_dinner"),
    ("Poultry",             "Other Vegetables",       2.3, "chicken_torkari", "lunch_dinner"),
    ("Poultry",             "Roots and Tubers",       2.2, "chicken_aloo",    "lunch_dinner"),
    ("Poultry",             "Spices and Condiments",  2.5, "chicken_spice",   "lunch_dinner"),
    ("Animal Meat",         "Other Vegetables",       2.3, "meat_torkari",    "lunch_dinner"),
    ("Animal Meat",         "Roots and Tubers",       2.2, "meat_aloo",       "lunch_dinner"),
    ("Animal Meat",         "Spices and Condiments",  2.5, "meat_spice",      "lunch_dinner"),
    ("Egg and Egg Products","Green Leafy Vegetables", 2.0, "egg_shak",        "lunch_dinner"),
    ("Egg and Egg Products","Other Vegetables",       2.2, "egg_torkari",     "lunch_dinner"),
    ("Egg and Egg Products","Milk and Milk Products", 2.0, "egg_milk",        "breakfast"),
    ("Egg and Egg Products","Spices and Condiments",  1.8, "egg_spice",       "all"),
    ("Milk and Milk Products","Fruits",               2.0, "milk_fruit",      "breakfast_snack"),
    ("Milk and Milk Products","Nuts and Oil Seeds",   1.8, "milk_nuts",       "breakfast_snack"),
    ("Milk and Milk Products","Sugars",               1.8, "milk_sweet",      "breakfast_snack"),
    ("Fruits",              "Nuts and Oil Seeds",     1.8, "fruit_nuts",      "breakfast_snack"),
    ("Green Leafy Vegetables","Spices and Condiments",2.0, "shak_spice",      "lunch_dinner"),
    ("Green Leafy Vegetables","Edible Oils and Fats", 1.8, "cooking_fat",     "lunch_dinner"),
    ("Other Vegetables",    "Spices and Condiments",  2.2, "torkari_spice",   "lunch_dinner"),
    ("Other Vegetables",    "Edible Oils and Fats",   1.8, "cooking_fat",     "lunch_dinner"),
    ("Roots and Tubers",    "Spices and Condiments",  2.0, "aloo_spice",      "lunch_dinner"),
    ("Mushrooms",           "Egg and Egg Products",   1.8, "mushroom_egg",    "lunch_dinner"),
    ("Mushrooms",           "Spices and Condiments",  2.0, "mushroom_spice",  "lunch_dinner"),
    ("Marine Shellfish",    "Other Vegetables",       2.2, "shrimp_veg",      "lunch_dinner"),
    ("Marine Shellfish",    "Spices and Condiments",  2.3, "shrimp_spice",    "lunch_dinner"),
    ("Beverages",           "Cereals and Millets",    2.0, "tea_snack",       "breakfast_snack"),
    ("Beverages",           "Nuts and Oil Seeds",     1.5, "tea_snack",       "breakfast_snack"),
    ("Sugars",              "Cereals and Millets",    1.8, "sweet_cereal",    "breakfast_snack"),
    ("Sugars",              "Milk and Milk Products", 2.0, "sweet_milk",      "breakfast_snack"),
    ("Spices and Condiments","Edible Oils and Fats",  1.5, "spice_fat",       "all"),
]

# ─────────────────────────────────────────────────────────────────────────────
# Main generation
# ─────────────────────────────────────────────────────────────────────────────

def main():
    with open(SRC, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        foods = list(reader)

    # De-duplicate by code (the CSV has some duplicates)
    seen_codes = set()
    unique_foods = []
    for food in foods:
        code = food["code"].strip()
        if code not in seen_codes:
            seen_codes.add(code)
            unique_foods.append(food)
    foods = unique_foods

    print(f"Loaded {len(foods)} unique foods")

    # ── Build food_compatibility.csv ─────────────────────────────────────────
    compat_rows = []
    for food in foods:
        code = food["code"].strip()
        name_en = food["name"].strip()
        name_bn = food["lang_bn"].strip()
        group = food["grup"].strip()

        if group not in GROUP_RULES:
            print(f"  [WARN] Unknown group '{group}' for {code} — skipping")
            continue

        slots, role, pairs, score, notes = GROUP_RULES[group]

        # Apply food-specific override
        override = FOOD_OVERRIDES.get(code, {})
        slots  = override.get("meal_slots", slots)
        score  = override.get("score", score)
        notes  = override.get("notes", notes)
        role   = override.get("role", role)
        pairs  = override.get("pairs_with_groups", pairs)

        compat_rows.append({
            "food_code": code,
            "food_name_en": name_en,
            "food_name_bn": name_bn,
            "food_group": group,
            "meal_slots": slots,
            "role": role,
            "pairs_with_groups": pairs,
            "compatibility_score": score,
            "notes": notes,
        })

    compat_rows.sort(key=lambda r: (r["food_group"], r["food_code"]))

    with open(OUT_COMPAT, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "food_code","food_name_en","food_name_bn","food_group",
            "meal_slots","role","pairs_with_groups","compatibility_score","notes"
        ])
        writer.writeheader()
        writer.writerows(compat_rows)

    print(f"Written {len(compat_rows)} rows → {OUT_COMPAT}")

    # ── Build food_pairings.csv ──────────────────────────────────────────────
    # Build group → list of codes mapping
    group_codes = {}
    for food in foods:
        g = food["grup"].strip()
        group_codes.setdefault(g, []).append(food["code"].strip())

    pair_rows = []
    seen_pairs = set()

    for g1, g2, popularity, ptype, slot in PAIRING_RULES:
        codes1 = group_codes.get(g1, [])
        codes2 = group_codes.get(g2, [])
        if not codes1 or not codes2:
            continue

        # For very large groups, sample representative foods to keep file manageable
        # but cover the most meaningful pairings
        MAX_PER_GROUP = 8 if len(codes1) > 15 else len(codes1)
        MAX_PER_GROUP2 = 8 if len(codes2) > 15 else len(codes2)

        sampled1 = codes1[:MAX_PER_GROUP]
        sampled2 = codes2[:MAX_PER_GROUP2]

        for c1 in sampled1:
            for c2 in sampled2:
                pair_key = tuple(sorted([c1, c2]))
                if pair_key in seen_pairs:
                    continue
                seen_pairs.add(pair_key)
                pair_rows.append({
                    "food_code_1": c1,
                    "food_code_2": c2,
                    "popularity": popularity,
                    "pairing_type": ptype,
                    "meal_slot": slot,
                })

    with open(OUT_PAIRS, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "food_code_1","food_code_2","popularity","pairing_type","meal_slot"
        ])
        writer.writeheader()
        writer.writerows(pair_rows)

    print(f"Written {len(pair_rows)} pairing rows → {OUT_PAIRS}")


if __name__ == "__main__":
    main()
