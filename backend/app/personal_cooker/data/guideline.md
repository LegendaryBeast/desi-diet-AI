# Development Guideline
## Personalized Bangladeshi Cooking Assistant — RAG-Based System for Health Conditions

> **Target Users:** Patients in Bangladesh with diabetes, hypertension, CKD, liver disease, obesity, hypothyroidism, TB, diarrhoea, kidney stones, heart disease, and cancer — seeking culturally relevant, medically safe cooking guidance.

---

## 1. System Overview

```
User Query (Bengali or English)
        │
        ▼
  Query Processor
  (Intent + Condition Detection)
        │
        ▼
  Retrieval Engine ──► Vector Database (RAG Knowledge Base)
        │                  (BD_Cooking_Guidelines + expanded Q&A)
        ▼
  Context Builder
  (retrieved chunks + user profile)
        │
        ▼
  LLM Response Generator
  (Claude / GPT-4 / Gemini)
        │
        ▼
  Post-processor
  (safety disclaimer injection, Bengali translation if needed)
        │
        ▼
  Final Answer to User
```

### Core Principle
The system does NOT generate dietary advice from scratch. It **retrieves** medically grounded chunks from the Bangladesh National Dietary Guidelines 2022 knowledge base (sourced from BIRDEM / WHO / ADA / FAO), then uses the LLM only to **synthesise, personalise, and communicate** the retrieved content in a conversational, culturally appropriate way.

---

## 2. Tech Stack Recommendation

| Layer | Recommended Option | Alternative |
|---|---|---|
| **LLM** | Graq api
| **Embedding Model** | `text-embedding-3-small` (OpenAI) | `multilingual-e5-large` (supports Bengali) |
| **Vector Database** | Pinecone (managed) 
| **Orchestration** | LangChain 
| **Backend API** | FastAPI (Python)
| **Frontend** | React (web) 
| **Database (User Profiles)** | PostgreSQL 
| **Language Detection** | `langdetect` Python lib | Google Language API 
| **Deployment**  Render 

> **For Bengali language support:** Use `multilingual-e5-large` as the embedding model. It handles Bengali script natively. If using OpenAI embeddings, translate the query to English first before embedding.

---

## 3. Knowledge Base Design (RAG Documents)

### 3.1 Document Structure
Each chunk in the RAG knowledge base should be a **self-contained, semantically complete unit**. The optimised source document (see companion file `BD_Cooking_RAG_KnowledgeBase.md`) follows this structure:

```
CHUNK_ID: [unique ID]
CONDITION: [e.g., Diabetes]
CATEGORY: [Allowed_Foods | Avoided_Foods | Cooking_Tips | Nutritional_Parameters | Q&A]
KEYWORDS: [comma-separated searchable terms]
LANGUAGE_TAGS: [English, Bengali food names]
CONTENT: [the actual chunk text]
```

### 3.2 Chunking Strategy

| Chunk Type | Size | Use Case |
|---|---|---|
| **Parameter chunks** | 150–200 tokens | "What are the daily fibre requirements for a diabetic?" |
| **Ingredient recommendation chunks** | 200–300 tokens | "What vegetables can I eat with high BP?" |
| **Cooking tip chunks** | 100–200 tokens | "How should I cook rice for diabetes?" |
| **Q&A pairs** | 150–250 tokens | "How do I make low-sugar tea?" |
| **Full condition summaries** | 400–500 tokens | "Give me an overview of a CKD diet" |

**Do NOT** create one giant chunk per condition. Split into the above categories for precise retrieval.

### 3.3 Metadata Fields (per chunk)

```json
{
  "chunk_id": "DM_COOKING_001",
  "condition": ["diabetes"],
  "category": "cooking_tips",
  "subcategory": "beverages",
  "language": "en",
  "keywords": ["tea", "sugar-free", "cinnamon", "darchini", "chaa", "cha"],
  "food_names_bengali": ["চা", "দারচিনি"],
  "source": "National Dietary Guidelines Bangladesh 2022 - BIRDEM",
  "safety_level": "general",  // or "consult_physician"
  "last_updated": "2024-01-01"
}
```

---

## 4. Query Processing Pipeline

### 4.1 Intent & Condition Detection

Every user message must pass through an intent extraction layer **before** retrieval.

```python
# Pseudo-code for intent extraction
def extract_intent(user_message: str) -> dict:
    return {
        "condition": detect_condition(user_message),    # e.g., "diabetes"
        "query_type": detect_query_type(user_message),  # e.g., "recipe_request"
        "food_item": extract_food_item(user_message),   # e.g., "tea"
        "language": detect_language(user_message),      # e.g., "en" or "bn"
    }
```

**Condition Detection — Key Triggers:**

| Condition | English Keywords | Bengali Keywords |
|---|---|---|
| Diabetes | diabetes, sugar, blood glucose, diabetic | ডায়াবেটিস, সুগার, মধুমেহ |
| Hypertension | high blood pressure, hypertension, BP | উচ্চ রক্তচাপ, হাইপারটেনশন |
| CKD | kidney disease, renal, CKD, creatinine | কিডনি রোগ, বৃক্কের সমস্যা |
| Liver Disease | liver, fatty liver, hepatitis, jaundice | লিভার, হেপাটাইটিস, জন্ডিস |
| Obesity | weight loss, fat, overweight, obesity | ওজন কমানো, মোটা |
| Hypothyroidism | thyroid, hypothyroid | থাইরয়েড |
| TB | tuberculosis, TB | যক্ষ্মা, টিবি |

### 4.2 Query Rewriting

Before vector search, rewrite the query to maximise retrieval accuracy:

```python
def rewrite_query(raw_query: str, condition: str, food_item: str) -> str:
    """
    Input:  "how can i make a tea for me" (from a diabetic patient)
    Output: "low sugar tea preparation cooking tips for diabetes patients
             using cinnamon darchini alternatives to sugar in tea"
    """
    template = f"""
    User condition: {condition}
    User query: {raw_query}
    Rewrite this as a detailed search query for a medical nutrition database.
    Include the condition, the food item, and relevant dietary concern keywords.
    """
    return llm_rewrite(template)
```

### 4.3 Hybrid Retrieval

Use **hybrid search** (semantic + keyword) for best results:

```python
def retrieve(query: str, metadata_filter: dict, top_k: int = 5):
    # 1. Dense retrieval (semantic similarity)
    dense_results = vector_db.similarity_search(
        query=query,
        filter={"condition": metadata_filter["condition"]},
        top_k=top_k
    )
    # 2. Keyword / BM25 retrieval
    keyword_results = bm25_index.search(query, top_k=top_k)

    # 3. Reciprocal Rank Fusion
    return reciprocal_rank_fusion(dense_results, keyword_results, top_k=top_k)
```

---

## 5. User Profile System

Store per-user health profiles to personalise every response:

```json
{
  "user_id": "user_12345",
  "conditions": ["diabetes", "hypertension"],
  "medications": ["metformin", "amlodipine"],
  "dietary_restrictions": ["no_beef"],
  "language_preference": "bn",
  "age_group": "adult",
  "location": "Dhaka",
  "last_consultation_date": "2024-06-01"
}
```

When the user has **multiple conditions** (e.g., diabetes + CKD), retrieve chunks for both conditions and apply a conflict resolution layer:

```python
def resolve_dietary_conflicts(chunks_condition_a, chunks_condition_b):
    """
    Example conflict: 
      Diabetes says: eat high-fibre brown rice
      CKD says: avoid high-phosphorus brown rice
    Resolution: CKD restriction takes clinical precedence → use white rice in small portions
    """
    # Pass both chunk sets to LLM with explicit conflict resolution instruction
    ...
```

---

## 6. Prompt Engineering

### 6.1 System Prompt Template

```
You are a personalised cooking assistant for Bangladeshi people with health conditions.
You help patients cook safe, healthy, culturally appropriate Bangladeshi meals.

RULES:
1. ONLY use the retrieved context provided below. Never invent dietary advice.
2. Adapt your answer to the user's specific health condition(s): {conditions}
3. Use familiar Bangladeshi ingredient names (e.g., dheros for okra, lau for bottle gourd).
4. Give specific, practical, step-by-step cooking guidance.
5. Mention what to AVOID alongside what to USE.
6. Always end with: "Please consult your doctor or dietitian for personalised advice."
7. If the user writes in Bengali, respond in Bengali.
8. Keep tone warm, supportive, and non-alarming.

RETRIEVED CONTEXT:
{retrieved_chunks}

USER PROFILE:
- Condition(s): {conditions}
- Medications: {medications}
- Dietary restrictions: {dietary_restrictions}
```

### 6.2 Example Interaction Flow

**User query:** "how can i make a tea for me" (user profile: diabetic)

**Step 1 — Intent extraction:**
```json
{
  "condition": "diabetes",
  "query_type": "recipe_request",
  "food_item": "tea",
  "language": "en"
}
```

**Step 2 — Rewritten query:**
`"low sugar tea recipe for diabetes patient cinnamon darchini no sugar alternatives"`

**Step 3 — Retrieved chunks:**
- DM_AVOID_002: Sugar, jaggery, honey in tea spike blood glucose — avoid completely
- DM_TIPS_004: Replace sugar in tea with cinnamon (darchini) for natural sweetness
- DM_ALLOW_010: Cinnamon contains insulin-sensitising compounds; safe for diabetics

**Step 4 — LLM response:**
```
Great question! Here's how to make a delicious, diabetes-safe tea:

DIABETES-SAFE BANGLADESHI TEA RECIPE:
• Use 1 cup of water and 1 cup of skimmed milk (গরুর স্কিমড দুধ)
• Add 1/2 tsp loose black tea leaves
• Add 1 small stick of cinnamon (দারচিনি) — boil for 2 minutes
• Optional: add 2–3 cardamom pods (এলাচ) for extra flavour
• DO NOT add sugar, gur, or honey — these spike blood glucose

Why this works: Cinnamon contains natural compounds that support insulin sensitivity. Skimmed milk gives calcium without saturated fat.

Please consult your doctor or dietitian for personalised advice.
```

---

## 7. Safety & Guardrails

### 7.1 Hard Rules
- **Never generate medical dosage advice** — redirect to physician
- **Flag high-risk combinations** (e.g., grapefruit + medications, high potassium in CKD)
- **Multi-condition conflict** — always apply the stricter restriction and flag it
- **Out-of-scope queries** — "I have chest pain" → redirect to emergency services

### 7.2 Disclaimer Injection
Every response must auto-append:
> *"এই তথ্য সাধারণ শিক্ষার জন্য। আপনার নিজস্ব অবস্থার জন্য অনুগ্রহ করে আপনার ডাক্তার বা পুষ্টিবিদের সাথে পরামর্শ করুন।"*
> *(This information is for general education. Please consult your doctor or dietitian for your individual condition.)*

### 7.3 Confidence Thresholds
```python
if retrieval_score < 0.65:
    response = "I don't have specific information about this. " \
               "Please consult a registered dietitian for guidance on " \
               f"{condition} and {food_item}."
```

---

## 8. Multi-language Support

| Priority | Language | Implementation |
|---|---|---|
| 1 | English | Native — primary knowledge base language |
| 2 | Bangla (Bengali) | Detect input language → translate query to EN → retrieve → translate response to BN |
| 3 | Bangla food names in English queries | Maintain a bilingual food name dictionary (see Section 3.3 metadata) |

**Bilingual food name dictionary (sample):**

```python
food_name_map = {
    "dheros": "okra",
    "lau": "bottle gourd",
    "jhinga": "ridge gourd",
    "korola": "bitter gourd",
    "chichinga": "snake gourd",
    "palong shak": "spinach",
    "shutki": "dried fish",
    "hilsha": "ilish fish",
    "ata": "whole wheat flour",
    "gur": "jaggery",
    "doi": "yogurt",
    "chira": "flattened rice",
    "siddha chal": "parboiled rice",
    "dabar pani": "coconut water",
    "darchini": "cinnamon",
}
```

---

## 9. Data Ingestion Pipeline

```
Source Document (BD_Cooking_RAG_KnowledgeBase.md)
        │
        ▼
 1. Parse markdown → individual chunks
        │
        ▼
 2. Extract metadata (condition, category, keywords)
        │
        ▼
 3. Generate embeddings (multilingual-e5-large or text-embedding-3-small)
        │
        ▼
 4. Upsert to Pinecone / Qdrant with metadata
        │
        ▼
 5. Build BM25 keyword index (optional, for hybrid search)
        │
        ▼
 6. Validate: run 20 test queries; check top-3 retrieved chunks are relevant
```

---

## 10. Evaluation Metrics

| Metric | Target | How to Measure |
|---|---|---|
| Retrieval Precision@3 | > 85% | Manual evaluation of top-3 chunks per query |
| Answer Relevance | > 4.0/5.0 | Human raters (medical + non-medical) |
| Condition Accuracy | 100% | Does every answer match the user's condition? |
| Safety Rate | 100% | Does every unsafe food get flagged correctly? |
| Bengali Query Success | > 80% | Test set of 50 Bengali queries |
| Response Latency | < 5 seconds | End-to-end API timing |

---

## 11. Phased Rollout Plan

### Phase 1 — MVP (Weeks 1–6)
- Ingest RAG knowledge base (11 conditions)
- Build FastAPI backend with basic RAG pipeline
- Single-turn Q&A in English
- Web interface (React)
- 3 test conditions: Diabetes, Hypertension, Obesity

### Phase 2 — Core Product (Weeks 7–14)
- User profile system (multi-condition support)
- Bengali language support
- Conflict resolution for multi-condition users
- Mobile app (React Native)
- All 11 conditions live

### Phase 3 — Advanced Features (Weeks 15–24)
- Meal planner: generate 7-day meal plans from RAG
- Recipe image upload → ingredient analysis
- Integration with local food databases (BD food nutrition data)
- Voice input support (Bengali speech-to-text)
- Doctor referral integration

---

## 12. Folder Structure

```
bd-cooking-rag/
├── data/
│   ├── raw/                         # Original source documents
│   ├── processed/
│   │   └── BD_Cooking_RAG_KnowledgeBase.md  # RAG-optimised chunks
│   └── food_name_dictionary.json    # Bilingual food names
├── ingestion/
│   ├── parse_chunks.py              # Markdown → chunk objects
│   ├── embed_and_upsert.py          # Embeddings → vector DB
│   └── validate_retrieval.py        # Test retrieval quality
├── api/
│   ├── main.py                      # FastAPI app
│   ├── intent_extractor.py          # Condition + query type detection
│   ├── query_rewriter.py            # Query expansion
│   ├── retriever.py                 # Hybrid retrieval
│   ├── response_generator.py        # LLM prompting + safety
│   └── user_profiles.py             # Profile management
├── frontend/
│   └── src/                         # React web app
├── tests/
│   ├── test_queries_en.json         # English test queries
│   └── test_queries_bn.json         # Bengali test queries
└── README.md
```

---

## 13. Cost Estimates (Monthly, at 1,000 daily users)

| Component | Estimated Cost |
|---|---|
| LLM API (Claude Sonnet 4, ~500 tokens/query) | ~$150–300/month |
| Embedding API (text-embedding-3-small) | ~$5–10/month |
| Vector DB (Pinecone Starter) | ~$70/month |
| Backend hosting (AWS EC2 t3.medium) | ~$35/month |
| **Total Estimate** | **~$260–415/month** |

> Lower costs are achievable with open-source LLMs (Llama 3, Mistral) hosted locally and Qdrant/Chroma as a self-hosted vector DB.

---

*Document compiled for: BD Personalized Cooking RAG System — Version 1.0*
*Source knowledge base: National Dietary Guidelines for Bangladesh 2022 (BIRDEM | WHO | ADA | FAO)*