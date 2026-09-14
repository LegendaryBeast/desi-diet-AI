# DesiDiet — Code Improvement Master Prompt

Copy the entire prompt below into a coding agent with access to the repository. Attach the earlier audit and research plan if available; the prompt also includes the essential findings. This prompt requests implementation work. It does not authorize production deployment or changes to live user data.

---

Act as a senior software engineer and research engineer working on DesiDiet, a Bangladeshi nutrition assistant.

Repository: https://github.com/LegendaryBeast/desi-diet-AI

Your task is to inspect the current project, fix verified correctness and reliability defects, implement an evidence-traceable planning and validation pipeline, and create a reproducible evaluation harness. Work directly in the codebase. Deliver working changes and evidence, not only recommendations or a plan.

The long-term research goal is a defensible journal paper. Better code alone does not establish novelty, clinical safety, or Q1 publishability. Do not invent nutrition standards, expert approvals, benchmark outcomes, user-study results, or citations.

## 1. Working rules

1. Read applicable repository instructions. Inspect the current branch, commit, uncommitted changes, dependencies, tests, schema, and request paths. Treat the historical audit below as evidence to recheck, not as a description guaranteed to match the current revision.
2. Preserve unrelated changes and existing useful features. Use an isolated working branch or worktree when appropriate. Avoid a wholesale rewrite or new infrastructure unless a demonstrated limitation requires it.
3. Implement changes in coherent phases. Keep a task ledger with findings, changed files, evidence, and remaining dependencies. Continue through all executable work; do not stop after producing a plan or fixing the first issue.
4. Make reasonable implementation choices from the existing stack. Check current official documentation when dependency behavior is uncertain. Do not upgrade packages indiscriminately.
5. Preserve raw research inputs and historical traces. Do not overwrite them with corrected data or mix historical and new results. Keep source attribution and existing license information.
6. Do not run destructive graph migrations, reset production databases, expose secrets, alter live medical records, deploy, or publish without explicit authorization. Use synthetic profiles and isolated databases for development. Prepare migration previews and rollback procedures first.
7. If a required source document, clinical judgment, credential, or service is unavailable, complete the independent engineering work, clearly mark the blocked dependency, and continue. Never fabricate an input or mark a mocked service test as a live experiment.
8. Do not claim completion while a critical finding remains unresolved. Distinguish `implemented`, `tested locally`, `integration tested`, `requires expert review`, and `blocked`.

## 2. Historical findings to reproduce or resolve

An audit of commit `42426305fb338c4e29c5baa20d9514efec1f2b57` found:

- `backend/data/bd_food_nutrients.csv`: 582 rows, 32 columns, 575 distinct literal food codes. Six different foods shared the placeholder `code`; `02_0001` and `02_0014` each appeared twice. This is not an instruction to delete seven rows.
- Source labels: 258 `FCT_2014`, 5 `FCT_2014+BD`, and 319 `BD_original`. These labels did not independently establish source provenance. The bundled Bangladesh food-composition book states first edition June 2013 despite “2014” in its filename.
- The supplementary food file contained 422 columns, including descriptors; they were not all nutrient dimensions. A master CSV referenced by the merge script was absent.
- The reference-intake table contained 330 rows: 33 nutrient labels and ten demographic combinations. Adult-female iron was 8.1 mg in the file, while manuscript passages also used 29 mg. Neither should be selected as clinical truth without verifying the actual standard and requirement definition.
- The isolated disease matcher returned `Tonsillitis` for `zzzzzzzzzz`, `Malnutrition` for `Maintain`, and `Diabetes` for `no diabetes`.
- Age 5/female selected a female 14–18 reference key; unspecified gender defaulted to male. `Vitamin B` remained ambiguous rather than resolving reliably to B12.
- The planner used cosine similarity to an all-ones target. Vectors `(0.01,0.01)` and `(0.90,0.90)` both score 1; every positive one-dimensional vector also scores 1. This score cannot establish nutritional adequacy by itself.
- The archived “cosine distribution” producer summed nutrient amounts. Its scores were not measurements from the production cosine ranker. Single-nutrient rank stability did not prove useful personalization.
- The unified endpoint checked its cache before the graph safety classifier. Streaming and realtime handlers followed different paths. Classifier exceptions failed open.
- Cache interfaces were query-based with keyword filtering; the audit identified a context-isolation concern, not an observed live data leak.
- Fifty archived latency observations were split retrospectively into 21 long and 29 short records without verified cache labels. Their 11.13 mean ratio was not a controlled speedup estimate.

Relevant paths to inspect, while following current imports and callers:

- `backend/rag_engine/planner.py` and `backend/app/logic/planner.py`
- `backend/scripts/merge_food_databases.py`, `backend/migrate_to_graph.py`, and other active ingestion scripts
- `backend/data/`, `backend/prisma/schema.prisma`
- `backend/app/routers/chat.py`, `meal_plan.py`, `meal_tracking.py`, `whatsapp.py`, and relevant voice/cooking handlers
- `backend/app/agents/graph.py`, `safety_guard.py`, `pusti_ai_node.py`, `nutrisaathi_node.py`
- `backend/app/core/token_optimizer.py`
- `backend/app/services/meal_plan_service.py`, `diet_plan_chat_service.py`, and `chat_tools.py`
- `backend/validate_project.py` and existing tests for portion mapping, meal unlogging, and slot regeneration

If supplied, read `audit_results.json`, `reproduce_audit.py`, and `DesiDiet_Review_and_Research_Plan.md`. Do not assume the application calls a module merely because its filename says “planner.”

## 3. Phase A — Establish the current execution model

Map every supported client request to authentication, authorization, context loading, policy checks, retrieval, planning, generation, verification, caching, persistence, and response rendering.

Identify duplicated or obsolete logic and select the actual serving pipeline to become the shared implementation. Integrate fixes into all relevant callers. A corrected function used only by a benchmark does not count as an application fix.

Run available baseline tests and report existing failures separately from new regressions. Capture source/data hashes, row counts, and dependency versions without revealing credentials. Record which suspected defects are confirmed, already fixed, or unreachable under validated inputs.

## 4. Phase B — Reconcile food data and units

Implement a versioned data-validation and normalization layer:

- Assign stable semantic food identifiers. Distinguish different food states, edible parts, varieties, recipes, and ingredients. Preserve legacy-to-canonical mappings so references can be migrated safely.
- Resolve the placeholder code collisions. Reconcile repeated real codes field by field; retain complementary source information rather than blindly deduplicating.
- Represent original value/unit, canonical value/unit, reference quantity, food state, source identifier, page/row, conversion rule, data version, and review status.
- Distinguish measured zero, missing, trace, unsupported, and conflicting values. Reject negative, nonfinite, malformed, or dimensionally incompatible numeric inputs as appropriate.
- Convert from explicit units only. Never infer grams versus milligrams from magnitude. Preserve kcal/kJ separately from mass; do not convert IU, nutrient equivalents, or household measures without an applicable documented conversion.
- Keep conversion precision internally and round at presentation. Include invariants and source-grounded conversion fixtures.
- Preserve food-level and nutrient-level completeness. Do not make an unknown concentration appear to be measured zero or mark a partly known plan as fully verified.
- Quarantine consequential outliers and unresolved source conflicts. Do not “repair” a suspicious concentration using an LLM's guess.

Recover the missing source input if available through authorized resources. Otherwise publish a reconstruction gap and work with the versioned derived file as explicitly provisional data. Do not create a replacement input while claiming it is original.

Make ETL idempotent and supply a dry-run report with created/updated/conflicting entities. Test ingestion only in an isolated graph. Replace default destructive full purges with a reviewable migration strategy and preserve current identifiers where possible.

Acceptance: input counts reconcile through a documented mapping; valid conversions reproduce from explicit units; missingness survives ingestion and retrieval; unresolved records cannot silently enter a verified plan; a fresh isolated ingestion reproduces its manifest.

## 5. Phase C — Make clinical scope and reference selection explicit

Build typed reference and rule records with source edition, location, requirement type, applicable population, units, review status, and version. Distinguish RDA, EAR, AI, upper limits, and disease-specific restrictions instead of calling every number “RDA.”

Implement the mechanism for approved rules without inventing the rules. Resolve the iron-standard discrepancy from primary evidence and qualified review; do not automatically replace 8.1 with 29 or multiply either by a guessed factor.

Represent supported age ranges and relevant physiological categories explicitly. Missing or unsupported inputs must return `needs_clarification`, `unsupported`, or another documented state. Do not map children to adolescents or missing information to male by default. Collect only information needed by the applicable standard and explain why it is needed.

Separate disease labels from goals, symptoms, family history, negation, and hypothetical questions. Remove the fallback to the first disease. Implement canonical, reviewed Bangla/English aliases, with ambiguity detection and transparent matching evidence. “No diabetes” must not become an affirmative diagnosis; a general maintenance goal must not become malnutrition.

Do not infer an exact nutrient such as B12 from the ambiguous label “Vitamin B.” Use reviewed mappings or ask for clarification. Disease combinations require explicit rule compatibility, not only a union of nutrients.

Acceptance: historical counterexamples no longer silently select a disease/reference; missing prerequisites are visible; unreviewed rules cannot be reported as clinically approved; benign general nutrition interactions remain usable within a defined safe scope.

## 6. Phase D — Implement portion-based planning

Retain the historical cosine implementation as a clearly labelled experimental baseline when useful. Correct deterministic ordering, canonical nutrient alignment, and graph-edge uniqueness. Do not keep presenting cosine as adequacy.

Implement a transparent planning method using the simplest suitable solver or deterministic search compatible with the project. Its core total is:

`nutrient_total_i = sum(edible_grams_f × nutrient_i_per_100g_f / 100)`

Use consistent raw/cooked state and explicitly supported recipe-yield or household-measure conversions. Include all ingredients, including oil, salt, condiments, snacks, and approved substitutions.

Represent meal slots, portion bounds, supported energy/nutrient targets, allergies, dietary preferences, availability, and expert-approved restrictions. Distinguish hard restrictions from soft targets. Never silently relax a hard safety restriction to produce a plan. If necessary data are missing or constraints conflict, return a structured explanation of why planning cannot be completed.

Prevent pathological high-density suggestions such as unrealistic quantities of spices chosen to satisfy a nutrient objective. Make meal compatibility and portions explicit; do not rely exclusively on a cultural prompt. Any compatibility data generated automatically must be marked provisional until reviewed.

Separate nutrition validity from grocery promotion, subscription tier, and commercial recommendations. Price should influence an affordability objective only when the price, quantity, location, and date are known; missing prices must not be fabricated.

Acceptance: the planner returns either an explicit structured candidate with auditable totals or an appropriate non-completion state; fixtures exercise feasible, infeasible, missing-data, and conflicting-rule cases; deterministic runs reproduce under the same inputs and versions.

## 7. Phase E — Verify model output before users receive it

Create a shared typed plan representation containing canonical ingredient IDs, quantities, units, food states, meal slots, evidence references, applicable constraints, warnings, and status.

Treat model-generated meal content as untrusted proposed output. A deterministic verifier must check schema, ingredient identity, numeric validity, totals, hard constraints, supported substitutions, and source references after generation.

Preserve the validated plan as the source of truth. Prefer rendering verified numbers directly from structured data. The LLM may explain or translate the plan but must not change ingredients, quantities, totals, or verification status without revalidation. Do not assume prose is safe simply because a JSON object passed validation.

Bound any repair loop; record initial errors and repairs. If verification still fails, return a clear failure or clarification response rather than displaying a “verified” badge. Report partial evidence honestly. Do not describe a meal as proven safe for a disease solely because a system prompt instructed the model to say so.

For streaming or realtime channels, do not emit personalized recommendations before their required checks finish. Stream neutral progress or previously verified material if needed. When a channel cannot support equivalent verification, explicitly restrict its functionality to supported behavior.

Acceptance: injecting an unauthorized ingredient, changing a portion, inventing a citation, omitting pantry oil, or changing a verified number is detected; every user-facing path respects the same plan status.

## 8. Phase F — Correct request safety, tools, and caching

Implement a shared policy boundary applicable to unified chat, streaming, cooking, voice, WhatsApp, and other supported paths. Authentication and necessary authorization may happen before content classification; document actual ordering rather than promising “no database access.”

- Classifier timeout, malformed JSON, missing decision fields, and service outage must not silently authorize personalized advice or tool actions. Use explicit validated decisions and a safe degraded response where appropriate.
- Treat retrieved text, conversation content, and tool results as data rather than instructions that can override policy or authorization.
- Validate tool schemas and server-side ownership on every operation. Do not trust a model-supplied user ID. Apply established user confirmation rules for consequential actions.
- Preserve correct log/unlog behavior, slot regeneration, and idempotency. Retries must not duplicate meal logs or other writes. Use transaction boundaries appropriate to the existing persistence layer.
- Prevent shared reuse of personalized free-text answers. Prefer no shared caching for these responses. If personalized caching is required, isolate scope and account for profile, condition, language, conversation relevance, and model/prompt/data/rule/policy versions.
- Shared caching should contain only explicitly approved context-independent content. Revalidate applicable policy and freshness before serving. Do not cache tool actions for replay.
- Test exact and semantic near-miss collisions, profile changes, rule changes, expiration, and Redis fallback. Cache failures must not bypass checks.

Acceptance: two synthetic users with different restrictions cannot receive each other's contextual answer; stale plans cannot retain current verification status; unauthorized cross-user operations fail; classifier failures and retries have predictable tested behavior.

## 9. Phase G — Improve operational reliability where evidence warrants it

Inspect actual bottlenecks before optimization. Address blocking I/O in asynchronous handlers, connection lifecycle, repeated graph queries, excessive context, timeouts, cancellation, and bounded retry behavior where confirmed. Do not add services merely to enlarge the architecture.

Record request IDs, component timing, cache state, failure reason, model and prompt versions, token usage, and data/rule versions. Prefer provider token counts; label estimated counts as estimates. Keep personal health details and secrets out of routine logs. Make retries and degraded modes visible to diagnostics without exposing internal errors to users.

Maintain existing API compatibility where practical. Update affected clients when response status changes require it. Show understandable Bangla/English states for missing information, unsupported cases, partial evidence, and successful verified plans. Preserve accessibility and existing useful interfaces; redesign only where needed for the revised behavior.

Acceptance: supported application workflows still work; new status types render correctly; measured performance statements have a recorded workload and environment; no unsupported speedup claims are added.

## 10. Phase H — Build research-grade evaluation of the real pipeline

Replace ad hoc scripts that calculate a different score from production. Benchmark the actual serving planner and verifier, with versioned synthetic scenario manifests and stored raw outputs.

Provide explicit adapters for:

| System | Controlled comparison |
|---|---|
| Direct LLM | Same task/model, no retrieval |
| Text/vector RAG | Matched cleaned facts and source coverage |
| Current graph cosine | Historical ranking objective on cleaned inputs |
| Relational cosine | Same facts, score and generator as graph cosine |
| Simple coverage-aware ranking | A transparent stronger heuristic |
| New portion-constrained method | The implemented method with explicit verification |

Use the same model snapshot and comparable evidence/context budgets when isolating a component. Keep original-data and corrected-data comparisons separate from algorithm comparisons. Clearly distinguish an adapted implementation from a faithful reproduction of a published baseline.

Use a common external evaluator for every system. Store raw output, verifier result, repair attempts, abstention, and final output separately. Do not make an always-refusing system look successful: report valid completion, critical violations, and appropriate abstention with explicit denominators. Unknown measurements must not count as satisfied constraints.

Include matched Bangla, English, and code-mixed scenario variants, with a shared family ID. Keep related variants in the same development/test split. Generated scenarios and gold rules are provisional until reviewed. Repeated generations and translations are not independent participants.

Required metric support:

- Valid completion on gold-feasible planning cases.
- Critical violations per attempted case and per issued plan, with coverage.
- Appropriate clarification/abstention on unsupported or infeasible cases.
- Nutrient and energy error recalculated from actual portions; missingness coverage.
- Source support, fabricated ingredients/citations, retrieval relevance where labelled gold exists.
- Language consistency and prespecified profile counterfactuals.
- Expert-rating templates, unadjudicated agreement, and adjudication fields.
- Actual cache-labelled p50/p95 latency, timeouts, token usage, and cost per valid response.

Implement paired, scenario-family-level uncertainty estimates for supported comparisons. Use prespecified comparisons and report errors as well as successes. Do not choose thresholds, cases, or nutrition values to obtain statistical significance.

When model services or credentials are unavailable, deliver working offline fixtures and adapters with explicit `not_run` status for live benchmarks. Never fill final result tables with illustrative numbers. Preserve the old latency trace as historical unlabelled evidence; do not relabel it as a new experiment.

## 11. Required tests and independent oracles

Write focused tests for the consequential behavior changes. Expected numeric totals must come from independently calculated fixtures or validated sources, not a call to the same function under test.

Required cases include:

1. Duplicate IDs and source conflicts cannot silently overwrite food entities.
2. Explicit g/mg/µg conversion and unit round trips; unknown is not zero; energy remains dimensionally valid.
3. Disease negation, family history, goals, gibberish, and unsupported demographics produce the defined states.
4. Cosine counterexamples remain visible in the baseline; the new planner evaluates portion-level adequacy separately.
5. Portion totals include oil/salt and match independently computed values; incompatible food states are rejected.
6. Hard constraints survive generation, translation, substitutions, and bounded repair; missing hard-constraint evidence prevents a verified outcome.
7. Cross-profile cache isolation, invalidation, malformed safety decisions, outages, and unauthorized tool actions.
8. Existing portion-mapping, slot-regeneration, and log/unlog behaviors continue to work; repeated writes are idempotent.
9. Every supported route uses the appropriate shared checks; mocks are clearly distinguished from integration tests.
10. Test-family leakage checks, correct metric denominators, and reproducible table generation from archived new-run traces.

After these risks and required project gates are sufficiently verified, stop optional test expansion and finish the deliverables.

## 12. Deliverables and completion criteria

Provide actual code changes, required client adaptations, migration tooling, tests, and a concise final report. Create or update equivalents of:

- `docs/engineering-audit.md`: confirmed findings and current execution paths.
- `docs/data-provenance.md`: data dictionary, conversions, source gaps and versioning.
- `docs/nutrition-rule-review.md`: supported rules, evidence, outstanding expert decisions.
- `docs/migration-guide.md`: dry run, backup, isolated verification and rollback.
- `docs/evaluation-protocol.md`: scenarios, systems, metrics, failure handling and analysis.
- `docs/research-claims.md`: each claim linked to code, data, test or experiment status.
- `docs/implementation-status.md`: completed changes, tested evidence and blockers.
- A reproducible research directory with manifests, baseline adapters, validators, analysis commands and clearly separated raw results.

Reuse existing documentation and test organization where possible rather than creating redundant structures. Include one concise command sequence for setup, offline checks, isolated integration checks, and benchmarks. State what each command requires and what it actually verifies.

In your final response, report:

1. Which verified defects were fixed and how behavior changed.
2. Which files/modules changed.
3. Tests and experiments actually executed, with outcomes and limitations.
4. Remaining source-data, expert-review, credential, or infrastructure dependencies.
5. The migration and rollback status.
6. The research claims the new evidence supports, and those still unsupported.

Success means an integrated, traceable implementation with honest validation status. Do not call the project clinically validated or Q1-ready merely because engineering tests pass.

Start by inspecting the current repository and reproducing the relevant historical findings. Then implement the phases, maintaining reviewable checkpoints and continuing through all work that can be completed with the available evidence and authorization.
