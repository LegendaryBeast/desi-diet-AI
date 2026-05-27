import pandas as pd
import os
import re
from neo4j import GraphDatabase, basic_auth
from dotenv import load_dotenv
import difflib

# --- CONFIGURATION ---
load_dotenv()
NEO4J_URI = os.getenv("NEO4J_URI", "neo4j://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "khadok2025")
# --- END CONFIGURATION ---

def load_data(file_name):
    """Loads a CSV file from the data directory."""
    try:
        path = os.path.join(os.path.dirname(__file__), 'data', file_name)
        df = pd.read_csv(path)
        print(f"✅ Dataset '{file_name}' loaded successfully.")
        return df
    except FileNotFoundError:
        print(f"❌ Error: The file '{file_name}' was not found at {path}")
        return pd.DataFrame()

def get_nutrient_mapper(abbreviations_df):
    """Creates the nutrient name standardization mapper."""
    if abbreviations_df.empty:
        return {}
    
    abbreviations_df.columns = [col.strip().lower() for col in abbreviations_df.columns]
    name_to_name_map = pd.Series(abbreviations_df['name'].values, index=abbreviations_df['name'].str.lower()).to_dict()
    code_to_name_map = pd.Series(abbreviations_df['name'].values, index=abbreviations_df['code']).to_dict()
    nutrient_mapper = {**{k.lower(): v for k, v in name_to_name_map.items()}, 
                       **{k.lower(): v for k, v in code_to_name_map.items()}}
    # Ensure Vitamin C maps correctly to 'Ascorbic acids (C)' used by the foods
    nutrient_mapper["vitamin c"] = "Ascorbic acids (C)"
    print("✅ Nutrient abbreviation mapper created.")
    return nutrient_mapper

def purge_food_data(driver):
    """Purges ALL Food nodes (and their relationships) from the graph before migration.
    This ensures no stale Indian/old dataset food records remain."""
    print("🗑️  Purging all existing Food nodes and their relationships...")
    with driver.session() as session:
        result = session.run("""
            MATCH (f:Food)
            DETACH DELETE f
            RETURN count(f) AS deleted
        """)
        record = result.single()
        deleted = record["deleted"] if record else 0
        print(f"✅ Purged {deleted} Food nodes (all old dataset records removed).")


def create_constraints(driver):
    """Creates unique constraints in the graph."""
    with driver.session() as session:
        print("Applying graph constraints (FOR...REQUIRE)...")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (d:Disease) REQUIRE d.name IS UNIQUE")
        session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (n:Nutrient) REQUIRE n.name IS UNIQUE")
        # Use code as unique key for Food nodes (BD dataset has codes like H001, I002 etc.)
        # Drop old name-based constraint if it exists (ignore errors)
        try:
            session.run("DROP CONSTRAINT food_name_unique IF EXISTS")
        except Exception:
            pass
        try:
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (f:Food) REQUIRE f.code IS UNIQUE")
        except Exception:
            # Fallback: some Neo4j versions need different syntax
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (f:Food) REQUIRE f.name_en IS UNIQUE")
        print("✅ Graph constraints created (or already exist).")

def migrate_nutrients(driver, mapper, rda_df):
    """Loads all nutrients and merges them with RDA data."""
    if rda_df.empty:
        print("❌ RDA_DF is empty. Cannot migrate nutrients.")
        return
    
    print("Migrating Nutrients...")
    rda_df.columns = [col.strip().lower() for col in rda_df.columns]
    rda_df['nutrient'] = rda_df['nutrient'].str.lower().map(mapper).fillna(rda_df['nutrient'])
    all_nutrient_names = set(mapper.values()) | set(rda_df['nutrient'].unique())
    
    with driver.session() as session:
        for name in all_nutrient_names:
            if not pd.isna(name):
                session.run("MERGE (n:Nutrient {name: $name})", name=name)
        
        for _, row in rda_df.iterrows():
            gender_key = str(row['gender']).lower()
            age_key = str(row['age_group']).replace(' ', '_').replace('>', 'gt').replace('-', '_')
            unit_key = str(row['unit']).lower()
            
            rda_val = row['rda']
            if isinstance(rda_val, str):
                rda_val = float(rda_val.replace(',', ''))
            
            standard_rda_mg = 0
            if unit_key == 'g': standard_rda_mg = rda_val * 1000
            elif unit_key in ['µg', 'mcg']: standard_rda_mg = rda_val / 1000
            elif unit_key == 'mg': standard_rda_mg = rda_val
            elif unit_key == 'l': standard_rda_mg = rda_val * 1000000
            
            prop_key = f"rda_{gender_key}_{age_key}_mg"
            
            session.run(f"""
                MATCH (n:Nutrient {{name: $nutrient_name}})
                SET n.`{prop_key}` = $rda_value
            """, nutrient_name=row['nutrient'], rda_value=standard_rda_mg)
            
    print(f"✅ Migrated {len(all_nutrient_names)} nutrients and added RDA properties.")

def map_clinical_to_scientific(clinical_nutrients, corpus):
    """Lightweight string matcher — no embeddings needed."""
    if not clinical_nutrients or not corpus:
        return set()

    mapped_nutrients = set()
    corpus_lower = [c.lower().strip() for c in corpus]
    
    for clinical in clinical_nutrients:
        clinical_lower = clinical.lower().strip()
        
        # 1. Exact match
        if clinical_lower in corpus_lower:
            idx = corpus_lower.index(clinical_lower)
            mapped_nutrients.add(corpus[idx])
            continue
            
        # 2. Substring match
        best_match = None
        best_score = 0.0
        for i, target_lower in enumerate(corpus_lower):
            if clinical_lower in target_lower or target_lower in clinical_lower:
                score = 0.85
            else:
                clinical_tokens = set(re.findall(r'\w+', clinical_lower))
                target_tokens = set(re.findall(r'\w+', target_lower))
                if clinical_tokens and target_tokens:
                    intersection = clinical_tokens.intersection(target_tokens)
                    union = clinical_tokens.union(target_tokens)
                    score = len(intersection) / len(union)
                else:
                    score = 0.0
            if score > best_score:
                best_score = score
                best_match = corpus[i]
                
        if best_match and best_score > 0.3:
            mapped_nutrients.add(best_match)
            
    return mapped_nutrients

def migrate_diseases(driver, disease_df, nutrient_mapper, ai_models):
    """
    Loads diseases and uses AI to link them to the correct
    scientific nutrient nodes.
    """
    if disease_df.empty:
        return
        
    print("Migrating Diseases (Smart Mode)...")
    disease_df.columns = [col.strip().lower() for col in disease_df.columns]

    with driver.session() as session:
        for _, row in disease_df.iterrows():
            disease_name = row['disease']
            if pd.isna(disease_name):
                continue
            
            session.run("MERGE (d:Disease {name: $name})", name=disease_name)
            
            nutrients_str = row['recommended_nutrients']
            if pd.isna(nutrients_str):
                continue
                
            cleaned_nutrients_str = re.sub(r'\s*\([^)]*\)', '', nutrients_str).lower()
            clinical_nutrients = {nutrient.strip() for nutrient in cleaned_nutrients_str.split(',') if nutrient.strip()}
            
            scientific_nutrients = map_clinical_to_scientific(
                clinical_nutrients,
                ai_models["target_nutrient_corpus"]
            )
            
            for nutrient_name in scientific_nutrients:
                session.run("""
                    MATCH (d:Disease {name: $disease})
                    MATCH (n:Nutrient {name: $nutrient_name})
                    MERGE (d)-[:REQUIRES]->(n)
                """, disease=disease_name, nutrient_name=nutrient_name)
                
    print(f"✅ Migrated {len(disease_df)} disease entries (Smart Relationships).")

# --- BD DATASET FOOD MIGRATION ---
def migrate_foods(driver, food_df, mapper):
    """
    Loads Bangladeshi foods from BD_food_details.csv and links them to nutrients.
    - Stores name_en (from 'name' column), name_bn (from 'lang_bn'), 
      name_original (from 'lang' — Banglish), and code on each Food node.
    - Sets macro properties: energy_kcal, protein_g, fat_g, carbohydrate_g, fiber_g, is_partial.
    - Creates FoodGroup nodes and links Food nodes via BELONGS_TO.
    - Filters out Energy, metadata, and language columns from nutrient processing.
    """
    if food_df.empty:
        return
        
    print("Migrating BD Foods...")
    food_df.columns = [col.strip().lower() for col in food_df.columns]
    
    # NON_NUTRIENT_FIELDS: columns that are metadata, not actual nutrients
    # 'lang'    = Banglish local name (stored as name_original)
    # 'lang_bn' = Bengali name (stored as name_bn)
    # 'enerc'   = Energy (a macronutrient property, not a micronutrient node)
    NON_NUTRIENT_FIELDS = {'code', 'name', 'scie', 'lang', 'lang_bn', 'grup', 'regn', 'tags', 'enerc'}

    with driver.session() as session:
        # Collect only columns that map to real Nutrient nodes
        nutrient_codes_in_db = [
            col for col in food_df.columns 
            if col in mapper 
            and not col.endswith('_e')
            and col not in NON_NUTRIENT_FIELDS
        ]
        
        print(f"  → Nutrient columns detected: {len(nutrient_codes_in_db)}")
        
        nutrient_rels = []
        for _, row in food_df.iterrows():
            # Primary English name
            name_en = row.get('name', '')
            if pd.isna(name_en) or not str(name_en).strip():
                continue
            name_en = str(name_en).strip()
            
            # Banglish local name
            name_original = str(row.get('lang', '') or '').strip()
            
            # Bengali name
            name_bn = str(row.get('lang_bn', '') or '').strip()
            
            # Food code
            food_code = str(row.get('code', '') or '').strip()
            
            # Food Group
            food_group = str(row.get('grup', 'Other') or 'Other').strip()
            
            # Extract and parse macro nutrients
            def get_float(val):
                try:
                    if pd.isna(val):
                        return 0.0
                    return float(str(val).replace(',', ''))
                except ValueError:
                    return 0.0

            # BD dataset stores energy in kJ (kilojoules), not kcal!
            # Convert: kcal = kJ / 4.184
            energy_kj  = get_float(row.get('enerc'))
            energy_kcal = round(energy_kj / 4.184, 1)
            protein_g = get_float(row.get('protcnt'))
            fat_g = get_float(row.get('fatce'))
            carbs_g = get_float(row.get('cho'))
            fiber_g = get_float(row.get('fibtg'))
            
            # MERGE Food node and set properties
            if food_code:
                session.run("""
                    MERGE (f:Food {code: $code})
                    SET f.name_en = $name_en,
                        f.name_bn = $name_bn,
                        f.name_original = $name_original,
                        f.name = $name_en,
                        f.energy_kcal = $energy_kcal,
                        f.protein_g = $protein_g,
                        f.fat_g = $fat_g,
                        f.carbohydrate_g = $carbs_g,
                        f.fiber_g = $fiber_g,
                        f.is_partial = false
                """, code=food_code, name_en=name_en, name_bn=name_bn, name_original=name_original,
                     energy_kcal=energy_kcal, protein_g=protein_g, fat_g=fat_g, carbs_g=carbs_g, fiber_g=fiber_g)
            else:
                session.run("""
                    MERGE (f:Food {name_en: $name_en})
                    SET f.name_bn = $name_bn,
                        f.name_original = $name_original,
                        f.name = $name_en,
                        f.energy_kcal = $energy_kcal,
                        f.protein_g = $protein_g,
                        f.fat_g = $fat_g,
                        f.carbohydrate_g = $carbs_g,
                        f.fiber_g = $fiber_g,
                        f.is_partial = false
                """, name_en=name_en, name_bn=name_bn, name_original=name_original,
                     energy_kcal=energy_kcal, protein_g=protein_g, fat_g=fat_g, carbs_g=carbs_g, fiber_g=fiber_g)
            
            # MERGE FoodGroup node and create BELONGS_TO relationship
            session.run("""
                MERGE (fg:FoodGroup {name_en: $grup})
                ON CREATE SET fg.name_bn = $grup
                WITH fg
                MATCH (f:Food)
                WHERE (f.code = $code OR (f.code = '' AND f.name_en = $name_en))
                MERGE (f)-[:BELONGS_TO]->(fg)
            """, grup=food_group, code=food_code, name_en=name_en)
            
            # Collect CONTAINS_NUTRIENT relationships for batch inserting
            for col_code in nutrient_codes_in_db:
                value = row[col_code]
                if pd.notna(value):
                    try:
                        # INFOODS/IFCT dataset stores all micronutrients in GRAMS (g) per 100g food.
                        # Our graph property is named `amount_mg`, so we convert: mg = g * 1000
                        amount_g = float(str(value).replace(',', ''))
                        if amount_g == 0:
                            continue
                        amount_mg = amount_g * 1000.0  # g → mg
                    except ValueError:
                        continue
                        
                    nutrient_name = mapper.get(col_code)
                    if not nutrient_name:
                        continue

                    nutrient_rels.append({
                        "food_code": food_code,
                        "food_name_en": name_en,
                        "nutrient_name": nutrient_name,
                        "amount_mg": amount_mg
                    })
                    
        # Batch insert relationships to prevent thousands of network round-trips
        batch_size = 5000
        total_rels = len(nutrient_rels)
        print(f"  → Prepared {total_rels} nutrient relationships. Writing to Neo4j in batches of {batch_size}...")
        for i in range(0, total_rels, batch_size):
            batch = nutrient_rels[i:i+batch_size]
            session.run("""
                UNWIND $batch AS item
                MATCH (f:Food)
                WHERE (item.food_code <> '' AND f.code = item.food_code) 
                   OR (item.food_code = '' AND f.name_en = item.food_name_en)
                MATCH (n:Nutrient {name: item.nutrient_name})
                MERGE (f)-[r:CONTAINS_NUTRIENT]->(n)
                SET r.amount_mg = item.amount_mg
            """, batch=batch)
            print(f"    Uploaded relationships {i} to {min(i+batch_size, total_rels)}")
                    
    print(f"✅ Migrated {len(food_df)} BD foods with name_en/name_bn/name_original/code properties, macros, and FoodGroups.")
# --- END BD DATASET FOOD MIGRATION ---

def migrate_pairings(driver, pairings_df):
    if pairings_df.empty:
        print("⚠️ No pairings data found.")
        return
    print("Migrating Food Pairings...")
    with driver.session() as session:
        for _, row in pairings_df.iterrows():
            code1 = str(row['food_code_1']).strip()
            code2 = str(row['food_code_2']).strip()
            popularity = float(row['popularity'])
            pairing_type = str(row['pairing_type']).strip()
            meal_slot = str(row['meal_slot']).strip()
            
            session.run("""
                MATCH (f1:Food {code: $code1})
                MATCH (f2:Food {code: $code2})
                MERGE (f1)-[r:PAIRS_WITH]->(f2)
                SET r.popularity = $popularity,
                    r.pairing_type = $pairing_type,
                    r.meal_slot = $meal_slot
            """, code1=code1, code2=code2, popularity=popularity, pairing_type=pairing_type, meal_slot=meal_slot)
    print(f"✅ Migrated {len(pairings_df)} food pairings.")

def main():
    print("--- Starting Graph Migration ETL (SMART MODE) ---")
    
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        print(f"✅ Successfully connected to Neo4j at {NEO4J_URI}")
    except Exception as e:
        print(f"❌ Failed to connect to Neo4j: {e}")
        print("Please check your Neo4j credentials and that the database is running.")
        return

    abbreviations_df = load_data('nutrients_abbreviations.csv')
    abbreviations_df.columns = [col.strip().lower() for col in abbreviations_df.columns]
    target_nutrient_corpus = abbreviations_df['name'].dropna().unique().tolist()
    
    ai_models = {
        "target_nutrient_corpus": target_nutrient_corpus
    }
    print("✅ Nutrient corpus loaded for migration.")

    # Load all data
    disease_df = load_data('disease_nutrients.csv')
    # Load the Bangladeshi food dataset (has 'name', 'lang', 'lang_bn' columns)
    food_df = load_data('bd_food_nutrients.csv')
    if food_df.empty:
        print("❌ bd_food_nutrients.csv not found or empty. Aborting food migration.")
    rda_df = load_data('Indian_RDA.csv')
    pairings_df = load_data('food_pairings.csv')
    
    # Create the nutrient mapper
    nutrient_mapper = get_nutrient_mapper(abbreviations_df)
    
    # Run migration steps
    create_constraints(driver)
    
    # CRITICAL: Purge all old Food nodes before inserting BD dataset
    purge_food_data(driver)
    
    migrate_nutrients(driver, nutrient_mapper, rda_df)
    
    migrate_diseases(driver, disease_df, nutrient_mapper, ai_models)
    
    if not food_df.empty:
        migrate_foods(driver, food_df, nutrient_mapper)
        
    if not pairings_df.empty:
        migrate_pairings(driver, pairings_df)
    
    driver.close()
    
    print("--- Graph Migration ETL Complete ---")
    print("✅ BD dataset migrated. Food nodes now have: name_en, name_bn (Bengali), name_original (Banglish), code.")

if __name__ == "__main__":
    main()