import os
from dotenv import load_dotenv

# Load env variables from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def get_neo4j_config():
    return {
        'uri': os.getenv("NEO4J_URI", "bolt://localhost:7687"),
        'user': os.getenv("NEO4J_USER", "neo4j"),
        'password': os.getenv("NEO4J_PASSWORD", "khadok2025")
    }
