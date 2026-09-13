"""
app/service/market_data.py
Market data retrieval service utilizing Alpha Vantage with yfinance fallback.
"""

from typing import Any, Dict
import requests
import yfinance as yf

from app.core.config import settings


def fetch_quote(symbol: str) -> Dict[str, Any]:
    """Retrieve the current price and market metrics for a given ticker symbol."""
    ticker_clean = symbol.strip().upper()

    # 1. Attempt retrieval via Alpha Vantage if an API key is configured
    if settings.ALPHA_VANTAGE_KEY:
        try:
            url = (
                f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE"
                f"&symbol={ticker_clean}&apikey={settings.ALPHA_VANTAGE_KEY}"
            )
            response = requests.get(url, timeout=10)
            data = response.json()
            quote_data = data.get("Global Quote", {})
            if quote_data:
                return {
                    "symbol": ticker_clean,
                    "price": float(quote_data.get("05. price", 0.0)),
                    "change": float(quote_data.get("09. change", 0.0)),
                    "change_percent": quote_data.get("10. change percent", "0%"),
                    "volume": int(quote_data.get("06. volume", 0)),
                    "source": "Alpha Vantage"
                }
        except Exception:
            pass  # Fail over to yfinance

    # 2. Fallback retrieval via yfinance
    try:
        ticker = yf.Ticker(ticker_clean)
        info = ticker.info
        price = (
            info.get("currentPrice")
            or info.get("regularMarketPrice")
            or info.get("previousClose")
        )
        return {
            "symbol": ticker_clean,
            "price": price,
            "currency": info.get("currency", "USD"),
            "day_high": info.get("dayHigh"),
            "day_low": info.get("dayLow"),
            "volume": info.get("regularMarketVolume") or info.get("volume"),
            "source": "yfinance"
        }
    except Exception as exc:
        return {"error": f"Failed to retrieve quote for {ticker_clean}: {str(exc)}"}


def fetch_quarterly_earnings(symbol: str) -> Dict[str, Any]:
    """Retrieve recent quarterly financials or earnings metrics for a stock."""
    ticker_clean = symbol.strip().upper()

    try:
        ticker = yf.Ticker(ticker_clean)
        income_stmt = ticker.quarterly_income_stmt

        if income_stmt is not None and not income_stmt.empty:
            # Convert recent quarters to a JSON-serializable dictionary
            recent_quarters = income_stmt.iloc[:, :4].fillna(0).to_dict()
            # Stringify timestamps for clean JSON serialization
            serialized_data = {
                str(date): metrics for date, metrics in recent_quarters.items()
            }
            return {
                "symbol": ticker_clean,
                "quarterly_financials": serialized_data,
                "source": "yfinance"
            }

        return {
            "symbol": ticker_clean,
            "message": "No quarterly earnings statement available for this ticker."
        }
    except Exception as exc:
        return {
            "error": f"Failed to retrieve quarterly earnings for {ticker_clean}: {str(exc)}"
        }