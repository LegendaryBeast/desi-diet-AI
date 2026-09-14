# DesiDiet — Database Migration & Rollback Guide

**Document Version:** 1.0.0  
**Date:** September 2026  
**Scope:** Migration of food data, canonical ID assignments, Neo4j graph schemas, and PostgreSQL Prisma persistence.

---

## 1. Overview & Migration Philosophy

Historical audit identified that previous migration scripts performed destructive full purges (`MATCH (f:Food) DETACH DELETE f`) without dry-runs or rollback procedures.

This guide establishes an **idempotent, reviewable, and reversible** migration protocol:
1. **Never Purge Live Data**: Schema updates and node creations must use `MERGE` semantics instead of destructive drop-and-recreate.
2. **Snapshot Pre-Condition**: Database backups are mandatory prior to executing any schema change.
3. **Dry-Run Validation**: All ETL migrations must output a dry-run report of created, updated, and conflicting entities before committing.

---

## 2. Pre-Migration Checklist

1. **Verify Authoritative CSV Dataset**:
   - Verify `backend/data/bd_food_nutrients.csv` has 582 rows with unique codes:
     ```bash
     python3 -c "import pandas as pd; df = pd.read_csv('backend/data/bd_food_nutrients.csv'); assert len(df) == 582 and df['code'].nunique() == 582; print('✅ Dataset verified.')"
     ```
2. **Verify Backup Existence**:
   - `backend/data/bd_food_nutrients.csv.bak`
   - `backend/data/food_compatibility.csv.bak`
3. **Neo4j Snapshot (if live instance active)**:
   ```bash
   neo4j-admin database dump neo4j --to-path=/backups/neo4j_pre_migration.dump
   ```
4. **PostgreSQL / Prisma Backup**:
   ```bash
   pg_dump -U postgres -d desidiet_db > /backups/postgres_pre_migration.sql
   ```

---

## 3. Migration Procedure

### Step 1: Food Data Validation Dry-Run
Run the validator in dry-run mode:
```bash
PYTHONPATH=backend python3 -c "
from app.data.food_validator import load_and_validate_food_database
foods, report = load_and_validate_food_database()
print(f'Total: {report.total_records}, Valid: {report.valid_records}, Quarantined: {report.quarantined_records}')
assert report.valid_records >= 520
"
```

### Step 2: Neo4j Graph Migration (Idempotent MERGE)
Run `backend/migrate_to_graph.py` to ingest nutrients, foods, and compatibility edges:
```bash
PYTHONPATH=backend python3 backend/migrate_to_graph.py
```

### Step 3: Verify Integrity & Constraints
Run verification checks:
```bash
PYTHONPATH=backend python3 -m pytest backend/tests/test_food_validator.py
PYTHONPATH=backend python3 -m pytest backend/tests/test_portion_planner.py
PYTHONPATH=backend python3 -m pytest backend/tests/test_plan_verifier.py
```

---

## 4. Rollback Procedures

If an unexpected data corruption or failure occurs during ingestion:

### Reverting CSV Files
```bash
cp backend/data/bd_food_nutrients.csv.bak backend/data/bd_food_nutrients.csv
cp backend/data/food_compatibility.csv.bak backend/data/food_compatibility.csv
```

### Reverting Neo4j
Restore from the pre-migration snapshot:
```bash
neo4j-admin database load neo4j --from-path=/backups/neo4j_pre_migration.dump --overwrite-destination=true
```

### Reverting PostgreSQL
```bash
psql -U postgres -d desidiet_db < /backups/postgres_pre_migration.sql
```
