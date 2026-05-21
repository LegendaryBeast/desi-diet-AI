"""Prisma database client singleton and lifespan management with Neo4j and SentenceTransformer initialization."""

from prisma import Prisma
from contextlib import asynccontextmanager
from fastapi import FastAPI
from neo4j import GraphDatabase, basic_auth
import os
from dotenv import load_dotenv

# Import the model loader from the Q1 planner
from app.logic.planner import startup_load_models

load_dotenv()

# Global Prisma client instance
prisma = Prisma()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and graph resources on startup."""
    # 1. Connect Prisma SQL
    await prisma.connect()
    print("✅ Database connected via Prisma")
    
    # 2. Connect Neo4j Graph
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "khadok2025")
    try:
        app.state.neo4j_driver = GraphDatabase.driver(neo4j_uri, auth=basic_auth(neo4j_user, neo4j_password))
        app.state.neo4j_driver.verify_connectivity()
        print("✅ Successfully connected to Neo4j.")
    except Exception as e:
        print(f"❌ Failed to connect to Neo4j: {e}")
        app.state.neo4j_driver = None
        
    # 3. Load AI Models for RAG
    try:
        app.state.ai_models = startup_load_models()
        print("✅ AI Models (SentenceTransformer) loaded successfully.")
    except Exception as e:
        print(f"❌ Failed to load AI Models: {e}")
        app.state.ai_models = None

    yield
    
    # Shutdown
    if app.state.neo4j_driver:
        app.state.neo4j_driver.close()
        print("✅ Neo4j connection closed.")
    await prisma.disconnect()
    print("✅ Database disconnected")
