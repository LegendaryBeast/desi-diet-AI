---
mode: always
---

# DesiDiet v3 Tech Stack Guidelines

These guidelines define the technology stack, databases, and dependencies for the DesiDiet v3 codebase.

## Backend Stack
* **Language**: Python 3.10+
* **Framework**: FastAPI (using async/await)
* **ORM**: Prisma Python client (connected to PostgreSQL)
* **Server**: Uvicorn running on port 8000

## Database Systems
1. **Vector Database (Pinecone)**:
   * **Index**: `bd-cooking-rag` (dimension: 384, metric: cosine)
   * **Embeddings**: generated locally using `sentence-transformers/all-MiniLM-L6-v2` via `fastembed` (ONNX runtime)
   * **Usage**: Stores and retrieves recipe guidelines and cooking tips for the NutriSaathi agent.
   
2. **Graph Database (Neo4j)**:
   * **Usage**: Stores structured clinical dietary rules, nutrient profiles, disease relationships, and user specific recommendations.
   * **Interactions**: Managed through `KhadokGraphRAG` drivers.

3. **In-Memory Cache (Redis)**:
   * **Usage**: Used for Semantic Caching, state persistence, and sliding conversation history summarization.
