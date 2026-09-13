"""
app/main.py
FastAPI application entrypoint assembling CORS, routers, and health checks.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import agent_api, rag_api

app = FastAPI(
    title="Financial AI Service",
    description="Microservice for Gemini Agent Function Calling, ChromaDB RAG, and Market Data",
    version="2.0.0"
)

# Configure Cross-Origin Resource Sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(agent_api.router)
app.include_router(rag_api.router)


@app.get("/health")
def health_check():
    """Health check endpoint to verify microservice status."""
    return {
        "status": "ok",
        "service": "ai-service",
        "model": settings.MODEL_NAME,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "alpha_vantage_configured": bool(settings.ALPHA_VANTAGE_KEY)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)