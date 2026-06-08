import sys
import os
import csv
import time
import logging
import re
import numpy as np

# Add project root and scripts directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.dirname(__file__))

from app.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ingest_personal_cooker")

DIMENSION = 384
INDEX_NAME = settings.pinecone_index or 'bd-cooking-rag'

def get_embedding_model():
    """Load embedding model all-MiniLM-L6-v2 via fastembed."""
    try:
        from fastembed import TextEmbedding
        logger.info("Loading embedding model all-MiniLM-L6-v2 via fastembed...")
        model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        logger.info("Embedding model loaded.")
        return model
    except Exception as e:
        logger.error("Failed to load fastembed embedding model: %s", e)
        raise e

def get_pinecone_client():
    """Connect to Pinecone."""
    if not settings.pinecone_api_key:
        logger.error("PINECONE_API_KEY is not configured in environment variables.")
        sys.exit(1)
    try:
        from pinecone import Pinecone
        return Pinecone(api_key=settings.pinecone_api_key)
    except Exception as e:
        logger.error("Failed to initialize Pinecone: %s", e)
        raise e

def init_pinecone_index(pc):
    """Ensure the Pinecone index exists and is ready."""
    try:
        from pinecone import ServerlessSpec
        existing_indexes = [idx.name for idx in pc.list_indexes().indexes]
        if INDEX_NAME not in existing_indexes:
            logger.info("Creating index '%s'...", INDEX_NAME)
            pc.create_index(
                name=INDEX_NAME,
                dimension=DIMENSION,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"
                )
            )
            logger.info("Waiting for index to initialize...")
            time.sleep(30)
        else:
            logger.info("Index '%s' already exists.", INDEX_NAME)
    except Exception as e:
        logger.error("Failed to initialize Pinecone index: %s", e)
        raise e


def split_into_sentences(text: str) -> list:
    """Split text into individual sentences using punctuation boundaries."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

def get_cosine_similarity(v1, v2) -> float:
    """Compute cosine similarity between two vectors."""
    dot = np.dot(v1, v2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(dot / (norm1 * norm2))

def semantic_chunking(text: str, model, threshold: float = 0.65, max_chars: int = 1000) -> list:
    """Group sentences into variable-length chunks based on semantic cosine similarity."""
    sentences = split_into_sentences(text)
    if not sentences:
        return []

    # Embed all sentences
    embeddings = list(model.embed(sentences))
    
    chunks = []
    current_chunk = [sentences[0]]
    current_length = len(sentences[0])

    for i in range(1, len(sentences)):
        sim = get_cosine_similarity(embeddings[i-1], embeddings[i])
        
        # If semantic gap is too wide or length limit is exceeded, start a new chunk
        if sim < threshold or current_length + len(sentences[i]) > max_chars:
            chunks.append(" ".join(current_chunk))
            current_chunk = [sentences[i]]
            current_length = len(sentences[i])
        else:
            current_chunk.append(sentences[i])
            current_length += len(sentences[i]) + 1  # count space

    if current_chunk:
        chunks.append(" ".join(current_chunk))
        
    return chunks

def generate_chunk_context(condition: str, category: str) -> str:
    """Generate global document context prefix (Anthropic-style Contextual RAG)."""
    clean_condition = condition.replace("**", "").strip() if condition else "general health"
    clean_category = category.replace("**", "").strip() if category else "dietary guidelines"
    return (
        f"This chunk is from the National Dietary Guidelines for Bangladesh. "
        f"It outlines clinical constraints, allowed/avoided food rules, and nutritional cooking directions "
        f"for individuals managing the condition: \"{clean_condition}\" within the category of \"{clean_category}\"."
    )

def parse_contextual_chunks(file_path: str, model) -> list:
    """Parse Ragdata.md file and return contextualized chunks using semantic split."""
    logger.info("Parsing RAG data file from %s with Semantic Chunking...", file_path)
    if not os.path.exists(file_path):
        logger.error("File not found: %s", file_path)
        return []

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    blocks = [b.strip() for b in content.split("---") if b.strip()]
    blocks = [b for b in blocks if "## CHUNK:" in b]
    chunks = []

    for idx, block in enumerate(blocks):
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        chunk_id = f"chunk-{idx}"
        condition = ""
        category = ""
        content_lines = []

        for line in lines:
            if line.startswith("## CHUNK:"):
                chunk_id = line.replace("## CHUNK:", "").strip()
            elif line.startswith("**CONDITION:**"):
                condition = line.replace("**CONDITION:**", "").replace("**", "").strip()
            elif line.startswith("**CATEGORY:**"):
                category = line.replace("**CATEGORY:**", "").replace("**", "").strip()
            else:
                content_lines.append(line)

        original_text = "\n".join(content_lines)
        
        # Apply variable/semantic chunking on the original block text
        sub_chunks = semantic_chunking(original_text, model, threshold=0.65, max_chars=1000)
        
        for sub_idx, sub_chunk in enumerate(sub_chunks):
            context_prefix = generate_chunk_context(condition, category)
            contextualized_text = f"<context>\n{context_prefix}\n</context>\n\n{sub_chunk}"
            
            sub_id = f"{chunk_id}-sub-{sub_idx}" if len(sub_chunks) > 1 else chunk_id
            
            chunks.append({
                "id": sub_id,
                "text": contextualized_text,
                "metadata": {
                    "condition": condition,
                    "category": category,
                    "context": context_prefix,
                    "source": "Ragdata.md"
                }
            })

    logger.info("Parsed and semantically split into %d chunks from Ragdata.md", len(chunks))
    return chunks

def parse_disease_csv(file_path: str) -> list:
    """Parse disease_nutrients.csv and return chunks."""
    logger.info("Parsing CSV data from %s...", file_path)
    if not os.path.exists(file_path):
        logger.error("File not found: %s", file_path)
        return []

    chunks = []
    try:
        with open(file_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                disease = row.get("Disease", "").strip()
                nutrients = row.get("Recommended_Nutrients", "").strip()
                notes = row.get("Notes", "").strip()
                references = row.get("References", "").strip()

                text = f"Disease: {disease}\nRecommended Nutrients: {nutrients}\nNotes: {notes}\nReferences: {references}"
                chunks.append({
                    "id": f"disease-{idx}",
                    "text": text,
                    "metadata": {
                        "condition": disease,
                        "category": "dietary_guidelines",
                        "source": "disease_nutrients.csv"
                    }
                })
    except Exception as e:
        logger.error("Failed to parse CSV: %s", e)
        return []

    logger.info("Parsed %d items from disease_nutrients.csv", len(chunks))
    return chunks

def embed_and_upsert(index, model, chunks: list, batch_size: int = 10):
    """Generate embeddings and upsert to Pinecone."""
    total = len(chunks)
    logger.info("Embedding and upserting %d vectors in batches of %d...", total, batch_size)

    for i in range(0, total, batch_size):
        batch = chunks[i : i + batch_size]
        logger.info("Processing batch %d/%d", (i // batch_size) + 1, (total + batch_size - 1) // batch_size)

        vectors = []
        # Batch embedding generation using fastembed
        texts = [chunk["text"] for chunk in batch]
        embeddings = list(model.embed(texts))

        for idx, chunk in enumerate(batch):
            vector_vals = embeddings[idx].tolist()
            vectors.append({
                "id": chunk["id"],
                "values": vector_vals,
                "metadata": {
                    **chunk["metadata"],
                    "text": chunk["text"]  # Store full text in metadata for RAG retrieval
                }
            })

        index.upsert(vectors=vectors)

def main():
    logger.info("Starting Personal Cooker RAG Ingestion...")

    # Initialize Pinecone Client
    pc = get_pinecone_client()
    init_pinecone_index(pc)
    index = pc.Index(INDEX_NAME)

    # Clean existing Pinecone namespace
    logger.info("Clearing existing vectors in index '%s'...", INDEX_NAME)
    try:
        index.delete(delete_all=True, namespace="")
        logger.info("Namespace cleared successfully.")
    except Exception as e:
        logger.warning("Could not delete old vectors (index might be empty): %s", e)

    # Load Embedding Model
    model = get_embedding_model()

    # Paths
    csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "disease_nutrients.csv")
    rag_path = os.path.join(os.path.dirname(__file__), "..", "app", "personal_cooker", "data", "Ragdata.md")

    # Ingest disease_nutrients.csv
    csv_chunks = parse_disease_csv(csv_path)
    if csv_chunks:
        embed_and_upsert(index, model, csv_chunks)

    # Ingest Ragdata.md
    rag_chunks = parse_contextual_chunks(rag_path, model)
    if rag_chunks:
        embed_and_upsert(index, model, rag_chunks)

    logger.info("Ingestion of Personal Cooker knowledge base completed successfully!")

if __name__ == "__main__":
    main()
