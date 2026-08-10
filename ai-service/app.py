import os
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

import requests
from google import genai


# ==========================
# Load Environment
# ==========================

env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

api_key = os.getenv("GEMINI_API_KEY")
alpha_key = os.getenv("ALPHA_VANTAGE_KEY")

print("Env:", env_path)
print("GEMINI API Key Loaded:", bool(api_key))
print("Alpha Vantage Key Loaded:", bool(alpha_key))


# ==========================
# FastAPI
# ==========================

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================
# Request Model
# ==========================

class AskRequest(BaseModel):
    question: str


class AskStockRequest(BaseModel):
    symbol: str
    question: str


# ==========================
# Gemini Setup
# ==========================

client = None

MODEL = "gemini-2.0-flash"


if api_key:
    try:
        client = genai.Client(
            api_key=api_key
        )

        print("Gemini Connected")

    except Exception as e:
        print("Gemini Error:", e)



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
        return {
            "answer": "Gemini not initialized"
        }
    alpha_key = os.getenv("ALPHA_VANTAGE_KEY")


    try:

        response = client.models.generate_content(
            model=MODEL,
            contents=req.question
        )


        return {
            "answer": response.text
        }


    except Exception as e:

        return {
            "answer": str(e)
        }


@app.get('/stock-info')
def stock_info(symbol: Optional[str] = None):
    if not symbol:
        return {"error": "symbol required"}

    if not alpha_key:
        return {"error": "Alpha Vantage key not configured"}

    try:
        base = 'https://www.alphavantage.co/query'
        # Global quote
        gq = requests.get(base, params={
            'function': 'GLOBAL_QUOTE',
            'symbol': symbol,
            'apikey': alpha_key
        }, timeout=10).json()

        # Time series daily (compact)
        ts = requests.get(base, params={
            'function': 'TIME_SERIES_DAILY_ADJUSTED',
            'symbol': symbol,
            'outputsize': 'compact',
            'apikey': alpha_key
        }, timeout=10).json()

        return {
            'global_quote': gq.get('Global Quote', {}),
            'time_series': ts.get('Time Series (Daily)', {})
        }

    except Exception as e:
        return {"error": str(e)}


@app.post('/ask-stock')
def ask_stock(req: AskStockRequest):
    if client is None:
        return {"answer": "Gemini not initialized"}

    # Fetch recent stock data to provide context
    stock_context = {}
    if alpha_key:
        try:
            base = 'https://www.alphavantage.co/query'
            gq = requests.get(base, params={
                'function': 'GLOBAL_QUOTE',
                'symbol': req.symbol,
                'apikey': alpha_key
            }, timeout=10).json()

            ts = requests.get(base, params={
                'function': 'TIME_SERIES_DAILY_ADJUSTED',
                'symbol': req.symbol,
                'outputsize': 'compact',
                'apikey': alpha_key
            }, timeout=10).json()

            stock_context = {
                'global_quote': gq.get('Global Quote', {}),
                'time_series': ts.get('Time Series (Daily)', {})
            }
        except Exception as e:
            stock_context = {'error': f'Failed to fetch stock data: {e}'}

    # Build prompt
    prompt = f"You are a helpful finance assistant. The user is asking about {req.symbol}.\n"
    if stock_context:
        prompt += f"Here is recent market data: {stock_context}\n"

    prompt += f"User question: {req.question}\nAnswer concisely and focus on the symbol provided."

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt
        )

        return {"answer": response.text}

    except Exception as e:
        return {"answer": str(e)}



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