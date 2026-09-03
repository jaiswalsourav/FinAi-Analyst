import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime
 
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
 
import requests
import json
from google import generativeai as genai

# RAG imports
from rag import get_rag_manager
 
 
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
    use_rag: bool = True


class AskStockRequest(BaseModel):
    symbol: str
    question: str
    use_rag: bool = True


class AddDocumentRequest(BaseModel):
    content: str
    metadata: Optional[dict] = None
    doc_id: Optional[str] = None


class RetrieveRequest(BaseModel):
    query: str
    k: int = 3


class QuarterlyResultRequest(BaseModel):
    symbol: str
    store_in_rag: bool = True


class QuarterlySearchRequest(BaseModel):
    symbol: Optional[str] = None
    metric: Optional[str] = None  # e.g., "earnings", "revenue", "margin"
    k: int = 5


# ==========================
# Gemini Setup
# ==========================

client: Optional[object] = None

MODEL = "gemini-3.6-flash"


if api_key:
    try:
        genai.configure(api_key=api_key)
        client = genai.GenerativeModel(model_name=MODEL)

        print("Gemini Connected")

    except Exception as e:
        print("Gemini Error:", e)


# ==========================
# RAG Setup
# ==========================

rag_manager = None

if api_key:
    try:
        rag_manager = get_rag_manager(api_key)
        print("RAG Manager Initialized")
    except Exception as e:
        print("RAG Manager Error:", e)


# ==========================
# Financial Data Storage (RAG)
# ==========================

def store_financial_data_to_rag(symbol: str, stock_data: dict) -> None:
    """
    Store fetched financial data to RAG for context-aware analysis.
    
    Args:
        symbol: Stock symbol (e.g., 'AAPL')
        stock_data: Data dict containing 'global_quote' and 'time_series'
    """
    if not rag_manager:
        return
    
    try:
        timestamp = datetime.now().isoformat()
        
        # Format Global Quote (current price data)
        global_quote = stock_data.get('global_quote', {})
        if global_quote:
            quote_text = f"""
Stock Symbol: {symbol}
Timestamp: {timestamp}

Current Market Data (Global Quote):
- Price: ${global_quote.get('05. price', 'N/A')}
- Change: {global_quote.get('09. change', 'N/A')} ({global_quote.get('10. change percent', 'N/A')})
- High (52 Week): ${global_quote.get('14. low_52_week', 'N/A')} - ${global_quote.get('13. high_52_week', 'N/A')}
- Volume: {global_quote.get('06. volume', 'N/A')}
- PE Ratio: {global_quote.get('12. pe_ratio', 'N/A')}
- EPS: {global_quote.get('11. earnings_per_share', 'N/A')}

Full Quote Data:
{json.dumps(global_quote, indent=2)}
"""
            
            rag_manager.add_document(
                text=quote_text.strip(),
                metadata={
                    "symbol": symbol,
                    "data_type": "global_quote",
                    "timestamp": timestamp,
                    "source": "alpha_vantage",
                    "price": global_quote.get('05. price'),
                    "change_percent": global_quote.get('10. change percent')
                },
                doc_id=f"{symbol}_quote_{timestamp}"
            )
        
        # Format Time Series (historical daily data)
        time_series = stock_data.get('time_series', {})
        if time_series:
            # Get last 10 days of data for summarization
            dates = sorted(list(time_series.keys()), reverse=True)[:10]
            
            series_text = f"""
Time Series Daily Data for {symbol}:
Generated: {timestamp}

Recent Trading Data (Last 10 Days):
"""
            
            for date in dates:
                data = time_series[date]
                series_text += f"""
Date: {date}
- Open: ${data.get('1. open', 'N/A')}
- High: ${data.get('2. high', 'N/A')}
- Low: ${data.get('3. low', 'N/A')}
- Close: ${data.get('4. close', 'N/A')}
- Adjusted Close: ${data.get('5. adjusted close', 'N/A')}
- Volume: {data.get('6. volume', 'N/A')}
"""
            
            rag_manager.add_document(
                text=series_text.strip(),
                metadata={
                    "symbol": symbol,
                    "data_type": "time_series",
                    "timestamp": timestamp,
                    "source": "alpha_vantage",
                    "num_records": len(time_series)
                },
                doc_id=f"{symbol}_timeseries_{timestamp}"
            )
            
            print(f"Stored financial data for {symbol} to RAG")
    
    except Exception as e:
        print(f"Warning: Failed to store financial data to RAG: {e}")


# ==========================
# Alpha Vantage Data Fetching
# ==========================

def fetch_alpha_data(symbol: str, store_in_rag: bool = True):
    """
    Fetch stock data from Alpha Vantage and optionally store in RAG.
    
    Args:
        symbol: Stock symbol
        store_in_rag: Whether to store fetched data in RAG for analysis
        
    Returns:
        Dict with 'global_quote' and 'time_series' data
    """
    base = 'https://www.alphavantage.co/query'
    gq = requests.get(base, params={'function': 'GLOBAL_QUOTE', 'symbol': symbol, 'apikey': alpha_key}, timeout=10).json()
    ts = requests.get(base, params={'function': 'TIME_SERIES_DAILY_ADJUSTED', 'symbol': symbol, 'outputsize': 'compact', 'apikey': alpha_key}, timeout=10).json()

    # Alpha Vantage returns a "Note" or "Information" key instead of real data when rate-limited
    for resp in (gq, ts):
        if isinstance(resp, dict) and ('Note' in resp or 'Information' in resp):
            raise RuntimeError(f"Alpha Vantage issue: {resp.get('Note') or resp.get('Information')}")

    data = {
        'global_quote': gq.get('Global Quote', {}),
        'time_series': ts.get('Time Series (Daily)', {})
    }
    
    # Store financial data to RAG for future analysis
    if store_in_rag:
        store_financial_data_to_rag(symbol, data)
    
    return data


# ==========================
# Quarterly Results Storage
# ==========================

def fetch_quarterly_results(symbol: str) -> dict:
    """
    Fetch quarterly earnings/results from Alpha Vantage.
    
    Args:
        symbol: Stock symbol
        
    Returns:
        Dict with quarterly earnings data
    """
    base = 'https://www.alphavantage.co/query'
    
    try:
        response = requests.get(
            base,
            params={
                'function': 'EARNINGS',
                'symbol': symbol,
                'apikey': alpha_key
            },
            timeout=10
        ).json()
        
        if 'Note' in response or 'Information' in response:
            raise RuntimeError(f"Alpha Vantage issue: {response.get('Note') or response.get('Information')}")
        
        return {
            'symbol': symbol,
            'annual_earnings': response.get('annualEarnings', []),
            'quarterly_earnings': response.get('quarterlyEarnings', [])
        }
    except Exception as e:
        print(f"Error fetching quarterly results for {symbol}: {e}")
        return {'symbol': symbol, 'annual_earnings': [], 'quarterly_earnings': []}


def store_quarterly_results_to_rag(symbol: str, earnings_data: dict) -> None:
    """
    Store quarterly earnings/results to RAG for analysis.
    
    Args:
        symbol: Stock symbol
        earnings_data: Dict with annual and quarterly earnings
    """
    if not rag_manager:
        return
    
    try:
        timestamp = datetime.now().isoformat()
        
        # Format Quarterly Earnings
        quarterly_earnings = earnings_data.get('quarterly_earnings', [])
        if quarterly_earnings:
            quarterly_text = f"""
Quarterly Earnings Report for {symbol}
Generated: {timestamp}

Recent Quarterly Results (Latest 8 Quarters):
"""
            
            # Get last 8 quarters
            for i, quarter in enumerate(quarterly_earnings[:8]):
                fiscal_date = quarter.get('fiscalDateEnding', 'N/A')
                reported_eps = quarter.get('reportedEPS', 'N/A')
                estimated_eps = quarter.get('estimatedEPS', 'N/A')
                surprise = quarter.get('surprisePercentage', 'N/A')
                
                quarterly_text += f"""
Q{i+1} {fiscal_date}:
  - Reported EPS: {reported_eps}
  - Estimated EPS: {estimated_eps}
  - Surprise: {surprise}%
"""
            
            rag_manager.add_document(
                text=quarterly_text.strip(),
                metadata={
                    "symbol": symbol,
                    "data_type": "quarterly_earnings",
                    "timestamp": timestamp,
                    "source": "alpha_vantage",
                    "num_quarters": len(quarterly_earnings)
                },
                doc_id=f"{symbol}_quarterly_{timestamp}"
            )
        
        # Format Annual Earnings
        annual_earnings = earnings_data.get('annual_earnings', [])
        if annual_earnings:
            annual_text = f"""
Annual Earnings Report for {symbol}
Generated: {timestamp}

Year-over-Year EPS Performance:
"""
            
            for year in annual_earnings[:5]:  # Last 5 years
                fiscal_year = year.get('fiscalDateEnding', 'N/A')
                eps = year.get('reportedEPS', 'N/A')
                
                annual_text += f"FY {fiscal_year}: ${eps}\n"
            
            rag_manager.add_document(
                text=annual_text.strip(),
                metadata={
                    "symbol": symbol,
                    "data_type": "annual_earnings",
                    "timestamp": timestamp,
                    "source": "alpha_vantage",
                    "num_years": len(annual_earnings)
                },
                doc_id=f"{symbol}_annual_{timestamp}"
            )
        
        print(f"Stored quarterly/annual results for {symbol} to RAG")
    
    except Exception as e:
        print(f"Warning: Failed to store quarterly results to RAG: {e}")

 
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
        prompt = req.question
        
        # Retrieve relevant documents using RAG if enabled
        rag_context = ""
        if req.use_rag and rag_manager:
            retrieved_docs = rag_manager.retrieve(req.question, k=3)
            if retrieved_docs:
                rag_context = rag_manager.format_context(retrieved_docs)
                prompt = f"{rag_context}\n\nBased on the above context, please answer the following question:\n{req.question}"
        
        # Add any additional user-provided context
        if getattr(req, 'context', None):
            prompt += "\n\nAdditional Context:\n" + json.dumps(req.context)

        response = client.generate_content(prompt)

        return {
            "answer": getattr(response, 'text', str(response)),
            "used_rag": req.use_rag and bool(rag_context)
        }
 
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
    
    # Add market data
    if stock_context and 'error' not in stock_context:
        prompt += f"Here is recent market data (JSON): {json.dumps(stock_context)}\n"
    
    # Retrieve and add relevant documents using RAG if enabled
    rag_context = ""
    if req.use_rag and rag_manager:
        query = f"Information about {req.symbol}: {req.question}"
        retrieved_docs = rag_manager.retrieve(query, k=3)
        if retrieved_docs:
            rag_context = rag_manager.format_context(retrieved_docs)
            prompt += f"\nRELEVANT FINANCIAL DOCUMENTS:\n{rag_context}\n"
    
    prompt += f"User question: {req.question}\nAnswer concisely and focus on the symbol provided."
 
    try:
        response = client.generate_content(prompt)
        return {
            "answer": getattr(response, 'text', str(response)),
            "used_rag": req.use_rag and bool(rag_context)
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")


# ==========================
# RAG Endpoints
# ==========================

@app.post("/rag/add-document")
def add_document(req: AddDocumentRequest):
    """Add a document to the RAG vector store."""
    if rag_manager is None:
        raise HTTPException(status_code=503, detail="RAG Manager not initialized")
    
    try:
        chunks_added = rag_manager.add_document(
            text=req.content,
            metadata=req.metadata,
            doc_id=req.doc_id
        )
        return {
            "status": "success",
            "chunks_added": chunks_added,
            "message": f"Document added successfully with {chunks_added} chunks"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding document: {str(e)}")


@app.post("/rag/add-file")
async def add_file(file: UploadFile = File(...), doc_id: Optional[str] = None):
    """Upload and add a file to the RAG vector store."""
    if rag_manager is None:
        raise HTTPException(status_code=503, detail="RAG Manager not initialized")
    
    try:
        content = await file.read()
        text_content = content.decode('utf-8')
        
        chunks_added = rag_manager.add_document(
            text=text_content,
            metadata={"filename": file.filename, "content_type": file.content_type},
            doc_id=doc_id
        )
        return {
            "status": "success",
            "filename": file.filename,
            "chunks_added": chunks_added,
            "message": f"File added successfully with {chunks_added} chunks"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding file: {str(e)}")


@app.post("/rag/retrieve")
def retrieve(req: RetrieveRequest):
    """Retrieve relevant documents from the RAG vector store."""
    if rag_manager is None:
        raise HTTPException(status_code=503, detail="RAG Manager not initialized")
    
    try:
        results = rag_manager.retrieve(req.query, k=req.k)
        return {
            "query": req.query,
            "count": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving documents: {str(e)}")


@app.delete("/rag/clear")
def clear_rag():
    """Clear all documents from the RAG vector store."""
    # ✅ Declare global BEFORE checking or using the variable
    global rag_manager

    if rag_manager is None:
        raise HTTPException(status_code=503, detail="RAG Manager not initialized")
    
    try:
        # Note: This reinitializes the vector store
        rag_manager = get_rag_manager(api_key) if api_key else None
        return {"status": "success", "message": "RAG store cleared and reinitialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing RAG store: {str(e)}")


# ==========================
# Financial Data + RAG Integration
# ==========================

@app.post("/financial/store-stock-data")
def store_stock_data(symbol: str):
    """
    Fetch stock data from Alpha Vantage and store in RAG.
    
    This creates a searchable knowledge base of financial data that AI can use
    when analyzing and providing insights about stocks.
    """
    if not alpha_key:
        raise HTTPException(status_code=503, detail="Alpha Vantage API key not configured")
    
    if not rag_manager:
        raise HTTPException(status_code=503, detail="RAG Manager not initialized")

    try:
        data = fetch_alpha_data(symbol, store_in_rag=True)
        
        return {
            "status": "success",
            "symbol": symbol,
            "message": f"Financial data for {symbol} fetched and stored in RAG",
            "data_stored": {
                "has_quote": bool(data.get('global_quote')),
                "quote_keys": list(data.get('global_quote', {}).keys())[:5],
                "timeseries_records": len(data.get('time_series', {}))
            }
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error storing financial data: {str(e)}")


@app.post("/financial/search-historical")
def search_historical_data(query: str, k: int = 5):
    """
    Search stored financial data and historical records.
    
    Returns relevant financial documents that match the query.
    Useful for finding historical price data, trends, or specific stock information.
    """
    if not rag_manager:
        raise HTTPException(status_code=503, detail="RAG Manager not initialized")
    
    try:
        results = rag_manager.retrieve(query, k=k)
        
        return {
            "query": query,
            "results_count": len(results),
            "results": [
                {
                    "content": result['content'],
                    "metadata": result['metadata'],
                    "relevance_score": result['score'],
                    "symbol": result['metadata'].get('symbol'),
                    "data_type": result['metadata'].get('data_type'),
                    "timestamp": result['metadata'].get('timestamp')
                }
                for result in results
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching financial data: {str(e)}")


@app.get("/financial/stored-symbols")
def get_stored_symbols():
    """
    Get list of symbols that have been stored in RAG.
    
    Returns metadata about all stored financial data.
    """
    if not rag_manager:
        raise HTTPException(status_code=503, detail="RAG Manager not initialized")
    
    try:
        # Search for all quote data to get symbols
        search_result = rag_manager.retrieve("Stock Symbol", k=100)
        
        symbols = set()
        data_types = {}
        timestamps = {}
        
        for doc in search_result:
            metadata = doc.get('metadata', {})
            symbol = metadata.get('symbol')
            data_type = metadata.get('data_type')
            timestamp = metadata.get('timestamp')
            
            if symbol:
                symbols.add(symbol)
                if symbol not in data_types:
                    data_types[symbol] = []
                if data_type not in data_types[symbol]:
                    data_types[symbol].append(data_type)
                timestamps[symbol] = timestamp
        
        return {
            "total_symbols": len(symbols),
            "symbols": sorted(list(symbols)),
            "data_types": data_types,
            "latest_updates": timestamps
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving stored symbols: {str(e)}")


# ==========================
# Quarterly Results Endpoints
# ==========================

@app.post("/financial/store-quarterly-results")
def store_quarterly_results(req: QuarterlyResultRequest):
    """
    Fetch quarterly earnings/results and store in RAG.
    
    This stores earnings data, EPS trends, and surprises for AI analysis.
    """
    if not alpha_key:
        raise HTTPException(status_code=503, detail="Alpha Vantage API key not configured")
    
    if not rag_manager:
        raise HTTPException(status_code=503, detail="RAG Manager not initialized")
    
    try:
        # Fetch quarterly earnings
        earnings_data = fetch_quarterly_results(req.symbol)
        
        # Store in RAG if requested
        if req.store_in_rag and earnings_data['quarterly_earnings']:
            store_quarterly_results_to_rag(req.symbol, earnings_data)
        
        return {
            "status": "success",
            "symbol": req.symbol,
            "message": f"Quarterly results for {req.symbol} fetched and stored",
            "data_summary": {
                "quarterly_records": len(earnings_data.get('quarterly_earnings', [])),
                "annual_records": len(earnings_data.get('annual_earnings', [])),
                "latest_quarter": earnings_data.get('quarterly_earnings', [{}])[0] if earnings_data.get('quarterly_earnings') else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error storing quarterly results: {str(e)}")


@app.post("/financial/search-quarterly")
def search_quarterly_results(req: QuarterlySearchRequest):
    """
    Search quarterly earnings and results data.
    
    Can search by symbol, metric (EPS, revenue, margin), or general earnings queries.
    """
    if not rag_manager:
        raise HTTPException(status_code=503, detail="RAG Manager not initialized")
    
    try:
        # Build query
        if req.symbol and req.metric:
            query = f"{req.symbol} quarterly {req.metric} earnings"
        elif req.symbol:
            query = f"{req.symbol} quarterly earnings EPS results"
        elif req.metric:
            query = f"quarterly {req.metric} earnings results"
        else:
            query = "quarterly earnings results EPS"
        
        results = rag_manager.retrieve(query, k=req.k)
        
        # Filter for quarterly/annual data types
        quarterly_results = [
            {
                "content": result['content'],
                "metadata": result['metadata'],
                "relevance_score": result['score'],
                "symbol": result['metadata'].get('symbol'),
                "data_type": result['metadata'].get('data_type'),
                "timestamp": result['metadata'].get('timestamp')
            }
            for result in results
            if result['metadata'].get('data_type') in ['quarterly_earnings', 'annual_earnings']
        ]
        
        return {
            "query": query,
            "results_count": len(quarterly_results),
            "results": quarterly_results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching quarterly results: {str(e)}")


@app.get("/financial/quarterly-summary/{symbol}")
def get_quarterly_summary(symbol: str, limit: int = 8):
    """
    Get summary of stored quarterly results for a symbol.
    
    Shows recent quarters, EPS trends, and surprises.
    """
    if not rag_manager:
        raise HTTPException(status_code=503, detail="RAG Manager not initialized")
    
    try:
        query = f"{symbol} quarterly earnings EPS"
        results = rag_manager.retrieve(query, k=5)
        
        quarterly_docs = [
            r for r in results
            if r['metadata'].get('symbol') == symbol and 
            r['metadata'].get('data_type') == 'quarterly_earnings'
        ]
        
        if not quarterly_docs:
            return {
                "symbol": symbol,
                "status": "no_data",
                "message": f"No quarterly results found for {symbol}. Store them first with POST /financial/store-quarterly-results"
            }
        
        return {
            "symbol": symbol,
            "status": "success",
            "documents_found": len(quarterly_docs),
            "latest_data": [
                {
                    "content": doc['content'][:500] + "...",
                    "timestamp": doc['metadata'].get('timestamp'),
                    "num_quarters": doc['metadata'].get('num_quarters')
                }
                for doc in quarterly_docs[:3]
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving quarterly summary: {str(e)}")

 
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