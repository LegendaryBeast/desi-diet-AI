"""
migrate_food_compatibility.py
Migrates food_compatibility.csv into Neo4j as:
  - (:Food)-[:HAS_MEAL_SLOT {slot, role, score}]->(:MealSlot)
  - (:Food)-[:BEST_PAIRED_WITH_GROUP {score}]->(:FoodGroup)

Also removes any usage of Food-nutrient_dataset.csv from the graph.
Run: python migrate_food_compatibility.py
"""
import os
import sys
import pandas as pd
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "food_compatibility.csv")


def migrate(driver):
    df = pd.read_csv(CSV_PATH)
    print(f"📂 Loaded {len(df)} rows from food_compatibility.csv")

    with driver.session() as session:

        # ── 1. Create MealSlot nodes ─────────────────────────────────────────
        print("\n[1/4] Creating MealSlot nodes...")
        slots = ["breakfast", "lunch", "dinner", "snack", "all"]
        for slot in slots:
            session.run("""
                MERGE (ms:MealSlot {name: $name})
                ON CREATE SET ms.created = timestamp()
            """, name=slot)
        print(f"  ✅ {len(slots)} MealSlot nodes ready")

        # ── 2. Create/Update :HAS_MEAL_SLOT relationships ────────────────────
        print("\n[2/4] Migrating HAS_MEAL_SLOT relationships...")
        created = 0
        for _, row in df.iterrows():
            code = str(row["food_code"]).strip()
            role = str(row["role"]).strip()
            score = float(row["compatibility_score"])
            notes = str(row.get("notes", "")).strip()
            slots_for_food = [s.strip() for s in str(row["meal_slots"]).split(",")]

            for slot in slots_for_food:
                if not slot:
                    continue
                result = session.run("""
                    MATCH (f:Food {code: $code})
                    MATCH (ms:MealSlot {name: $slot})
                    MERGE (f)-[r:HAS_MEAL_SLOT]->(ms)
                    ON CREATE SET r.role = $role, r.score = $score, r.notes = $notes
                    ON MATCH  SET r.role = $role, r.score = $score, r.notes = $notes
                    RETURN f.code AS code
                """, code=code, slot=slot, role=role, score=score, notes=notes)
                if result.single():
                    created += 1

        print(f"  ✅ {created} HAS_MEAL_SLOT relationships created/updated")

        # ── 3. Create :BEST_PAIRED_WITH_GROUP relationships ──────────────────
        print("\n[3/4] Migrating BEST_PAIRED_WITH_GROUP relationships...")
        paired = 0
        for _, row in df.iterrows():
            code = str(row["food_code"]).strip()
            groups_raw = str(row.get("pairs_with_groups", "")).strip()
            score = float(row["compatibility_score"])
            if not groups_raw:
                continue
            groups = [g.strip() for g in groups_raw.split("|") if g.strip()]
            for grp in groups:
                result = session.run("""
                    MATCH (f:Food {code: $code})
                    MATCH (fg:FoodGroup {name_en: $grp})
                    MERGE (f)-[r:BEST_PAIRED_WITH_GROUP]->(fg)
                    ON CREATE SET r.score = $score
                    ON MATCH  SET r.score = $score
                    RETURN f.code AS code
                """, code=code, grp=grp, score=score)
                if result.single():
                    paired += 1

        print(f"  ✅ {paired} BEST_PAIRED_WITH_GROUP relationships created/updated")

        # ── 4. Mark supplementary/universal foods ────────────────────────────
        print("\n[4/4] Marking supplementary foods...")
        supp_codes = df[df["role"] == "supplementary"]["food_code"].tolist()
        # Also mark Milk and Milk Products as universal supplementary
        milk_codes = df[df["food_group"] == "Milk and Milk Products"]["food_code"].tolist()
        universal = set(supp_codes + milk_codes)

        for code in universal:
            session.run("""
                MATCH (f:Food {code: $code})
                SET f.is_supplementary = true, f.pairs_with_all = true
            """, code=str(code).strip())
        print(f"  ✅ {len(universal)} foods marked as supplementary/universal")

        # ── Summary ──────────────────────────────────────────────────────────
        counts = session.run("""
            RETURN
              (MATCH ()-[:HAS_MEAL_SLOT]->() RETURN count(*) LIMIT 1)[0] AS meal_slots,
              (MATCH ()-[:BEST_PAIRED_WITH_GROUP]->() RETURN count(*) LIMIT 1)[0] AS pairings
        """).single()
        rels = session.run("""
            MATCH ()-[r:HAS_MEAL_SLOT]->() RETURN count(r) AS c1
        """).single()
        rels2 = session.run("""
            MATCH ()-[r:BEST_PAIRED_WITH_GROUP]->() RETURN count(r) AS c2
        """).single()
        print(f"\n📊 Final count: {rels['c1']} HAS_MEAL_SLOT | {rels2['c2']} BEST_PAIRED_WITH_GROUP")


def main():
    if not NEO4J_PASSWORD:
        print("❌ NEO4J_PASSWORD not set in .env")
        sys.exit(1)

    print(f"🔌 Connecting to Neo4j at {NEO4J_URI}...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    try:
        driver.verify_connectivity()
        print("✅ Connected to Neo4j")
        migrate(driver)
        print("\n🎉 Migration complete!")
    finally:
        driver.close()


if __name__ == "__main__":
    main()
