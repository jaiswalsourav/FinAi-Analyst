"""
app/tools/agent_tools.py
Gemini Function Calling tool registry wrapping underlying services.
"""

from typing import Any, Dict, Optional
from app.service.market_data import fetch_quote, fetch_quarterly_earnings
from app.service.rag_service import rag_manager


def get_stock_price(symbol: str) -> Dict[str, Any]:
    """
    Fetch the latest stock price, day's high/low, and daily percentage change.
    Use this whenever the user asks for current price, quote, or valuation updates.
    """
    return fetch_quote(symbol)


def get_quarterly_financials(symbol: str) -> Dict[str, Any]:
    """
    Fetch historical quarterly EPS, analyst estimates, and surprise percentages.
    Use this when answering questions about earnings reports, EPS trends, or past quarterly results.
    """
    return fetch_quarterly_earnings(symbol)


def search_internal_filings(query: str, symbol: Optional[str] = None) -> str:
    """
    Search the internal vector store for uploaded financial documents, reports, and analyst notes.
    Use this for in-depth qualitative analysis, internal notes, or domain-specific research.
    """
    if not rag_manager:
        return "RAG vector store is not initialized."

    filter_dict = {"symbol": symbol.strip().upper()} if symbol else None
    results = rag_manager.retrieve(query=query, k=3, filter_dict=filter_dict)

    if not results:
        return "No relevant internal documents found in knowledge base."

    return rag_manager.format_context(results)


# Tool list passed into the Gemini GenerativeModel constructor
ALL_AGENT_TOOLS = [
    get_stock_price,
    get_quarterly_financials,
    search_internal_filings
]