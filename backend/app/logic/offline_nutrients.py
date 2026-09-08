"""Offline and fallback nutrient & macro engine.
Provides local dataset lookups when Neo4j is offline, paused, or unreachable.
Uses FCT Bangladesh 2014 & Indian RDA datasets stored in backend/data/.
"""

import os
import re
import pandas as pd
from typing import List, Dict, Any, Optional

# Path to data directory
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

_rda_df: Optional[pd.DataFrame] = None
_food_df: Optional[pd.DataFrame] = None
_food_by_code: Dict[str, dict] = {}
_food_by_name: Dict[str, dict] = {}
_food_by_bn: Dict[str, dict] = {}

COLUMN_TO_NUTRIENT = {
    "ca": "Calcium (Ca)",
    "fe": "Iron (Fe)",
    "mg": "Magnesium (Mg)",
    "p": "Phosphorus (P)",
    "k": "Potassium (K)",
    "zn": "Zinc (Zn)",
    "cu": "Copper (Cu)",
    "vita": "Vitamin A",
    "vitd": "Vitamin D",
    "vite": "Vitamin E",
    "thia": "Thiamine (B1)",
    "ribf": "Riboflavin (B2)",
    "nia": "Niacin (B3)",
    "vitb6c": "Total B6",
    "folsum": "Folate (total)",
    "vitc": "Ascorbic acids (C)",
}

NUTRIENT_ALIASES = {
    "ascorbic acids (c)": ["vitamin c", "ascorbic acids (c)", "ascorbic acid"],
    "folate (total)": ["folate (total)", "folate", "folates (b9)", "folic acid"],
    "vitamin e": ["vitamin e", "α-tocopherol equivalent (e)", "alpha-tocopherol"],
    "thiamine (b1)": ["thiamine (b1)", "thiamine", "thiamin"],
    "riboflavin (b2)": ["riboflavin (b2)", "riboflavin"],
    "niacin (b3)": ["niacin (b3)", "niacin"],
    "total b6": ["total b6", "vitamin b6", "pyridoxine"],
    "calcium (ca)": ["calcium (ca)", "calcium"],
    "iron (fe)": ["iron (fe)", "iron"],
    "magnesium (mg)": ["magnesium (mg)", "magnesium"],
    "phosphorus (p)": ["phosphorus (p)", "phosphorus"],
    "potassium (k)": ["potassium (k)", "potassium"],
    "zinc (zn)": ["zinc (zn)", "zinc"],
    "copper (cu)": ["copper (cu)", "copper"],
}


def _load_data_if_needed():
    global _rda_df, _food_df, _food_by_code, _food_by_name, _food_by_bn
    if _rda_df is not None and _food_df is not None:
        return

    try:
        rda_path = os.path.join(DATA_DIR, "Indian_RDA.csv")
        if os.path.exists(rda_path):
            df = pd.read_csv(rda_path)
            df.columns = [c.strip().lower() for c in df.columns]
            _rda_df = df
    except Exception as e:
        print(f"⚠️ Offline Nutrients: Error loading Indian_RDA.csv: {e}")

    try:
        food_path = os.path.join(DATA_DIR, "bd_food_nutrients.csv")
        if os.path.exists(food_path):
            fdf = pd.read_csv(food_path)
            _food_df = fdf
            for _, row in fdf.iterrows():
                rdict = row.to_dict()
                code = str(rdict.get("code") or "").strip()
                if code:
                    _food_by_code[code] = rdict
                name_en = str(rdict.get("name") or "").strip().lower()
                if name_en:
                    _food_by_name[name_en] = rdict
                name_bn = str(rdict.get("lang_bn") or "").strip().lower()
                if name_bn:
                    _food_by_bn[name_bn] = rdict
    except Exception as e:
        print(f"⚠️ Offline Nutrients: Error loading bd_food_nutrients.csv: {e}")


def get_offline_rda_targets(age: int, gender: str, default_nutrients: List[str]) -> List[dict]:
    """Retrieve standard RDA targets in mg from local dataset (with hardcoded safe fallbacks)."""
    _load_data_if_needed()

    gender_key = "Male" if (gender or "male").lower() == "male" else "Female"
    if age <= 13:
        age_key = "14-18"
    elif 14 <= age <= 18:
        age_key = "14-18"
    elif 19 <= age <= 30:
        age_key = "19-30"
    elif 31 <= age <= 50:
        age_key = "31-50"
    elif 51 <= age <= 70:
        age_key = "51-70"
    else:
        age_key = "> 70"

    results = []
    
    # Safe static fallback in case CSV is missing
    STATIC_ADULT_RDA_MG = {
        "Vitamin A": 0.9 if gender_key == "Male" else 0.7,
        "Ascorbic acids (C)": 90.0 if gender_key == "Male" else 75.0,
        "Vitamin D": 0.015,
        "Vitamin E": 15.0,
        "Thiamine (B1)": 1.2 if gender_key == "Male" else 1.1,
        "Riboflavin (B2)": 1.3 if gender_key == "Male" else 1.1,
        "Niacin (B3)": 16.0 if gender_key == "Male" else 14.0,
        "Total B6": 1.3,
        "Folate (total)": 0.4,
        "Calcium (Ca)": 1000.0,
        "Iron (Fe)": 17.0 if gender_key == "Male" else 21.0,
        "Magnesium (Mg)": 340.0 if gender_key == "Male" else 310.0,
        "Phosphorus (P)": 700.0,
        "Zinc (Zn)": 12.0 if gender_key == "Male" else 10.0,
        "Copper (Cu)": 2.0,
        "Potassium (K)": 3500.0,
    }

    if _rda_df is not None and not _rda_df.empty:
        sub = _rda_df[(_rda_df["gender"] == gender_key) & (_rda_df["age_group"] == age_key)]
        for nut in default_nutrients:
            aliases = [a.lower() for a in NUTRIENT_ALIASES.get(nut.lower(), [nut.lower()])]
            matched = sub[sub["nutrient"].str.lower().isin(aliases)]
            if not matched.empty:
                row = matched.iloc[0]
                try:
                    val = float(str(row["rda"]).replace(",", ""))
                    unit = str(row["unit"]).lower()
                    if unit == "g":
                        std_mg = val * 1000.0
                    elif unit in ["µg", "mcg"]:
                        std_mg = val / 1000.0
                    elif unit == "l":
                        std_mg = val * 1000000.0
                    else:
                        std_mg = val
                    results.append({"name": nut, "target": std_mg})
                    continue
                except Exception:
                    pass
            # Fallback to static dict
            results.append({"name": nut, "target": STATIC_ADULT_RDA_MG.get(nut, 0.0)})
    else:
        for nut in default_nutrients:
            results.append({"name": nut, "target": STATIC_ADULT_RDA_MG.get(nut, 0.0)})

    return results


def get_offline_food_nutrients(food_inputs: List[dict]) -> Dict[str, Dict[str, float]]:
    """Look up nutrient amount_mg per 100g for input foods from local dataset."""
    _load_data_if_needed()
    food_nutrients: Dict[str, Dict[str, float]] = {}

    for fi in food_inputs:
        code = str(fi.get("code") or "").strip()
        name_en = str(fi.get("name_en") or "").strip().lower()
        name_bn = str(fi.get("name_bn") or "").strip().lower()
        key = code if code else name_en
        if not key or key in food_nutrients:
            continue

        # Look up row
        row = _food_by_code.get(code)
        if not row and name_en:
            row = _food_by_name.get(name_en)
            if not row:
                # Substring match
                for fname, frow in _food_by_name.items():
                    if name_en in fname or fname in name_en:
                        row = frow
                        break
        if not row and name_bn:
            row = _food_by_bn.get(name_bn)
            if not row:
                for bname, frow in _food_by_bn.items():
                    if name_bn in bname or bname in name_bn:
                        row = frow
                        break

        if not row:
            continue

        food_nutrients[key] = {}
        for col, nut_name in COLUMN_TO_NUTRIENT.items():
            val = row.get(col)
            if pd.notna(val):
                try:
                    # In bd_food_nutrients.csv, micronutrients are stored in grams per 100g.
                    # Convert g -> mg
                    val_g = float(str(val).replace(",", ""))
                    food_nutrients[key][nut_name] = val_g * 1000.0
                except (ValueError, TypeError):
                    pass

    return food_nutrients


def get_offline_food_macros(code: Optional[str] = None, name: Optional[str] = None) -> Optional[Dict[str, float]]:
    """Retrieve calories, protein, fat, carbs per 100g from local dataset."""
    _load_data_if_needed()
    row = None
    if code and str(code).strip() in _food_by_code:
        row = _food_by_code[str(code).strip()]
    elif name:
        nl = name.strip().lower()
        row = _food_by_name.get(nl) or _food_by_bn.get(nl)
        if not row:
            for fn, frow in _food_by_name.items():
                if nl in fn or fn in nl:
                    row = frow
                    break
            if not row:
                for bn, frow in _food_by_bn.items():
                    if nl in bn or bn in nl:
                        row = frow
                        break

    if not row:
        return None

    def _f(val, default=0.0):
        try:
            if pd.isna(val):
                return default
            return float(str(val).replace(",", ""))
        except Exception:
            return default

    return {
        "calories": _f(row.get("enerc_kcal")),
        "protein": _f(row.get("protcnt")),
        "fat": _f(row.get("fatce")),
        "carbs": _f(row.get("cho")),
        "name_en": str(row.get("name") or ""),
    }
