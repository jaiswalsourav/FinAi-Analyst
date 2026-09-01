import os
from pathlib import Path
from dotenv import load_dotenv
 
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
 
import requests
import json
from google import generativeai as genai
 
 
# ==========================
# Load Environment
# ==========================
 
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)
 
api_key = os.getenv("GEMINI_API_KEY")
alpha_key = os.getenv("ALPHA_VANTAGE_KEY")
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
 
print("Env:", env_path)
print("GEMINI API Key Loaded:", bool(api_key))
print("Alpha Vantage Key Loaded:", bool(alpha_key))
print("CORS Origins:", cors_origins)

# ==========================
# FastAPI
# ==========================

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


# ==========================
# Request Model
# ==========================

class AskRequest(BaseModel):
    question: str
    context: Optional[dict] = None


class AskStockRequest(BaseModel):
    symbol: str
    question: str


# ==========================
# Gemini Setup
# ==========================

client: Optional[object] = None

MODEL = "gemini-2.0-flash"


if api_key:
    try:
        genai.configure(api_key=api_key)
        client = genai.GenerativeModel(model_name=MODEL)

        print("Gemini Connected")

    except Exception as e:
        print("Gemini Error:", e)



# CHANGE #1 + #2: add one shared helper here to fetch + validate Alpha Vantage data,
# instead of duplicating the requests.get(...) calls in both stock_info() and ask_stock() below.
#
def fetch_alpha_data(symbol: str):
    base = 'https://www.alphavantage.co/query'
    gq = requests.get(base, params={'function': 'GLOBAL_QUOTE', 'symbol': symbol, 'apikey': alpha_key}, timeout=10).json()
    ts = requests.get(base, params={'function': 'TIME_SERIES_DAILY_ADJUSTED', 'symbol': symbol, 'outputsize': 'compact', 'apikey': alpha_key}, timeout=10).json()

    # Alpha Vantage returns a "Note" or "Information" key instead of real data when rate-limited
    for resp in (gq, ts):
        if isinstance(resp, dict) and ('Note' in resp or 'Information' in resp):
            raise RuntimeError(f"Alpha Vantage issue: {resp.get('Note') or resp.get('Information')}")

    return {
        'global_quote': gq.get('Global Quote', {}),
        'time_series': ts.get('Time Series (Daily)', {})
    }
 
# ==========================
# Health Check
# ==========================

@app.get("/health")
def health():

    return {
        "status": "ok",
        "gemini": client is not None,
        "model": MODEL,
        "alpha_vantage": bool(alpha_key)
    }


# ==========================
# Ask API
# ==========================

 
@app.post("/ask")
def ask(req: AskRequest):
 
    if client is None:
        raise HTTPException(status_code=503, detail="Gemini service not initialized")
 
    try:
        # Build prompt using optional provided context
        if getattr(req, 'context', None):
            prompt = req.question + "\nContext:\n" + json.dumps(req.context)
        else:
            prompt = req.question

        response = client.generate_content(prompt)

        return {"answer": getattr(response, 'text', str(response))}
 
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")



@app.get('/stock-info')
def stock_info(symbol: Optional[str] = None):
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol parameter is required")
 
    if not alpha_key:
        raise HTTPException(status_code=503, detail="Alpha Vantage API key not configured")
 
    try:
        data = fetch_alpha_data(symbol)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"External API error: {str(e)}")



@app.post('/ask-stock')
def ask_stock(req: AskStockRequest):
    if client is None:
        raise HTTPException(status_code=503, detail="Gemini service not initialized")
 
    # Fetch recent stock data to provide context
    stock_context = {}
    if alpha_key:
        try:
            stock_context = fetch_alpha_data(req.symbol)
        except Exception as e:
            # Log the error but continue - stock data is optional context
            stock_context = {'error': f'Failed to fetch stock data: {str(e)}'}
 
    # Build prompt
    prompt = f"You are a helpful finance assistant. The user is asking about {req.symbol}.\n"
    if stock_context and 'error' not in stock_context:
        prompt += f"Here is recent market data (JSON): {json.dumps(stock_context)}\n"
 
    prompt += f"User question: {req.question}\nAnswer concisely and focus on the symbol provided."
 
    try:
        response = client.generate_content(prompt)
        return {"answer": getattr(response, 'text', str(response))}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")
 
 
 
# ==========================
# Run
# ==========================
 
if __name__ == "__main__":
 
    import uvicorn
 
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001
    )