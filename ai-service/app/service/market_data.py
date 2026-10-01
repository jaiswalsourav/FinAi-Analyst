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

def _to_yf_symbol(symbol: str) -> str:
    """Convert 'EXCHANGE:TICKER' (e.g. NSE:TCS, NASDAQ:AAPL) into a yfinance ticker."""
    raw = symbol.strip().upper()
    if ":" not in raw:
        return raw
    exchange, ticker = raw.split(":", 1)
    suffix = {"NSE": ".NS", "BSE": ".BO"}.get(exchange, "")
    return f"{ticker}{suffix}"


def fetch_stock_info(symbol: str) -> Dict[str, Any]:
    """Quote and recent daily closes, shaped like Alpha Vantage's GLOBAL_QUOTE / TIME_SERIES_DAILY."""
    yf_symbol = _to_yf_symbol(symbol)
    history = yf.Ticker(yf_symbol).history(period="1mo", interval="1d")
    if history is None or history.empty:
        raise ValueError(f"No market data found for {symbol}")

    closes = history["Close"].dropna()
    last = float(closes.iloc[-1])
    prev = float(closes.iloc[-2]) if len(closes) > 1 else last
    change = last - prev
    percent = (change / prev * 100) if prev else 0.0

    time_series = {
        index.strftime("%Y-%m-%d"): {"4. close": f"{float(row['Close']):.4f}"}
        for index, row in history.dropna(subset=["Close"]).sort_index(ascending=False).iterrows()
    }
    details: Dict[str, Any] = {}
    try:
        info = yf.Ticker(yf_symbol).info or {}
        details = {
            "name": info.get("longName") or info.get("shortName"),
            "currency": info.get("currency"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "eps": info.get("trailingEps"),
            "dividend_yield": info.get("dividendYield"),
            "day_high": info.get("dayHigh"),
            "day_low": info.get("dayLow"),
            "week52_high": info.get("fiftyTwoWeekHigh"),
            "week52_low": info.get("fiftyTwoWeekLow"),
            "volume": info.get("regularMarketVolume") or info.get("volume"),
        }
    except Exception:
        pass  # quote and chart still work without fundamentals

    return {
        "symbol": symbol,
        "details": details,
        "global_quote": {
            "01. symbol": yf_symbol,
            "05. price": f"{last:.4f}",
            "09. change": f"{change:.4f}",
            "10. change percent": f"{percent:.2f}%",
        },
        "time_series": time_series,
        "source": "yfinance",
    }
