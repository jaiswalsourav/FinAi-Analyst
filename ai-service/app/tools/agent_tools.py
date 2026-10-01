"""
app/tools/agent_tools.py
Gemini Function Calling tool registry wrapping underlying services.
"""

from typing import Any, Dict, Optional
from app.service.market_data import _to_yf_symbol, fetch_quarterly_earnings, fetch_index, fetch_nifty50_movers, fetch_quote, fetch_stock_info
from app.service.rag_service import rag_manager


def get_stock_price(symbol: str) -> Dict[str, Any]:
    """
    Fetch the latest stock price, day's high/low, and daily percentage change.
    Use this whenever the user asks for current price, quote, or valuation updates.
    """
    return fetch_quote(_to_yf_symbol(symbol))


def get_company_overview(symbol: str) -> Dict[str, Any]:
    """
    Fetch a company overview: name, sector, industry, market cap, P/E ratio, EPS, dividend yield,
    day range, 52-week range, volume and the last ten daily closing prices.
    Use this for valuation questions, comparisons and any question about P/E, market cap or price ranges.
    """
    try:
        info = fetch_stock_info(symbol)
    except Exception as exc:
        return {"error": f"No data for {symbol}: {exc}"}
    return {
        "symbol": info["global_quote"].get("01. symbol", symbol),
        "price": info["global_quote"].get("05. price"),
        "change_percent": info["global_quote"].get("10. change percent"),
        **info.get("details", {}),
        "recent_closes": {day: values["4. close"] for day, values in list(info["time_series"].items())[:10]},
    }


def get_index_overview(index_name: str) -> Dict[str, Any]:
    """
    Fetch a market index: current level, day change %, 1-month change %, 52-week range and recent closes.
    index_name can be: Nifty 50, Sensex, Bank Nifty, Nifty IT, Nasdaq, S&P 500, Dow.
    Use this for questions about the market, an index, or overall market direction.
    """
    return fetch_index(index_name)


def get_nifty50_movers() -> Dict[str, Any]:
    """
    Fetch today's change for ALL Nifty 50 stocks in one call: top gainers, top losers, advancing vs declining
    counts and every stock's price and change %. Use this for questions about the Nifty 50 as a whole,
    market breadth, which large-cap stocks are up or down, or heatmap-style overviews.
    """
    return fetch_nifty50_movers()


def get_quarterly_financials(symbol: str) -> Dict[str, Any]:
    """
    Fetch historical quarterly EPS, analyst estimates, and surprise percentages.
    Use this when answering questions about earnings reports, EPS trends, or past quarterly results.
    """
    return fetch_quarterly_earnings(_to_yf_symbol(symbol))


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
    get_company_overview,
    get_index_overview,
    get_nifty50_movers,
    get_quarterly_financials,
    search_internal_filings
]