import os
from pathlib import Path
from dotenv import load_dotenv

# Locate and load the root .env file
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    ALPHA_VANTAGE_KEY: str = os.getenv("ALPHA_VANTAGE_KEY", "")
    # Shared secret the backend sends in X-Internal-Key; requests without it are rejected
    INTERNAL_API_KEY: str = os.getenv("INTERNAL_API_KEY", "")
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    
    # Model and Storage Settings
    # Main model, used first for every question. Override with MODEL_NAME in .env
    # (e.g. MODEL_NAME=gemini-3.8-flash for faster, cheaper answers).
    # Note: Pro models need billing enabled on the API key's project, otherwise they return 429.
    MODEL_NAME: str = os.getenv("MODEL_NAME", "gemini-3.1-pro-preview")
    
    # Fallback order: Stable Pro -> High-intelligence Flash -> Cost-efficient Flash
    # Used one by one when the model before it has no quota, is retired, or stalls
    # (see _is_quota_error in app/api/agent_api.py). Free-tier quotas are per model,
    # so a different model often still works.
    FALLBACK_MODELS: list[str] = [
        "gemini-2.5-pro",          # Fallback to stable Pro tier
        "gemini-3.8-flash",        # Highest-tier Flash reasoning
        "gemini-3.7-flash",        # Fast agentic fallback
        "gemini-3.1-flash-lite",   # Ultra-low latency fallback
    ]
    # Embeddings turn text into numbers so the RAG search can find similar documents.
    # text-embedding-004 was retired by Google; gemini-embedding-001 replaces it
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "models/gemini-embedding-001")
    # Length of each embedding vector. 768 matches the old model, so the existing Chroma
    # collection still opens. Changing it later means re-adding all documents.
    EMBEDDING_DIMENSIONS: int = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))
    CHROMA_PERSIST_DIR: str = str(ROOT_DIR / "chroma_db")

settings = Settings()