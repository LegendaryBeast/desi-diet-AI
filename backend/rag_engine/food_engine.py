"""
Food Engine — Neo4j-backed food search, safe food retrieval, and chatbot context.
Provides the same KhadokGraphRAG interface as the old graph_rag_bridge,
with added RAG planner integration for disease-aware recommendations.
Falls back to mock data when Neo4j is unavailable.
"""

from typing import List, Dict, Any, Optional
from .dietary_rules_data import NDG_DIETARY_RULES
from .static_foods import get_static_safe_foods

# Neo4j connection config from app settings
_neo4j_driver = None


def _get_neo4j_driver():
    """Lazy-load Neo4j driver from app config. Returns None if unavailable."""
    global _neo4j_driver
    if _neo4j_driver is not None:
        return _neo4j_driver

    try:
        from neo4j import GraphDatabase
        from app.config import settings
        _neo4j_driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        _neo4j_driver.verify_connectivity()
        print("✅ RAG Engine: Neo4j connected.")
        return _neo4j_driver
    except Exception as e:
        print(f"⚠️ RAG Engine: Neo4j unavailable ({e}). Running without graph database.")
        _neo4j_driver = None
        return None


class MockFoodEngine:
    """Mock food engine (disabled, kept for class definitions if imported)."""
    pass


class Neo4jFoodEngine:
    """Real Neo4j-backed food engine using Cypher queries."""

    def __init__(self, driver):
        self.driver = driver

    def get_safe_foods(self, conditions: List[str], goal: str = "Maintain", limit: int = 40) -> List[Dict[str, Any]]:
        """Retrieve foods safe for user's conditions, prioritized by preference."""
        query = '''
        MATCH (f:Food)-[:BELONGS_TO]->(fg:FoodGroup)
        WHERE f.is_partial = false

        OPTIONAL MATCH (ca:Condition)-[:AVOID_GROUP]->(fg)
        WHERE ca.name IN $conditions OR ca.name = $goal
        WITH f, fg, ca

        WHERE ca IS NULL

        OPTIONAL MATCH (cp:Condition)-[:PREFER_GROUP]->(fg)
        WHERE cp.name IN $conditions OR cp.name = $goal
        WITH f, fg, count(cp) AS preference_score

        RETURN f.code AS code,
               f.name_en AS name_en,
               f.name_bn AS name_bn,
               f.energy_kcal AS calories,
               f.protein_g AS protein,
               f.fiber_g AS fiber,
               fg.name_en AS food_group,
               preference_score
        ORDER BY preference_score DESC, f.protein_g DESC
        LIMIT $limit
        '''
        with self.driver.session() as session:
            result = session.run(query, conditions=conditions, goal=goal, limit=limit)
            return [dict(record) for record in result]

    def get_alternatives(self, code: str, conditions: List[str], goal: str = "Maintain", limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve alternative foods belonging to the same food group that are safe for the user."""
        query = '''
        MATCH (target:Food)-[:BELONGS_TO]->(fg:FoodGroup)
        WHERE target.code = $code OR toLower(target.name_en) = toLower($code) OR toLower(target.name_bn) = toLower($code)
        WITH fg, target
        
        MATCH (f:Food)-[:BELONGS_TO]->(fg)
        WHERE f.code <> target.code AND f.is_partial = false

        OPTIONAL MATCH (ca:Condition)-[:AVOID_GROUP]->(fg)
        WHERE ca.name IN $conditions OR ca.name = $goal
        WITH f, fg, ca

        WHERE ca IS NULL

        OPTIONAL MATCH (cp:Condition)-[:PREFER_GROUP]->(fg)
        WHERE cp.name IN $conditions OR cp.name = $goal
        WITH f, fg, count(cp) AS preference_score

        RETURN f.code AS code,
               f.name_en AS name_en,
               f.name_bn AS name_bn,
               f.energy_kcal AS calories,
               f.protein_g AS protein,
               f.fiber_g AS fiber,
               fg.name_en AS food_group,
               preference_score
        ORDER BY preference_score DESC, f.protein_g DESC
        LIMIT $limit
        '''
        with self.driver.session() as session:
            result = session.run(query, code=code, conditions=conditions, goal=goal, limit=limit)
            records = [dict(record) for record in result]
            
            # If no alternatives in same food group are found (or target food code not found),
            # fallback to generic safe foods matching user profile.
            if not records:
                return self.get_safe_foods(conditions=conditions, goal=goal, limit=limit)
            return records

    def search_food(self, query_text: str) -> List[Dict[str, Any]]:
        """Search foods by Bengali or English name."""
        query = '''
        MATCH (f:Food)-[:BELONGS_TO]->(fg:FoodGroup)
        WHERE toLower(f.name_en) CONTAINS toLower($qt)
           OR toLower(f.name_bn) CONTAINS toLower($qt)
           OR toLower(f.name_original) CONTAINS toLower($qt)
        RETURN f.code AS code,
               f.name_en AS name_en,
               f.name_bn AS name_bn,
               f.energy_kcal AS calories,
               f.protein_g AS protein,
               f.fat_g AS fat,
               f.carbohydrate_g AS carbs,
               f.fiber_g AS fiber,
               fg.name_en AS food_group
        ORDER BY f.protein_g DESC
        LIMIT 10
        '''
        with self.driver.session() as session:
            result = session.run(query, qt=query_text)
            return [dict(record) for record in result]

    def resolve_alias(self, query_text: str) -> Optional[Dict[str, Any]]:
        """Resolve a synonym/alias to a target food item and return nutrition + conversion multiplier."""
        query = '''
        MATCH (a:FoodAlias)-[r:MAPS_TO]->(f:Food)-[:BELONGS_TO]->(fg:FoodGroup)
        WHERE toLower(a.name) = toLower($qt)
           OR toLower($qt) CONTAINS toLower(a.name)
        RETURN f.code AS code,
               f.name_en AS name_en,
               f.name_bn AS name_bn,
               f.energy_kcal AS calories,
               f.protein_g AS protein,
               f.fat_g AS fat,
               f.carbohydrate_g AS carbs,
               f.fiber_g AS fiber,
               fg.name_en AS food_group,
               a.multiplier AS multiplier,
               a.name AS matched_alias
        ORDER BY size(a.name) DESC
        LIMIT 1
        '''
        with self.driver.session() as session:
            result = session.run(query, qt=query_text).single()
            return dict(result) if result else None


    def compare_meals(self, meal_1_codes: List[str], meal_2_codes: List[str], conditions: List[str]) -> Dict[str, Any]:
        """Evaluate and compare two meal combinations."""
        def evaluate_meal(codes, session):
            q = '''
            UNWIND $codes AS code
            MATCH (f:Food {code: code})-[:BELONGS_TO]->(fg:FoodGroup)

            OPTIONAL MATCH (c:Condition)-[r:AVOID_GROUP]->(fg)
            WHERE c.name IN $conditions

            RETURN
                sum(f.energy_kcal) AS total_calories,
                sum(f.protein_g) AS total_protein,
                sum(f.fat_g) AS total_fat,
                sum(f.carbohydrate_g) AS total_carbs,
                collect(DISTINCT c.name) AS violated_conditions,
                collect(DISTINCT r.reason) AS violation_reasons
            '''
            return dict(session.run(q, codes=codes, conditions=conditions).single())

        with self.driver.session() as session:
            m1 = evaluate_meal(meal_1_codes, session)
            m2 = evaluate_meal(meal_2_codes, session)

            insight = "Both meals are safe."
            if m1['violated_conditions'] and not m2['violated_conditions']:
                insight = f"Meal 2 is better. Meal 1 violates rules for {', '.join([c for c in m1['violated_conditions'] if c])}."
            elif m2['violated_conditions'] and not m1['violated_conditions']:
                insight = f"Meal 1 is better. Meal 2 violates rules for {', '.join([c for c in m2['violated_conditions'] if c])}."
            elif m1['violated_conditions'] and m2['violated_conditions']:
                insight = "Both meals contain items you should avoid based on your conditions."
            else:
                if m1['total_protein'] > m2['total_protein']:
                    insight = "Meal 1 has a better protein profile."
                else:
                    insight = "Meal 2 has a better protein profile."

            return {"meal_1": m1, "meal_2": m2, "insight": insight}

    def get_chatbot_context(self, food_code_or_name: str, conditions: List[str]) -> str:
        """Get food context with dietary rules and micronutrients for chatbot."""
        query = '''
        MATCH (f:Food)-[:BELONGS_TO]->(fg:FoodGroup)
        WHERE f.code = $term
           OR toLower(f.name_en) CONTAINS toLower($term)
           OR toLower(f.name_bn) CONTAINS toLower($term)
           OR toLower(f.name_original) CONTAINS toLower($term)
        WITH f, fg
        LIMIT 1

        OPTIONAL MATCH (c:Condition)-[r:AVOID_GROUP|PREFER_GROUP]->(fg)
        WHERE c.name IN $conditions
        WITH f, fg, collect({condition: c.name, rel_type: type(r), reason: r.reason}) AS rules

        // Fetch all nutrients and their levels for this food
        OPTIONAL MATCH (f)-[rc:CONTAINS_NUTRIENT]->(nut:Nutrient)
        WITH f, fg, rules, collect({name: nut.name, amount: rc.amount_mg}) AS nutrients

        // Fetch nutrients required by user's active diseases
        OPTIONAL MATCH (d:Disease)-[:REQUIRES]->(req_nut:Nutrient)
        WHERE d.name IN $conditions
        WITH f, fg, rules, nutrients, collect(DISTINCT req_nut.name) AS required_nutrients

        RETURN f.name_bn AS name_bn, f.name_en AS name_en, fg.name_en AS group,
               f.energy_kcal AS calories, f.protein_g AS protein, f.fat_g AS fat,
               f.carbohydrate_g AS carbs, f.fiber_g AS fiber,
               rules, nutrients, required_nutrients
        '''
        with self.driver.session() as session:
            record = session.run(query, term=food_code_or_name, conditions=conditions).single()
            if not record:
                return f"'{food_code_or_name}' not found in the knowledge graph."

            rules = record['rules'] or []
            nutrients = record['nutrients'] or []
            required_nutrients = record['required_nutrients'] or []

            # Filter out nulls or zero amount nutrients
            valid_nutrients = [n for n in nutrients if n.get('amount') is not None and n.get('amount') > 0]
            
            # Map clean nutrient list
            req_list = []
            other_list = []
            for n in valid_nutrients:
                name = n.get('name') or "Unknown"
                amount = n.get('amount') or 0.0
                formatted_amount = f"{amount:.3f} mg" if amount >= 0.001 else f"{amount*1000:.3f} mcg"
                if name in required_nutrients:
                    req_list.append(f"{name}: {formatted_amount}")
                else:
                    # Collect other major nutrients like Calcium, Vitamin C, Zinc, Iron, Vitamins, etc.
                    other_list.append(f"{name}: {formatted_amount}")

            context = f"Food: {record['name_bn']} ({record['name_en']}), Group: {record['group']}.\n"
            context += f"Nutrition (per 100g):\n"
            context += f"  - Calories: {record.get('calories') or 0} kcal\n"
            context += f"  - Protein: {record.get('protein') or 0}g | Fat: {record.get('fat') or 0}g | Carbs: {record.get('carbs') or 0}g | Fiber: {record.get('fiber') or 0}g\n"
            
            if req_list:
                context += f"  - Condition-Specific Micronutrients: {', '.join(req_list)}\n"
            if other_list:
                # Show top 10 other micronutrients to keep prompt size optimized
                context += f"  - Other Micronutrients: {', '.join(other_list[:10])}\n"

            valid_rules = [r for r in rules if r.get('condition') is not None]
            if not valid_rules:
                context += "  - No specific dietary restrictions found for your conditions."
            else:
                for r in valid_rules:
                    action = "⚠️ AVOID" if r['rel_type'] == "AVOID_GROUP" else "✅ PREFER"
                    context += f"  - {action} (for {r['condition']}): {r['reason']}\n"

            return context

    def close(self):
        self.driver.close()


class KhadokGraphRAG:
    """
    Unified RAG engine — queries Neo4j exclusively.
    Falls back to empty results when Neo4j is unavailable.
    """

    def __init__(self):
        driver = _get_neo4j_driver()
        self._real = Neo4jFoodEngine(driver) if driver else None

    def get_safe_foods(self, conditions, goal="Maintain", limit=40):
        if not self._real:
            return get_static_safe_foods(conditions, goal, limit)
        return self._real.get_safe_foods(conditions, goal, limit)

    def get_alternatives(self, code, conditions, goal="Maintain", limit=10):
        if not self._real:
            return []
        return self._real.get_alternatives(code, conditions, goal, limit)

    def search_food(self, query_text):
        if not self._real:
            return []
        return self._real.search_food(query_text)

    def resolve_alias(self, query_text):
        if not self._real:
            return None
        return self._real.resolve_alias(query_text)

    def compare_meals(self, meal_1_codes, meal_2_codes, conditions):
        if not self._real:
            return {"meal_1": {}, "meal_2": {}, "insight": "Graph database unavailable."}
        return self._real.compare_meals(meal_1_codes, meal_2_codes, conditions)

    def get_chatbot_context(self, food_code_or_name, conditions):
        if not self._real:
            return f"'{food_code_or_name}' — Graph database unavailable."
        return self._real.get_chatbot_context(food_code_or_name, conditions)

    def get_neo4j_driver(self):
        """Get the underlying Neo4j driver for RAG planner queries."""
        return self._real.driver if self._real else None

    def close(self):
        if self._real:
            self._real.close()
