"""
ingest_ndg_rules.py
Ingests National Dietary Guidelines for Bangladesh 2025 (NDG 2025)
rules into Neo4j:
  - (:Condition {name})
  - (:DietaryRule {rule_type, reason_en, reason_bn})
  - (:Condition)-[:AVOID_GROUP {reason}]->(:FoodGroup)
  - (:Condition)-[:PREFER_GROUP {reason}]->(:FoodGroup)
  - (:Condition)-[:HAS_RULE]->(:DietaryRule)-[:TARGETS_GROUP]->(:FoodGroup)
"""

import os
import sys
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv()

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from rag_engine.dietary_rules_data import NDG_DIETARY_RULES

# Map NDG rule target groups to actual FoodGroup names in database
GROUP_MAP = {
    'Cereals & Grains': ['Cereals and Millets'],
    'Eggs': ['Egg and Egg Products'],
    'Fats & Oils': ['Edible Oils and Fats'],
    'Fish & Seafood': ['Marine Fish', 'Fresh Water Fish and Shellfish', 'Marine Shellfish', 'Marine Mollusks'],
    'Fruits': ['Fruits'],
    'Leafy Vegetables': ['Green Leafy Vegetables'],
    'Meat & Poultry': ['Animal Meat', 'Poultry'],
    'Milk & Dairy': ['Milk and Milk Products'],
    'Nuts & Seeds': ['Nuts and Oil Seeds'],
    'Pulses & Legumes': ['Grain Legumes'],
    'Roots & Tubers': ['Roots and Tubers'],
    'Spices & Condiments': ['Spices and Condiments'],
    'Sugars & Sweets': ['Sugars'],
    'Vegetables': ['Other Vegetables'],
}

ALIASES = {
    'Weight_Loss': 'Weight Loss',
    'Weight_Gain': 'Weight Gain',
    'Heart_Disease': 'Heart Disease',
    'Liver_Disease': 'Liver Disease',
    'Renal_Disease': 'Renal Disease',
    'Renal_Stones': 'Renal Stones',
}


def run_ingestion():
    uri = os.getenv('NEO4J_URI')
    user = os.getenv('NEO4J_USER') or os.getenv('NEO4J_USERNAME', 'neo4j')
    password = os.getenv('NEO4J_PASSWORD')

    print(f"Connecting to Neo4j at {uri}...")
    driver = GraphDatabase.driver(uri, auth=(user, password))

    with driver.session() as session:
        print("Ensuring Condition constraints...")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Condition) REQUIRE c.name IS UNIQUE")

        avoid_count = 0
        prefer_count = 0

        for r in NDG_DIETARY_RULES:
            cond_names = [r['condition']]
            if r['condition'] in ALIASES:
                cond_names.append(ALIASES[r['condition']])

            target_groups = GROUP_MAP.get(r['group_target'], [])
            for c_name in cond_names:
                for tg in target_groups:
                    if r['rule_type'] == 'AVOID':
                        q = """
                        MERGE (c:Condition {name: $cond})
                        WITH c
                        MATCH (fg:FoodGroup {name_en: $tg})
                        MERGE (rule:DietaryRule {reason_en: $reason_en, rule_type: 'AVOID'})
                        SET rule.reason_bn = $reason_bn
                        MERGE (c)-[:HAS_RULE]->(rule)
                        MERGE (rule)-[:TARGETS_GROUP]->(fg)
                        MERGE (c)-[:AVOID_GROUP {reason: $reason_en}]->(fg)
                        """
                        avoid_count += 1
                    else:
                        q = """
                        MERGE (c:Condition {name: $cond})
                        WITH c
                        MATCH (fg:FoodGroup {name_en: $tg})
                        MERGE (rule:DietaryRule {reason_en: $reason_en, rule_type: 'PREFER'})
                        SET rule.reason_bn = $reason_bn
                        MERGE (c)-[:HAS_RULE]->(rule)
                        MERGE (rule)-[:TARGETS_GROUP]->(fg)
                        MERGE (c)-[:PREFER_GROUP {reason: $reason_en}]->(fg)
                        """
                        prefer_count += 1

                    session.run(
                        q,
                        cond=c_name,
                        tg=tg,
                        reason_en=r['reason_en'],
                        reason_bn=r.get('reason_bn', ''),
                    )

        print(f"✅ Ingested {avoid_count} AVOID_GROUP rules.")
        print(f"✅ Ingested {prefer_count} PREFER_GROUP rules.")
        print("🎉 NDG 2025 Dietary Rules Ingestion Complete!")

    driver.close()


if __name__ == "__main__":
    run_ingestion()
