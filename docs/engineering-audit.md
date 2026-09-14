# DesiDiet — Engineering Audit

**Audit basis:** Commit `4242630` (HEAD, same as `42426305fb338c4e29c5baa20d9514efec1f2b57`).
**Produced by:** Code Improvement Master Prompt Phase A.

---

## 1. Endpoint Map

All endpoints are mounted in `backend/app/main.py`.

### Chat Prefix `/chat` (`app/routers/chat.py`)

| Endpoint | Auth | Safety Guard | Streaming | Notes |
|----------|------|-------------|-----------|-------|
| `POST /chat` (line 551) | JWT required | ❌ **None** — system prompt only | ✅ SSE | Main chat. Calls LLM with tools. No classifier. |
| `POST /chat/diet-plan-session` (line 1282) | JWT required | ❌ **None** | ❌ | Multi-turn diet collection session. No classifier. |
| `POST /chat/transcribe` (line 1396) | JWT required | ❌ **None** | ❌ | Voice → text. No classifier. |
| `POST /chat/realtime/session` (line 1463) | JWT required | ❌ **None** | ❌ | OpenAI Realtime. No classifier. |
| `GET  /chat/history` (line 1524) | JWT required | N/A | ❌ | Read-only. |
| `POST /chat/unified` (line 1567) | JWT required | ✅ Via LangGraph safety_guard_node | ❌ | **Only path with safety guard**. |

### Journal Endpoint

| Endpoint | Auth | Safety Guard | Notes |
|----------|------|-------------|-------|
| `POST /api/generate-plan` | ❌ **No auth** | ❌ **None** | Direct GraphRAG plan via `app/logic/planner.py`. Returns prose. No verifier. |

### WhatsApp (`app/routers/whatsapp.py`)

| Endpoint | Auth | Safety Guard | Notes |
|----------|------|-------------|-------|
| `POST /whatsapp/webhook` | Meta verify-token | ❌ **None** | Calls `/chat` SSE internally — also no classifier. |
| `POST /whatsapp/incoming` | Internal header | ❌ **None** | Calls `_generate_reply` → `/chat` SSE. |

### Personal Cooker

- `POST /personal-cooker/chat` — JWT auth; **no safety classifier**; calls NutriSaathi directly.

---

## 2. Confirmed Defects

### 2.1 Disease Matcher Fallback (CRITICAL)
**File:** `rag_engine/planner.py:103`, `app/logic/planner.py:101`
- "zzzzzzzzzz" → Tonsillitis; "Maintain" → Malnutrition; "no diabetes" → Diabetes
- Root cause: substring match finds "diabetes" in "no diabetes"; final fallback returns index 0

### 2.2 RDA Key Silent Demographic Coercion (HIGH)
**File:** `rag_engine/planner.py:182–185`
- Age 5/female → silently uses 14–18 adolescent RDA
- Missing gender → silently mapped to male

### 2.3 Ambiguous Nutrient Label (HIGH)
**File:** `rag_engine/planner.py:118–164`
- "Vitamin B" maps to whichever B-vitamin appears first in corpus; no warning

### 2.4 Cosine Score Misrepresented (HIGH)
**File:** `rag_engine/planner.py:190–276`
- (0.01,0.01) and (0.90,0.90) both score 1.0; not an adequacy measure

### 2.5 Safety Guard Fails Open (CRITICAL)
**File:** `app/agents/safety_guard.py:80–84`
- Any exception → `is_safe=True, is_in_scope=True` — classifier bypass via outage

### 2.6 SSE/WhatsApp Bypass Safety Guard (CRITICAL)
**File:** `app/routers/chat.py:551`
- Only `/chat/unified` uses safety_guard_node; all other paths bypass it

### 2.7 Cache Not User-ID Scoped (HIGH)
**File:** `app/core/token_optimizer.py:41–80`
- Keyword list heuristic only; no user-ID in cache key

### 2.8 Iron Hard-Code + Heuristic Unit Conversion (MEDIUM)
**File:** `validate_project.py:85,124`
- rda_target_iron = 29.0 (pregnancy value); unit inferred from magnitude

### 2.9 Duplicate Planner Logic (MEDIUM)
- `rag_engine/planner.py` and `app/logic/planner.py` share ~80% code; bugs fixed in one may be absent in the other

### 2.10 No Post-Generation Plan Verifier (HIGH)
**File:** `app/logic/planner.py:279–368`
- LLM prose returned directly without schema, numeric, or constraint checks

---

## 3. Implementation Status & Resolutions

All confirmed defects and architectural phases from the Master Prompt have been resolved, verified, and accompanied by automated tests:

| Phase | Description | Status | Verification & Evidence |
|---|---|:---:|---|
| **Phase A** | Execution model map & endpoint audit | ✅ Complete | Documented in `docs/engineering-audit.md` |
| **Phase B** | Reconcile food data & units | ✅ Complete | `backend/app/data/food_validator.py`, `docs/data-provenance.md`, `test_food_validator.py` (12/12) |
| **Phase C** | Clinical scope & reference selection | ✅ Complete | `backend/app/data/reference_intakes.py`, `docs/nutrition-rule-review.md`, `test_reference_intakes.py` (9/9) |
| **Phase D** | Portion-based planning engine | ✅ Complete | `backend/app/logic/portion_planner.py`, `test_portion_planner.py` (7/7) |
| **Phase E** | Deterministic plan verifier | ✅ Complete | `backend/app/logic/plan_verifier.py`, `meal_plan_service.py`, `test_plan_verifier.py` (6/6) |
| **Phase F** | Safety guard, caching & idempotency | ✅ Complete | `chat.py` (SSE guard), `token_optimizer.py` (profile isolation), `meal_tracking.py` (idempotency), `test_cache_isolation.py` (4/4) |
| **Phase G** | Operational reliability & logging | ✅ Complete | `backend/app/core/llm_client.py` (request UUIDs, latency tracking, bounded exponential retries) |
| **Phase H** | Research evaluation suite & documentation | ✅ Complete | `backend/benchmarks/` (6 adapters, manifests, runner, evaluator), `docs/migration-guide.md`, `docs/evaluation-protocol.md`, `docs/research-claims.md`, `docs/implementation-status.md` |

**Automated Test Suite:** 101 / 101 tests passing (`PYTHONPATH=backend pytest backend/tests/`).
