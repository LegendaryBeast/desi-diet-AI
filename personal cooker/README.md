# Personalized Cooking Assistant — Contextual RAG Engine

This module provides a standalone, personalized cooking assistant for Bangladeshi cuisine, optimized using **Anthropic-style Contextual RAG** to retrieve highly relevant clinical and culinary information.

## Overview

The cooking assistant retrieves contextually enriched text chunks from the National Dietary Guidelines for Bangladesh (NDG) to guide meal prep, ingredient substitutions, and cooking techniques for users with chronic medical conditions (e.g., Diabetes, Hypertension, Chronic Kidney Disease).

---

## Data Assets

* **`Ragdata.md`**: The primary knowledge base. It is structured as self-contained document chunks separated by `---` delimiters. Each chunk contains metadata tags (e.g., `CONDITION`, `CATEGORY`, `KEYWORDS`, `QUERY_TRIGGERS`) for search alignment.
* **`guideline.md`**: Additional dietary guidelines and clinical reference data.
* **`v2.md`**: Supplementary rules and recipe frameworks for local Bangladeshi dishes (e.g., cooking dal without excess sodium, modifying traditional diabetic breakfasts).

---

## Contextual RAG Architecture

Rather than performing simple vector search on raw text chunks, this module implements **Anthropic-style Contextual RAG** during ingestion to address retrieval degradation in generic chunking.

### 1. Document Context Prepending
For each chunk, the ingestion engine generates a global-document-level context prefix summarizing:
* The source document (*National Dietary Guidelines for Bangladesh*)
* The targeted condition (e.g. `Diabetes Mellitus`)
* The targeted dietary category (e.g. `Allowed Foods`)

### 2. Context Wrapping
The generated context is wrapped in `<context>` tags and prepended directly to the chunk text prior to embedding generation:
```html
<context>
This chunk is from the National Dietary Guidelines for Bangladesh. It outlines clinical constraints... for condition: "diabetes" within category: "allowed_foods".
</context>

## CHUNK: DM_ALLOW_001
**CONDITION:** diabetes...
[Raw Chunk Content]
```

### 3. Local Embedding & Vector Upsert
The combined string is encoded into a **384-dimensional vector** using the local `all-MiniLM-L6-v2` transformer and stored inside a Pinecone vector index (`bd-cooking-rag`).

---

## Quick Start & Ingestion

### Prerequisites
Make sure your environment variables in `personal cooker/backend/.env` are configured:
```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=bd-cooking-rag
```

### Running Ingestion
To ingest the knowledge base using the **Contextual RAG pipeline**:

1. Navigate to the backend directory:
   ```bash
   cd "personal cooker/backend"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Contextual RAG ingestion script:
   ```bash
   npm run ingest:contextual
   ```
