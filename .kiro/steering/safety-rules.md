---
mode: always
---

# Safety, Privacy, and Guardrails Rules

These rules govern LLM interactions, database safety, caching constraints, and clinical boundaries.

## 1. Safety Guardrail Constraints
* **PII Detection**: Do not cache personal queries or PII metrics globally. Ensure queries with words like "my", "password", or Bengali terms like "আমি" are marked as uncacheable using `TokenOptimizer.is_cacheable`.
* **Clinical Boundary Protection**:
  * **No drug dosages or medical prescription**: If a user asks for medicines or clinical drug dosages, the model must refuse and direct them to a doctor.
  * **No medical diagnosis**: The bot must never diagnose diseases based on symptoms (e.g. "Do I have malaria?").
  * **Scope control**: Immediate block on any queries unrelated to health metrics, food, diet, nutrition, or cooking.

## 2. Ingestion Guardrails (Contextual RAG)
* All text data ingested into Pinecone must use **Semantic Chunking** based on embedding cosine similarity (threshold 0.65, max length 1000 characters).
* Sub-chunks must be prepended with Anthropic-style global document context summaries in `<context> ... </context>` tags to avoid losing contextual relevance.
