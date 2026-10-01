"""
app/main.py
FastAPI application entrypoint assembling CORS, routers, and health checks.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import agent_api, rag_api
from app.core.cache import news_cache
from app.service.market_data import fetch_news, fetch_stock_info

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


@app.get("/stock-info")
def stock_info(symbol: str):
    """Quote and recent daily closes for the stock detail panel."""
    try:
        return fetch_stock_info(symbol)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Market data error: {exc}")


@app.get("/stock-news")
def stock_news(symbol: str):
    """Recent headlines for a company, cached for a few minutes."""
    key = symbol.strip().upper()
    if key not in news_cache:
        try:
            news_cache[key] = fetch_news(symbol)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"News unavailable: {exc}")
    return news_cache[key]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)