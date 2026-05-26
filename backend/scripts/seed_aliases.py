from app.config import settings
from neo4j import GraphDatabase

def seed_aliases():
    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )
    
    # Define our clinical database-driven food alias definitions
    aliases = [
        # --- Parboiled Cooked Rice ---
        {"name": "siddho chaler bhat", "target_code": "code", "multiplier": 0.4},
        {"name": "shiddho chaler bhat", "target_code": "code", "multiplier": 0.4},
        {"name": "সিদ্ধ চালের ভাত", "target_code": "code", "multiplier": 0.4},
        {"name": "boiled rice", "target_code": "code", "multiplier": 0.4},
        {"name": "parboiled cooked rice", "target_code": "code", "multiplier": 0.4},
        {"name": "bhat", "target_code": "code", "multiplier": 0.4},
        {"name": "ভাত", "target_code": "code", "multiplier": 0.4},
        
        # --- Atop Cooked Rice ---
        {"name": "atop chaler bhat", "target_code": "A015", "multiplier": 0.4},
        {"name": "আতপ চালের ভাত", "target_code": "A015", "multiplier": 0.4},
        {"name": "atop bhat", "target_code": "A015", "multiplier": 0.4},
        {"name": "sun-dried cooked rice", "target_code": "A015", "multiplier": 0.4},
        
        # --- Eggs ---
        {"name": "boiled egg", "target_code": "M001", "multiplier": 1.0},
        {"name": "সিদ্ধ ডিম", "target_code": "M001", "multiplier": 1.0},
        {"name": "egg", "target_code": "M001", "multiplier": 1.0},
        {"name": "ডিম", "target_code": "M001", "multiplier": 1.0},
    ]
    
    print("Connecting to Neo4j to seed clinical aliases...")
    with driver.session() as s:
        # Create constraint for fast alias matching
        try:
            s.run("CREATE CONSTRAINT IF NOT EXISTS FOR (a:FoodAlias) REQUIRE a.name IS UNIQUE")
            s.run("CREATE INDEX IF NOT EXISTS FOR (a:FoodAlias) ON (a.name)")
        except Exception as e:
            print("Constraint/Index warning:", e)
            
        for a in aliases:
            # Merge the FoodAlias node and relate it to the target Food item
            q = """
            MATCH (f:Food {code: $target_code})
            MERGE (alias:FoodAlias {name: $name})
            SET alias.multiplier = $multiplier
            MERGE (alias)-[r:MAPS_TO]->(f)
            RETURN alias.name, f.name_bn, alias.multiplier
            """
            res = s.run(q, target_code=a["target_code"], name=a["name"], multiplier=a["multiplier"]).single()
            if res:
                print(f"✅ Seeded Alias: '{res[0]}' -> '{res[1]}' (x{res[2]})")
            else:
                print(f"⚠️  Target Food Code '{a['target_code']}' not found in database for alias '{a['name']}'")
                
    driver.close()
    print("🎉 Clinical Food Alias Seeding Complete!")

if __name__ == "__main__":
    seed_aliases()
