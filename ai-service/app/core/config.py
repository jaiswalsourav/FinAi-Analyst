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
    MODEL_NAME: str = os.getenv("MODEL_NAME", "gemini-3.1-pro-preview")
    
    # Fallback order: Stable Pro -> High-intelligence Flash -> Cost-efficient Flash
    FALLBACK_MODELS: list[str] = [
        "gemini-2.5-pro",          # Fallback to stable Pro tier
        "gemini-3.8-flash",        # Highest-tier Flash reasoning
        "gemini-3.7-flash",        # Fast agentic fallback
        "gemini-3.1-flash-lite",   # Ultra-low latency fallback
    ]
    # text-embedding-004 was retired by Google; gemini-embedding-001 replaces it
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "models/gemini-embedding-001")
    # Keeps vectors the same size as the old model so the existing Chroma collection still opens
    EMBEDDING_DIMENSIONS: int = int(os.getenv("EMBEDDING_DIMENSIONS", "768"))
    CHROMA_PERSIST_DIR: str = str(ROOT_DIR / "chroma_db")

settings = Settings()