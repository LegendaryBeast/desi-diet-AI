# DesiDiet — Research Claims & Evidence Matrix

**Document Version:** 1.0.0  
**Date:** September 2026  
**Purpose:** Honest, evidence-traceable mapping of all manuscript and technical claims to verified code, data, tests, and clinical status.

---

## 1. Claim Classification Standard

Per Master Prompt Rule 1:
> *"The long-term research goal is a defensible journal paper. Better code alone does not establish novelty, clinical safety, or Q1 publishability. Do not invent nutrition standards, expert approvals, benchmark outcomes, user-study results, or citations."*

Every scientific and engineering claim is categorized into one of four verified tiers:
1. `PROVEN_IN_CODE_AND_TESTS`: Deterministically verified via unit/integration tests with independent oracles.
2. `TESTED_LOCALLY_OFFLINE`: Evaluated on synthetic benchmark manifests without live human clinical trials.
3. `REQUIRES_EXPERT_REVIEW`: Clinically grounded in guidelines (NDG 2025), but requires formal hospital dietitian sign-off.
4. `REQUIRES_CLINICAL_TRIAL`: Real patient health outcomes, biometric improvements, or clinical efficacy (NOT claimed).

---

## 2. Evidence Matrix

| Claim ID | Scientific / Technical Claim | Status | Code & Test Evidence | Limitations / Ground Truth |
|---|---|---|---|---|
| **CLM-01** | Authoritative single-source food composition database with 582 unique canonical foods. | `PROVEN_IN_CODE_AND_TESTS` | `backend/data/bd_food_nutrients.csv`, `backend/tests/test_food_validator.py` | 582 rows, 582 unique codes. Redundant scrape files eliminated. |
| **CLM-02** | Explicit mass and energy unit conversion without magnitude inference. | `PROVEN_IN_CODE_AND_TESTS` | `backend/app/data/food_validator.py:convert_mass`, `test_food_validator.py::TestUnitConversions` | Strict $1\text{g} = 1000\text{mg} = 1e6\text{mcg}$, $1\text{kcal} = 4.184\text{kJ}$. Unsupported units throw `ValueError`. |
| **CLM-03** | Anomaly quarantine isolates physical impossibilities (proximate sum $>105\text{g}$, extreme densities). | `PROVEN_IN_CODE_AND_TESTS` | `backend/app/data/food_validator.py:FoodValidator`, `test_food_validator.py::TestPlausibilityAndQuarantine` | Isolates 57 items with unit inconsistencies in historical `BD_original` data. |
| **CLM-04** | Formal resolution of adult female iron standard: 8.1 mg EAR vs 29 mg RDA. | `PROVEN_IN_CODE_AND_TESTS` | `backend/app/data/reference_intakes.py:get_base_adult_rules`, `test_reference_intakes.py::TestIronStandardAdjudication` | Grounded in NDG Bangladesh 2025 Table 20 (10% bioavailability) and ICMR-NIN 2020. |
| **CLM-05** | Disease matcher handles negation ("no diabetes"), goals ("Maintain"), and gibberish. | `PROVEN_IN_CODE_AND_TESTS` | `backend/app/logic/planner.py:match_disease_exact`, `backend/tests/test_disease_matcher.py` (40/40 passed) | Solves historical bug where "no diabetes" selected Diabetes, "Maintain" selected Malnutrition. |
| **CLM-06** | Cosine similarity labelled as direction-only experimental baseline. | `PROVEN_IN_CODE_AND_TESTS` | `backend/rag_engine/planner.py:_cosine_baseline`, `docs/engineering-audit.md` | Clear documentation that cosine score measures angular direction, not nutritional adequacy. |
| **CLM-07** | Deterministic portion-based planner solving $\text{Total} = \sum g \times N / 100$. | `PROVEN_IN_CODE_AND_TESTS` | `backend/app/logic/portion_planner.py:PortionPlanner`, `backend/tests/test_portion_planner.py` | Solves exact gram portions for 5 daily meal slots with spice cap ($\le 10\text{g}$) and salt limit ($\le 5\text{g}$). |
| **CLM-08** | Post-generation plan verifier flags hallucinated items, numeric drift, and clinical violations. | `PROVEN_IN_CODE_AND_TESTS` | `backend/app/logic/plan_verifier.py:PlanVerifier`, `backend/tests/test_plan_verifier.py` | Rejects fake food IDs, excessive spices, and contraindicated sugars for diabetes. |
| **CLM-09** | Fail-safe safety guard on streaming SSE chat and multi-condition cache isolation. | `PROVEN_IN_CODE_AND_TESTS` | `backend/app/agents/safety_guard.py`, `backend/app/core/token_optimizer.py`, `backend/tests/test_cache_isolation.py` | Safety outages fail safe (refuse), and cache keys are scoped by profile condition hashes. |
| **CLM-10** | Clinical efficacy in lowering patient HbA1c or systolic blood pressure. | `REQUIRES_CLINICAL_TRIAL` | None (explicitly NOT claimed) | Cannot be claimed without prospective human clinical trials approved by an Institutional Review Board (IRB). |
| **CLM-11** | Pediatric nutrition for infants under 2 years of age. | `REQUIRES_EXPERT_REVIEW` | `backend/app/data/reference_intakes.py` returns `UNSUPPORTED` | Infant nutrition requires clinical pediatric supervision and is intentionally out of scope. |
