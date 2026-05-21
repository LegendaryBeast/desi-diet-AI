"""
RAG Planner — SentenceTransformer-based disease-aware food recommendation engine.
Adapted from backend/app/logic/planner.py to work with backend-main's architecture.

Pipeline:
1. Semantic match user's disease text → known disease (SentenceTransformer)
2. Get clinical nutrients from Neo4j graph
3. Map clinical → scientific nutrients (SentenceTransformer)
4. Rank foods by RDA contribution using Cosine Similarity (Neo4j Cypher)
5. Return ranked food list for LLM prompt enrichment
"""

import pandas as pd
import os
import torch
from typing import Optional, Set, List, Tuple, Dict, Any

# Lazy-load heavy ML libraries to avoid startup penalty when not needed
_sentence_transformer_model = None
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
    Load SentenceTransformer model and create embeddings for diseases and nutrients.
    Called once at startup, cached globally.
    Returns a dict with model, embeddings, and corpus data.
    """
    global _ai_models_cache
    if _ai_models_cache is not None:
        return _ai_models_cache

    try:
        from sentence_transformers import SentenceTransformer, util
    except ImportError:
        print("⚠️ sentence-transformers not installed. RAG planner disabled.")
        _ai_models_cache = None
        return None

    # 1. Load SentenceTransformer Model
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print("✅ SentenceTransformer model loaded.")

    # 2. Load disease data for semantic matching
    disease_df = _load_csv('disease_nutrients.csv')
    predefined_diseases = []
    disease_embeddings = torch.Tensor()
    if not disease_df.empty:
        disease_df.columns = disease_df.columns.str.lower().str.strip()
        predefined_diseases = disease_df['disease'].dropna().unique().tolist()
        disease_embeddings = model.encode(predefined_diseases, convert_to_tensor=True)
        print(f"✅ Embeddings created for {len(predefined_diseases)} diseases.")

    # 3. Load abbreviation data for nutrient name mapping
    abbreviations_df = _load_csv('nutrients_abbreviations.csv')
    target_nutrient_corpus = []
    nutrient_embeddings = torch.Tensor()
    if not abbreviations_df.empty:
        abbreviations_df.columns = [col.strip().lower() for col in abbreviations_df.columns]
        target_nutrient_corpus = abbreviations_df['name'].dropna().unique().tolist()
        nutrient_embeddings = model.encode(target_nutrient_corpus, convert_to_tensor=True)
        print(f"✅ Embeddings created for {len(target_nutrient_corpus)} target nutrients.")

    _ai_models_cache = {
        "model": model,
        "predefined_diseases": predefined_diseases,
        "disease_embeddings": disease_embeddings,
        "target_nutrient_corpus": target_nutrient_corpus,
        "nutrient_embeddings": nutrient_embeddings,
    }
    return _ai_models_cache


def find_best_disease_match(user_input: str, ai_models: dict) -> Optional[str]:
    """Finds the closest disease node name from user's text using semantic similarity."""
    if (not user_input
        or not ai_models
        or not ai_models["predefined_diseases"]
        or ai_models["disease_embeddings"] is None):
        return None

    from sentence_transformers import util

    model = ai_models["model"]
    disease_embeddings = ai_models["disease_embeddings"]
    predefined_diseases = ai_models["predefined_diseases"]

    input_embedding = model.encode(user_input, convert_to_tensor=True)
    cosine_scores = util.pytorch_cos_sim(input_embedding, disease_embeddings)
    best_match_index = torch.argmax(cosine_scores).item()
    return predefined_diseases[best_match_index]


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


def map_clinical_to_scientific_nutrients(clinical_nutrients: Set[str], ai_models: dict) -> Set[str]:
    """
    Maps ambiguous nutrient names (e.g. "Vitamin B") to correct scientific names
    (e.g. "Vitamin B12 (Cobalamin)") using SentenceTransformer similarity.
    Filters out junk entries like "Food Code".
    """
    if (not clinical_nutrients
        or not ai_models
        or not ai_models["target_nutrient_corpus"]
        or ai_models["nutrient_embeddings"] is None):
        return set()

    from sentence_transformers import util

    model = ai_models["model"]
    nutrient_embeddings = ai_models["nutrient_embeddings"]
    target_nutrient_corpus = ai_models["target_nutrient_corpus"]

    mapped_nutrients = set()
    clinical_embeddings = model.encode(list(clinical_nutrients), convert_to_tensor=True)
    cosine_scores = util.pytorch_cos_sim(clinical_embeddings, nutrient_embeddings)

    for i in range(len(clinical_nutrients)):
        best_match_index = torch.argmax(cosine_scores[i]).item()
        # Only add if match confidence > 0.5
        if cosine_scores[i][best_match_index] > 0.5:
            mapped_nutrients.add(target_nutrient_corpus[best_match_index])

    return mapped_nutrients


def get_rda_key(age: int, gender: str) -> str:
    """Converts user age/gender into the specific RDA property key from Neo4j."""
    gender_key = gender.lower()
    age_key = ""

    if age <= 13: age_key = "9_13"
    elif 14 <= age <= 18: age_key = "14_18"
    elif 19 <= age <= 30: age_key = "19_30"
    elif 31 <= age <= 50: age_key = "31_50"
    elif 51 <= age <= 70: age_key = "51_70"
    elif age > 70: age_key = "gt_70"
    else: age_key = "19_30"  # Default fallback

    if gender_key not in ["male", "female"]:
        gender_key = "both"

    return f"rda_{gender_key}_{age_key}_mg"


def rank_foods_by_rda_contribution(
    driver,
    scientific_nutrients: Set[str],
    nutrient_count: int,
    user_rda_key: str
) -> List[Dict[str, Any]]:
    """
    Graph-native cosine similarity food ranking (Algorithm 1 from the paper).
    Returns full food dicts with name_bn, code, calories_per_100g, protein, etc.
    Foods are ranked by how well their nutrient profile covers the user's RDA
    for the nutrients required by their disease condition.
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
                        recommended_foods
        or None if RAG is not available or fails.
    """
    if ai_models is None:
        ai_models = load_rag_models()

    if not ai_models or not neo4j_driver:
        return None

    try:
        # 1. Semantic disease matching
        matched_disease = find_best_disease_match(disease_text, ai_models)
        if not matched_disease:
            print(f"⚠️ RAG: Could not match disease '{disease_text}'")
            return None
        print(f"🔍 RAG: Best disease match: '{matched_disease}'")

        # 2. Get clinical nutrients from graph
        clinical_nutrients, nutrient_count = get_clinical_nutrients_from_graph(
            matched_disease, neo4j_driver
        )
        if not clinical_nutrients:
            print(f"⚠️ RAG: No nutrients found for '{matched_disease}'")
            return None
        print(f"🌿 RAG: Clinical nutrients ({nutrient_count}): {', '.join(clinical_nutrients)}")

        # 3. Map clinical → scientific nutrients
        scientific_nutrients = map_clinical_to_scientific_nutrients(
            clinical_nutrients, ai_models
        )
        if not scientific_nutrients:
            print("⚠️ RAG: Nutrient mapping failed, using clinical names")
            scientific_nutrients = clinical_nutrients
        print(f"💡 RAG: Scientific nutrients: {', '.join(scientific_nutrients)}")

        # 4. Get RDA key and rank foods
        user_rda_key = get_rda_key(age, gender)
        print(f"🔬 RAG: User RDA key: '{user_rda_key}'")

        recommended_foods = rank_foods_by_rda_contribution(
            neo4j_driver,
            scientific_nutrients,
            len(scientific_nutrients),
            user_rda_key
        )

        if not recommended_foods:
            print("⚠️ RAG: No recommended foods found")
            return None

        print(f"🍲 RAG: Top {len(recommended_foods)} foods recommended")

        return {
            "matched_disease": matched_disease,
            "clinical_nutrients": list(clinical_nutrients),
            "scientific_nutrients": list(scientific_nutrients),
            "recommended_foods": recommended_foods,  # list of food dicts
        }

    except Exception as e:
        import traceback
        print(f"❌ RAG pipeline error: {e}")
        traceback.print_exc()
        return None
