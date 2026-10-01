import os
from pathlib import Path
from dotenv import load_dotenv

# Locate and load the root .env file
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    ALPHA_VANTAGE_KEY: str = os.getenv("ALPHA_VANTAGE_KEY", "")
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    
    # Model and Storage Settings
    MODEL_NAME: str = os.getenv("MODEL_NAME", "gemini-3.5-flash")
    # Free-tier quotas are per model, so on a 429 the agent tries these in order
    FALLBACK_MODELS: list[str] = [
        "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
    ]
    EMBEDDING_MODEL: str = "models/text-embedding-004"
    CHROMA_PERSIST_DIR: str = str(ROOT_DIR / "chroma_db")

settings = Settings()