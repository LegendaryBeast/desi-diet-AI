"""
merge_food_databases.py
=======================
Merges the new FCT CSV (authoritative, accurate nutrients) with the old
BD_food_details.csv (additional foods + food-group metadata).

Rules:
  - New CSV is the base. Its nutritional values ALWAYS win on duplicates.
  - Foods only in Old CSV are appended, keeping their original columns.
  - Food group for New CSV rows is inferred from code prefix (auto-matched to
    closest existing group name in the old dataset).
  - For New CSV rows, lang (local/Banglish name) is set to lang_bn (Bengali name).
  - A 'source' column is added to every row for full traceability:
      'FCT_2014'    → from the new FCT Bangladesh PDF extraction
      'BD_original' → from the original BD_food_details.csv dataset
      'FCT_2014+BD' → FCT nutrition but enriched with BD metadata (fuzzy match)
  - ALL nutrient values are stored in GRAMS (same unit as old CSV).
    New CSV minerals (mg) are divided ÷1000; vitamins/minerals in mcg ÷1,000,000.
    migrate_to_graph.py applies ×1000 to convert g→mg for Neo4j (unchanged).

Output: backend/data/bd_food_nutrients.csv  (ready for migrate_to_graph.py)
"""

import csv
import os
import re
from difflib import SequenceMatcher
from collections import Counter

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEW_CSV  = os.path.join(BASE_DIR, "..", "food_nutritional_data_master_final - food_nutritional_data_master.csv")
OLD_CSV  = os.path.join(BASE_DIR, "data", "BD_food_details.csv")
OUT_CSV  = os.path.join(BASE_DIR, "data", "bd_food_nutrients.csv")

# ── Code Prefix → Food Group (verified against actual data samples) ─────────
# These were confirmed by inspecting real food names under each prefix code.
FOOD_GROUP_MAP = {
    "01": "Cereals and Millets",        # Barley, Rice, Bread, Biscuit, Maize...
    "02": "Grain Legumes",              # Bengal gram, Black gram, Lentils, Soybean...
    "03": "Other Vegetables",           # Amaranth stem, Beans, Beetroot, Bitter gourd...
    "04": "Green Leafy Vegetables",     # Agathi, Amaranth leaves, Basella, Curry leaf...
    "05": "Roots and Tubers",           # Colocasia/Taro, Sweet potato, Yam...
    "06": "Nuts and Oil Seeds",         # Sunflower seeds, Cashew, Coconut milk, Sesame...
    "07": "Spices and Condiments",      # Bay leaf, Cardamom, Chilli dry, Cinnamon...
    "09": "Marine Fish",                # Anchovy, Bombay duck, Catfish, Hilsa, Rohu...
    "10": "Animal Meat",                # Beef, Goat, Mutton...
    "11": "Egg and Egg Products",       # Chicken egg (farmed/native, raw/boiled)...
    "12": "Milk and Milk Products",     # Buttermilk, Cheese, Curd, Milk...
    "13": "Edible Oils and Fats",       # Butter, Cottonseed oil, Ghee, Fish oil...
    "14": "Beverages",                  # Coconut water, Coffee, Soft drinks, Tea...
    "15": "Miscellaneous Foods",        # Baking powder, Betel leaves, Honey, Jaggery...
}

# Canonical group names from old dataset — used for best-match fallback
OLD_GROUPS = [
    "Cereals and Millets", "Grain Legumes", "Other Vegetables",
    "Green Leafy Vegetables", "Roots and Tubers", "Nuts and Oil Seeds",
    "Spices and Condiments", "Marine Fish", "Fresh Water Fish and Shellfish",
    "Marine Shellfish", "Marine Mollusks", "Animal Meat", "Poultry",
    "Egg and Egg Products", "Milk and Milk Products", "Edible Oils and Fats",
    "Fruits", "Mushrooms", "Sugars", "Miscellaneous Foods",
]

# ── Output columns ──────────────────────────────────────────────────────────
# 'source' tracks data provenance for every row.
# All nutrient values (ca, fe, mg, vita...) are stored in GRAMS per 100g,
# matching the old BD_food_details.csv convention.
OUTPUT_COLS = [
    "source",                   # ← provenance column
    "code", "name", "lang", "lang_bn", "grup",
    "enerc_kcal",               # energy in kcal (parsed directly, no conversion)
    "water", "protcnt", "fatce", "cho", "fibtg", "ash",
    # Nutrients in GRAMS per 100g food (migrate_to_graph.py converts ×1000 → mg)
    "ca", "fe", "mg", "p", "k", "na", "zn", "cu",
    "vita", "retol", "cartbeq", "vitd", "vite",
    "thia", "ribf", "nia", "vitb6c", "folsum", "vitc",
]

# ── New CSV: which columns are in mg vs mcg (need unit→gram conversion) ────
# mg  fields: divide ÷ 1000    to get grams
# mcg fields: divide ÷ 1000000 to get grams
NEW_MINERAL_MG_COLS   = {"ca", "fe", "mg", "p", "k", "na", "zn", "cu",
                          "vite", "thia", "ribf", "nia", "vitb6c", "vitc"}
NEW_VITAMIN_MCG_COLS  = {"vita", "retol", "cartbeq", "vitd", "folsum"}

# ── New CSV column → internal name mapping ──────────────────────────────────
NEW_COL_MAP = {
    "Code":                            "code",
    "Food name in English":            "name",
    "Food name in Bengali":            "lang_bn",
    "Energy (kcal) kJ":               "enerc_kcal",   # special parsing
    "Water (g)":                       "water",
    "Protein (g)":                     "protcnt",
    "Fat (g)":                         "fatce",
    "Carbohydrate available (g)":      "cho",
    "Total dietary fibre (g)":         "fibtg",
    "Ash (g)":                         "ash",
    "Ca (mg)":                         "ca",
    "Fe (mg)":                         "fe",
    "Mg (mg)":                         "mg",
    "P (mg)":                          "p",
    "K (mg)":                          "k",
    "Na (mg)":                         "na",
    "Zn (mg)":                         "zn",
    "Cu (mg)":                         "cu",
    "Vitamin A (mcg)":                 "vita",
    "Retinol (mcg)":                   "retol",
    "Beta-carotene equivalents (mcg)": "cartbeq",
    "Vitamin D (mcg)":                 "vitd",
    "Vitamin E (mg)":                  "vite",
    "Thiamin (mg)":                    "thia",
    "Riboflavin (mg)":                 "ribf",
    "Niacin equivalents (mg)":         "nia",
    "Vitamin B6 (mg)":                 "vitb6c",
    "Folate (mcg)":                    "folsum",
    "Vitamin C (mg)":                  "vitc",
}

# ── Old CSV column → internal name mapping ──────────────────────────────────
OLD_COL_MAP = {
    "code":    "code",
    "name":    "name",
    "lang":    "lang",
    "lang_bn": "lang_bn",
    "grup":    "grup",
    "enerc":   "_enerc_kj",   # kJ → kcal conversion (handled below)
    "water":   "water",
    "protcnt": "protcnt",
    "fatce":   "fatce",
    "cho":     "cho",
    "fibtg":   "fibtg",
    "ash":     "ash",
    # All stored in grams — pass through unchanged
    "ca":      "ca",  "fe":     "fe",  "mg":     "mg",
    "p":       "p",   "k":      "k",   "na":     "na",
    "zn":      "zn",  "cu":     "cu",
    "vita":    "vita",   "retol":   "retol",  "cartbeq": "cartbeq",
    "vitd":    "vitd",   "vite":    "vite",
    "thia":    "thia",   "ribf":    "ribf",   "nia":     "nia",
    "vitb6c":  "vitb6c", "folsum":  "folsum", "vitc":    "vitc",
}


# ── Helper functions ─────────────────────────────────────────────────────────

def parse_energy_kcal(raw: str) -> str:
    """Parse '(324) 1360' → '324' (kcal). Falls back to kJ÷4.184."""
    raw = raw.strip()
    m = re.match(r'\(([0-9.]+)\)', raw)
    if m:
        return m.group(1)
    try:
        return str(round(float(raw) / 4.184, 1))
    except ValueError:
        return ""


def to_grams(val_str: str, col_internal: str) -> str:
    """
    Convert a new-CSV nutrient value to grams (the canonical storage unit).
      mg  fields  → divide ÷ 1000
      mcg fields  → divide ÷ 1000000
    Returns empty string for zero / unparseable values.
    """
    try:
        v = float(val_str.replace(',', '').strip())
    except (ValueError, AttributeError):
        return ""
    if v == 0:
        return ""
    if col_internal in NEW_MINERAL_MG_COLS:
        return str(round(v / 1000.0, 8))
    if col_internal in NEW_VITAMIN_MCG_COLS:
        return str(round(v / 1_000_000.0, 10))
    return str(v)   # already grams (water, macros, etc.)


def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def best_group_match(inferred: str) -> str:
    """Return closest canonical old-dataset group name to the inferred group."""
    best, best_score = inferred, 0.0
    for g in OLD_GROUPS:
        s = similarity(inferred, g)
        if s > best_score:
            best_score, best = s, g
    return best if best_score > 0.5 else inferred


def infer_group_from_code(code: str) -> str:
    prefix = code.split("_")[0] if "_" in code else ""
    raw = FOOD_GROUP_MAP.get(prefix, "Miscellaneous Foods")
    return best_group_match(raw)


# ── Loaders ──────────────────────────────────────────────────────────────────

def load_new_csv(path: str) -> list[dict]:
    rows = []
    with open(path, newline='', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            rec = {col: "" for col in OUTPUT_COLS}
            for new_col, internal in NEW_COL_MAP.items():
                raw = row.get(new_col, "").strip()
                if internal == "enerc_kcal":
                    rec["enerc_kcal"] = parse_energy_kcal(raw)
                elif internal in NEW_MINERAL_MG_COLS | NEW_VITAMIN_MCG_COLS:
                    rec[internal] = to_grams(raw, internal)
                else:
                    rec[internal] = raw

            code = rec["code"].strip()
            rec["grup"]   = infer_group_from_code(code)
            # Use Bengali name as the local/Banglish name for new CSV rows
            rec["lang"]   = rec.get("lang_bn", "")
            rec["source"] = "FCT_2014"
            rows.append(rec)
    return rows


def load_old_csv(path: str) -> list[dict]:
    rows = []
    with open(path, newline='', encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            rec = {col: "" for col in OUTPUT_COLS}
            for old_col, internal in OLD_COL_MAP.items():
                if old_col not in row:
                    continue
                raw = row.get(old_col, "").strip()
                if internal == "_enerc_kj":
                    try:
                        rec["enerc_kcal"] = str(round(float(raw) / 4.184, 1))
                    except ValueError:
                        rec["enerc_kcal"] = ""
                else:
                    rec[internal] = raw   # already in grams — no conversion needed
            rec["source"] = "BD_original"
            rows.append(rec)
    return rows


# ── Merge logic ───────────────────────────────────────────────────────────────

def find_best_match(new_name: str, old_rows: list[dict], threshold: float = 0.88) -> dict | None:
    """Return best fuzzy-matched old row if similarity ≥ threshold."""
    best_score, best_row = 0.0, None
    for old_row in old_rows:
        s = similarity(new_name, old_row.get("name", ""))
        if s > best_score:
            best_score, best_row = s, old_row
    return best_row if best_score >= threshold else None


def merge():
    print("Loading new CSV (FCT 2014 — authoritative)...")
    new_rows = load_new_csv(NEW_CSV)
    print(f"  → {len(new_rows)} rows")

    print("Loading old CSV (BD_food_details)...")
    old_rows = load_old_csv(OLD_CSV)
    print(f"  → {len(old_rows)} rows")

    matched_old_names: set[str] = set()
    enriched = 0

    for nr in new_rows:
        match = find_best_match(nr["name"], old_rows)
        if match:
            enriched += 1
            matched_old_names.add(match["name"].lower())
            # Enrich new row with old metadata (food group is more trusted from old dataset)
            if match.get("lang") and match["lang"] != match.get("lang_bn", ""):
                nr["lang"] = match["lang"]    # true Banglish name if available
            if match.get("grup") and match["grup"] not in ("", "Other"):
                nr["grup"] = match["grup"]    # old dataset group is more granular
            nr["source"] = "FCT_2014+BD"      # mark as enriched

    print(f"  → {enriched} new rows enriched with BD metadata (fuzzy match)")

    old_only = [r for r in old_rows if r.get("name", "").lower() not in matched_old_names]
    print(f"  → {len(old_only)} foods only in old CSV — appending")

    merged = new_rows + old_only
    print(f"  → Total: {len(merged)} foods")

    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    with open(OUT_CSV, "w", newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_COLS, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(merged)

    print(f"\n✅ Written → {OUT_CSV}")

    # ── Sanity checks ──────────────────────────────────────────────────────
    with open(OUT_CSV, newline='', encoding='utf-8') as f:
        check = list(csv.DictReader(f))

    print("\n── Sanity check: sample row ──")
    s = check[0]
    print(f"  {s['name']} | source={s['source']} | grup={s['grup']}")
    print(f"  kcal={s['enerc_kcal']} | protein={s['protcnt']}g")
    print(f"  ca={s['ca']}g ({float(s['ca'] or 0)*1000:.2f}mg equiv) | lang='{s['lang']}'")

    print("\n── Unit conversion check (Almond) ──")
    for row in check:
        if "almond" in row["name"].lower():
            print(f"  Ca stored = {row['ca']}g → {float(row['ca'] or 0)*1000:.1f}mg (expected ~228mg)")
            print(f"  Vita stored = {row['vita']}g → {float(row['vita'] or 0)*1000:.4f}mg")
            print(f"  source = {row['source']} | lang = '{row['lang']}'")
            break

    print("\n── Source breakdown ──")
    sources = Counter(r["source"] for r in check)
    for src, cnt in sources.items():
        print(f"  {src:<20} {cnt:>4} foods")

    print("\n── Foods per group ──")
    groups = Counter(r["grup"] for r in check)
    for g, cnt in sorted(groups.items(), key=lambda x: -x[1]):
        print(f"  {g:<40} {cnt:>4}")


if __name__ == "__main__":
    merge()
