"""
RAG Planner — disease-aware food recommendation engine.
Adapted from backend/app/logic/planner.py to work with backend-main's architecture.

Pipeline:
1. Semantic match user's disease text → known disease (lightweight string similarity)
2. Get clinical nutrients from Neo4j graph
3. Map clinical → scientific nutrients (token overlap Jaccard)
4. Rank foods by RDA contribution using Cosine Similarity (Neo4j Cypher) [EXPERIMENTAL BASELINE]
5. Return ranked food list for LLM prompt enrichment

NOTE — Phase C fixes applied (2026-09-14):
- find_best_disease_match: removed unconditional fallback to disease[0];
  negation patterns ("no X", "don't have X", "না X") now return None.
- get_rda_key: returns a dict with status instead of silently coercing inputs.
- map_clinical_to_scientific_nutrients: AMBIGUOUS_NUTRIENT_LABELS returns None
  instead of a silently wrong match (e.g. "Vitamin B" is ambiguous).
- rank_foods_by_rda_contribution renamed to _cosine_baseline;
  cosine score is angle-based, not adequacy.
"""

import pandas as pd
import os
import re
import difflib
from typing import Optional, Set, List, Tuple, Dict, Any

# Lightweight cache for mapping data to avoid loading it on every call
_ai_models_cache = None


def _get_data_path(file_name: str) -> str:
    """Get absolute path to a CSV file in the data/ directory."""
    return os.path.join(os.path.dirname(__file__), '..', 'data', file_name)


def _load_csv(file_name: str) -> pd.DataFrame:
    """Load a CSV file from the data directory."""
    try:
        path = _get_data_path(file_name)
        df = pd.read_csv(path)
        print(f"✅ RAG data '{file_name}' loaded.")
        return df
    except FileNotFoundError:
        print(f"❌ Error: RAG data file '{file_name}' not found.")
        return pd.DataFrame()


def load_rag_models() -> Dict[str, Any]:
    """
    Loads lightweight mapping data into memory.
    Replaced heavy SentenceTransformer/PyTorch with lightweight string similarity to fit in 512MB RAM.
    """
    global _ai_models_cache
    if _ai_models_cache is not None:
        return _ai_models_cache

    # 1. Load disease data for semantic matching
    disease_df = _load_csv('disease_nutrients.csv')
    predefined_diseases = []
    if not disease_df.empty:
        disease_df.columns = disease_df.columns.str.lower().str.strip()
        predefined_diseases = disease_df['disease'].dropna().unique().tolist()
        print(f"✅ RAG predefined diseases loaded: {len(predefined_diseases)} items.")

    # 2. Load abbreviation data for nutrient name mapping
    abbreviations_df = _load_csv('nutrients_abbreviations.csv')
    target_nutrient_corpus = []
    if not abbreviations_df.empty:
        abbreviations_df.columns = [col.strip().lower() for col in abbreviations_df.columns]
        target_nutrient_corpus = abbreviations_df['name'].dropna().unique().tolist()
        print(f"✅ RAG target nutrient corpus loaded: {len(target_nutrient_corpus)} items.")

    _ai_models_cache = {
        "model": "lightweight_string_matcher",
        "predefined_diseases": predefined_diseases,
        "disease_embeddings": None,
        "target_nutrient_corpus": target_nutrient_corpus,
        "nutrient_embeddings": None,
    }
    return _ai_models_cache


# Patterns that indicate negation of a condition (not a diagnosis)
_NEGATION_PREFIXES = (
    "no ", "don't have ", "do not have ", "doesn't have ", "does not have ",
    "without ", "not ", "never had ", "না ", "নেই ", "নাই ",
)
# Patterns that indicate family history (not a personal diagnosis)
_FAMILY_HISTORY_PATTERNS = (
    "my father", "my mother", "my sister", "my brother", "my grandfather",
    "my grandmother", "family history", "বাবার", "মায়ের", "ভাইয়ের", "বোনের",
    "পারিবারিক ইতিহাস",
)
# Goal/lifestyle terms that should never resolve to a disease
_GOAL_TERMS = {
    "maintain", "maintenance", "lose weight", "gain weight", "muscle gain",
    "fit", "healthy", "wellness", "ওজন কমানো", "ওজন বাড়ানো", "সুস্থ",
}


def _has_negation(text_lower: str) -> bool:
    """Return True if the text starts with or contains a negation prefix."""
    for pat in _NEGATION_PREFIXES:
        if text_lower.startswith(pat) or f" {pat}" in text_lower:
            return True
    return False


def _has_family_history(text_lower: str) -> bool:
    """Return True if the text is about a family member's condition, not the user's."""
    return any(pat in text_lower for pat in _FAMILY_HISTORY_PATTERNS)


def find_best_disease_match(user_input: str, ai_models: dict) -> Optional[str]:
    """
    Finds the closest disease node name from user's text using lightweight text matching.

    Returns None (not the first disease) when:
    - Input is negated ("no diabetes", "don't have X")
    - Input describes family history ("my father has diabetes")
    - Input is a lifestyle goal ("Maintain", "lose weight")
    - No meaningful match is found above the confidence threshold

    Callers MUST handle None explicitly and return a needs_clarification or
    no_match response rather than defaulting to any disease.
    """
    if not user_input or not ai_models or not ai_models["predefined_diseases"]:
        return None

    predefined_diseases = ai_models["predefined_diseases"]
    user_input_lower = user_input.lower().strip()

    # Gate 1: Reject negations — "no diabetes" must NOT match Diabetes
    if _has_negation(user_input_lower):
        return None

    # Gate 2: Reject family history — "my father has diabetes" is not the user's diagnosis
    if _has_family_history(user_input_lower):
        return None

    # Gate 3: Reject pure goal/lifestyle terms
    if user_input_lower in _GOAL_TERMS:
        return None

    # 1. Exact match (case insensitive)
    for disease in predefined_diseases:
        disease_clean = disease.lower().strip()
        if user_input_lower == disease_clean:
            return disease

    # 2. Substring match — only if no negation prefix present in the full token
    for disease in predefined_diseases:
        disease_clean = disease.lower().strip()
        # user_input contains disease name (e.g. "I have diabetes")
        if disease_clean in user_input_lower:
            return disease
        # disease name contains user input as a substring (e.g. "anemia" and "anaemia")
        if user_input_lower in disease_clean:
            return disease

    # 3. Difflib close match for typo tolerance (raised cutoff from 0.3 to 0.6 to reduce false positives)
    matches = difflib.get_close_matches(user_input_lower, [d.lower() for d in predefined_diseases], n=1, cutoff=0.6)
    if matches:
        for d in predefined_diseases:
            if d.lower() == matches[0]:
                return d

    # 4. No match found — return None. Do NOT fall back to predefined_diseases[0].
    return None


def get_clinical_nutrients_from_graph(disease_name: str, driver) -> Tuple[Set[str], int]:
    """Gets the required clinical nutrient names for a disease from the Neo4j graph."""
    with driver.session() as session:
        result = session.run("""
            MATCH (d:Disease {name: $disease})
            MATCH (d)-[:REQUIRES]->(n:Nutrient)
            RETURN n.name AS nutrient_name
        """, disease=disease_name)
        nutrients = {record["nutrient_name"] for record in result}
        return nutrients, len(nutrients)


# Nutrient labels that are too ambiguous to map without expert clarification.
# "Vitamin B" could be B1, B2, B3, B6, B9 (folate), or B12 — each with
# very different clinical significance. Silently picking one is incorrect.
_AMBIGUOUS_NUTRIENT_LABELS: Set[str] = {
    "vitamin b",
    "b vitamin",
    "b vitamins",
    "vitamins b",
    "b-vitamin",
    "ভিটামিন বি",
}

# Junk entries that should never be treated as nutrients
_JUNK_NUTRIENT_LABELS: Set[str] = {
    "food code", "code", "food name", "name", "source", "unit",
}


def map_clinical_to_scientific_nutrients(clinical_nutrients: Set[str], ai_models: dict) -> Set[str]:
    """
    Maps clinical/informal nutrient names to correct scientific names using
    lightweight token-overlap Jaccard similarity.

    Ambiguous labels (e.g. "Vitamin B") are skipped — they return nothing
    rather than silently mapping to an arbitrary B-vitamin.
    Junk entries (e.g. "Food Code") are filtered out.

    Callers should log a warning when a clinical nutrient is dropped due to
    ambiguity, so the end user can be prompted to clarify.
    """
    if not clinical_nutrients or not ai_models or not ai_models["target_nutrient_corpus"]:
        return set()

    target_nutrient_corpus = ai_models["target_nutrient_corpus"]
    mapped_nutrients = set()

    for clinical in clinical_nutrients:
        clinical_lower = clinical.lower().strip()

        # Skip junk
        if clinical_lower in _JUNK_NUTRIENT_LABELS:
            continue

        # Skip ambiguous labels rather than guessing
        if clinical_lower in _AMBIGUOUS_NUTRIENT_LABELS:
            import logging
            logging.getLogger(__name__).warning(
                "Ambiguous nutrient label '%s' skipped — cannot safely map to a single nutrient. "
                "Clarification required.", clinical
            )
            continue

        best_match = None
        best_score = 0.0

        # Tokenize the clinical term
        clinical_tokens = set(re.findall(r'\w+', clinical_lower))

        for target in target_nutrient_corpus:
            target_lower = target.lower().strip()
            target_tokens = set(re.findall(r'\w+', target_lower))

            # Exact match
            if clinical_lower == target_lower:
                score = 1.0
            # Substring match
            elif clinical_lower in target_lower or target_lower in clinical_lower:
                score = 0.85
            # Token overlap Jaccard similarity
            elif clinical_tokens and target_tokens:
                intersection = clinical_tokens.intersection(target_tokens)
                union = clinical_tokens.union(target_tokens)
                score = len(intersection) / len(union)
            else:
                score = 0.0

            if score > best_score:
                best_score = score
                best_match = target

        if best_score > 0.4 and best_match:
            mapped_nutrients.add(best_match)

    return mapped_nutrients


def get_rda_key(age: int, gender: str) -> Dict[str, str]:
    """
    Converts user age/gender into the specific RDA property key from Neo4j.

    Returns a dict with keys:
      - "status": "ok" | "needs_clarification" | "unsupported"
      - "key": the RDA property string (only present when status == "ok")
      - "reason": human-readable explanation (only present when status != "ok")

    Callers must check status before using key. Do NOT silently coerce
    missing gender to "male" or age <14 to the 14-18 bracket.
    """
    gender_key = gender.lower().strip() if gender else ""

    # Gender is required — do not default to male
    if gender_key not in ["male", "female"]:
        return {
            "status": "needs_clarification",
            "reason": (
                f"Gender '{gender}' is not supported. "
                "Please specify 'male' or 'female' to select the correct reference intake."
            ),
        }

    # Determine age bracket
    if age is None:
        return {"status": "needs_clarification", "reason": "Age is required for RDA lookup."}

    if age < 9:
        return {
            "status": "unsupported",
            "reason": (
                f"Age {age} is below the youngest supported bracket (9–13). "
                "Reference intakes for children under 9 are not in this dataset."
            ),
        }
    elif age <= 13:
        # The 9–13 bracket exists in principle but is absent from the current Neo4j dataset.
        # Do NOT silently remap to 14–18; instead surface this as unsupported.
        return {
            "status": "unsupported",
            "reason": (
                f"Age {age} falls in the 9–13 bracket which is not present in the current "
                "Neo4j RDA dataset. A clinically reviewed expansion is required before "
                "planning for this age group."
            ),
        }
    elif 14 <= age <= 18:
        age_key = "14_18"
    elif 19 <= age <= 30:
        age_key = "19_30"
    elif 31 <= age <= 50:
        age_key = "31_50"
    elif 51 <= age <= 70:
        age_key = "51_70"
    elif age > 70:
        age_key = "gt_70"
    else:
        return {"status": "unsupported", "reason": f"Age {age} is out of supported range."}

    return {"status": "ok", "key": f"rda_{gender_key}_{age_key}_mg"}


def rank_foods_by_rda_contribution_cosine_baseline(
    driver,
    scientific_nutrients: Set[str],
    nutrient_count: int,
    user_rda_key: str
) -> List[Dict[str, Any]]:
    """
    EXPERIMENTAL BASELINE — Graph-native cosine similarity food ranking.

    IMPORTANT LIMITATION: This score is angle-based, not an adequacy measure.
    Mathematically: cosine(A, B) = (A·B) / (‖A‖ · ‖B‖)
    With B = all-ones ideal vector, any food vector proportional to all-ones
    scores 1.0 regardless of absolute nutrient density.
    Example: (0.01, 0.01) and (0.90, 0.90) BOTH score 1.0.
    This means a food providing 1% of each RDA ranks the same as one providing
    90% of each RDA, as long as the proportions are equal.

    Use this function only as a historical comparison baseline.
    Do NOT present this score as nutritional adequacy in production API responses.
    See portion_planner.py for the adequacy-based implementation.
    """
    with driver.session() as session:
        query = f"""
        UNWIND $nutrient_names AS nutrient_name
        MATCH (n:Nutrient {{name: nutrient_name}})
        MATCH (f:Food)-[c:CONTAINS_NUTRIENT]->(n)
        WHERE f.is_partial = false

        // Calculate %DV per nutrient per food
        WITH f, n, c.amount_mg AS food_provides, n.`{user_rda_key}` AS user_needs
        WITH f, n,
             CASE
               WHEN user_needs IS NOT NULL AND user_needs > 0
               THEN (food_provides / user_needs) * 100
               ELSE 0
             END AS percent_dv

        // Cap at 100 to avoid a single nutrient dominating the score (Algorithm 1)
        WITH f, n,
             CASE
               WHEN percent_dv > 100 THEN 100
               ELSE percent_dv
             END AS capped_dv

        // Compute cosine similarity components
        WITH f,
             sum(capped_dv) AS sum_vi,
             sqrt(sum(capped_dv * capped_dv)) AS magnitude_A

        WITH f, sum_vi, magnitude_A,
             CASE
               WHEN magnitude_A > 0 AND $nutrient_count > 0
               THEN sum_vi / (magnitude_A * sqrt($nutrient_count))
               ELSE 0
             END AS similarity_score

        // Join food group for meal distribution logic
        OPTIONAL MATCH (f)-[:BELONGS_TO]->(fg:FoodGroup)

        RETURN f.code          AS code,
               f.name_en       AS name_en,
               coalesce(f.name_bn, f.name_en) AS name_bn,
               f.energy_kcal   AS calories,
               f.protein_g     AS protein,
               f.fiber_g       AS fiber,
               coalesce(fg.name_en, 'Other') AS food_group,
               similarity_score
        ORDER BY similarity_score DESC
        LIMIT 50
        """

        result = session.run(
            query,
            nutrient_names=list(scientific_nutrients),
            nutrient_count=nutrient_count,
        )

        foods = []
        for record in result:
            foods.append({
                "code":             record["code"] or "",
                "name_en":          record["name_en"] or "",
                "name_bn":          record["name_bn"] or record["name_en"] or "",
                "calories":         round(float(record["calories"] or 0), 1),   # kcal/100g
                "protein":          round(float(record["protein"]  or 0), 2),
                "fiber":            round(float(record["fiber"]    or 0), 2),
                "food_group":       record["food_group"] or "Other",
                "similarity_score": round(float(record["similarity_score"] or 0), 4),
            })
        return foods


def get_rag_recommended_foods(
    disease_text: str,
    age: int,
    gender: str,
    neo4j_driver,
    ai_models: Optional[dict] = None,
) -> Optional[Dict[str, Any]]:
    """
    Main RAG pipeline: given a disease description, returns recommended foods
    and matched nutrients for use in meal plan generation.

    Returns:
        dict with keys: matched_disease, clinical_nutrients, scientific_nutrients,
                        recommended_foods, rda_key_status
        or None if RAG is not available, fails, or no disease is matched.

    Callers must check that a non-None result was returned before assuming
    disease matching succeeded. When disease_text contains negations or
    lifestyle goals (e.g. "no diabetes", "Maintain"), this function returns
    None rather than matching an incorrect disease.
    """
    if ai_models is None:
        ai_models = load_rag_models()

    if not ai_models or not neo4j_driver:
        return None

    try:
        # 1. Semantic disease matching (supports comma-separated list of multiple conditions)
        diseases = [d.strip() for d in disease_text.split(",") if d.strip()]

        clinical_nutrients = set()
        matched_diseases_list = []

        for d_text in diseases:
            matched_d = find_best_disease_match(d_text, ai_models)
            if matched_d:
                matched_diseases_list.append(matched_d)
                # 2. Get clinical nutrients from graph
                cond_nutrients, _ = get_clinical_nutrients_from_graph(matched_d, neo4j_driver)
                clinical_nutrients.update(cond_nutrients)
            else:
                import logging
                logging.getLogger(__name__).info(
                    "RAG: No disease match for '%s' (negation, goal, or no close match). "
                    "Skipping \u2014 will not fall back to a random disease.",
                    d_text,
                )

        if not matched_diseases_list:
            import logging
            logging.getLogger(__name__).warning(
                "RAG: No diseases matched in '%s'. Returning None \u2014 caller should prompt for clarification.",
                disease_text,
            )
            return None

        if not clinical_nutrients:
            print(f"\u26a0\ufe0f RAG: No nutrients found for diseases: '{disease_text}'")
            return None

        matched_disease = ", ".join(matched_diseases_list)
        nutrient_count = len(clinical_nutrients)
        print(f"\U0001f50d RAG: Matched diseases: '{matched_disease}'")
        print(f"\U0001f33f RAG: Combined Clinical nutrients ({nutrient_count}): {', '.join(clinical_nutrients)}")

        # 3. Map clinical \u2192 scientific nutrients
        scientific_nutrients = map_clinical_to_scientific_nutrients(
            clinical_nutrients, ai_models
        )
        if not scientific_nutrients:
            print("\u26a0\ufe0f RAG: Nutrient mapping produced no results (all may have been ambiguous or junk). "
                  "Using clinical names as fallback.")
            scientific_nutrients = clinical_nutrients
        print(f"\U0001f4a1 RAG: Scientific nutrients: {', '.join(scientific_nutrients)}")

        # 4. Get RDA key \u2014 check status before using
        rda_result = get_rda_key(age, gender)
        if rda_result["status"] != "ok":
            import logging
            logging.getLogger(__name__).warning(
                "RAG: RDA key lookup returned '%s': %s",
                rda_result["status"], rda_result.get("reason", "")
            )
            return {
                "matched_disease": matched_disease,
                "clinical_nutrients": list(clinical_nutrients),
                "scientific_nutrients": list(scientific_nutrients),
                "recommended_foods": [],
                "rda_key_status": rda_result["status"],
                "rda_key_reason": rda_result.get("reason", ""),
            }

        user_rda_key = rda_result["key"]
        print(f"\U0001f52c RAG: User RDA key: '{user_rda_key}'")

        recommended_foods = rank_foods_by_rda_contribution_cosine_baseline(
            neo4j_driver,
            scientific_nutrients,
            len(scientific_nutrients),
            user_rda_key
        )

        if not recommended_foods:
            print("\u26a0\ufe0f RAG: No recommended foods found")
            return None

        print(f"\U0001f372 RAG: Top {len(recommended_foods)} foods recommended")

        return {
            "matched_disease": matched_disease,
            "clinical_nutrients": list(clinical_nutrients),
            "scientific_nutrients": list(scientific_nutrients),
            "recommended_foods": recommended_foods,  # list of food dicts
            "rda_key_status": "ok",
        }

    except Exception as e:
        import traceback
        print(f"\u274c RAG pipeline error: {e}")
        traceback.print_exc()
        return None

