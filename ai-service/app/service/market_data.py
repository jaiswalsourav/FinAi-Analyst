"""
app/service/market_data.py
Market data retrieval service utilizing Alpha Vantage with yfinance fallback.
"""

import re
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
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


_COMPANY_SUFFIX = re.compile(r"\s+(limited|ltd\.?|inc\.?|corporation|corp\.?|plc|co\.?)$", re.IGNORECASE)


def _company_name(yf_symbol: str) -> str:
    """Best-effort company name for a ticker, used as the news search term."""
    try:
        info = yf.Ticker(yf_symbol).info or {}
        name = info.get("longName") or info.get("shortName")
        if name:
            return _COMPANY_SUFFIX.sub("", name).strip()
    except Exception:
        pass
    return yf_symbol.split(".")[0]


def fetch_news(symbol: str, limit: int = 8) -> Dict[str, Any]:
    """Recent headlines about a company from Google News (RSS), newest first."""
    yf_symbol = _to_yf_symbol(symbol)
    company = _company_name(yf_symbol)
    response = requests.get(
        "https://news.google.com/rss/search",
        params={"q": f"{company} stock", "hl": "en-IN", "gl": "IN", "ceid": "IN:en"},
        headers={"User-Agent": "Mozilla/5.0"},
        timeout=10,
    )
    response.raise_for_status()

    articles = []
    for item in ET.fromstring(response.content).findall(".//item"):
        url = (item.findtext("link") or "").strip()
        if not url.startswith(("http://", "https://")):
            continue
        source_node = item.find("source")
        source = (source_node.text or "").strip() if source_node is not None else ""
        title = (item.findtext("title") or "").strip()
        if source and title.endswith(f" - {source}"):
            title = title[: -len(source) - 3].strip()  # Google appends " - Publisher"
        try:
            published = parsedate_to_datetime(item.findtext("pubDate") or "").isoformat()
        except Exception:
            published = None
        articles.append({"title": title, "source": source, "published": published, "url": url})

    articles.sort(key=lambda article: article["published"] or "", reverse=True)
    return {"symbol": symbol, "company": company, "articles": articles[:limit]}


INDEX_SYMBOLS = {
    "NIFTY": "^NSEI", "NIFTY50": "^NSEI", "NIFTY 50": "^NSEI",
    "SENSEX": "^BSESN", "BSE SENSEX": "^BSESN",
    "BANKNIFTY": "^NSEBANK", "NIFTY BANK": "^NSEBANK",
    "NIFTYIT": "^CNXIT", "NIFTY IT": "^CNXIT",
    "NIFTY MIDCAP 150": "NIFTYMIDCAP150.NS", "MIDCAP": "NIFTYMIDCAP150.NS",
    "NIFTY SMALLCAP 250": "NIFTYSMLCAP250.NS", "SMALLCAP": "NIFTYSMLCAP250.NS",
    "NASDAQ": "^IXIC", "S&P 500": "^GSPC", "SP500": "^GSPC", "DOW": "^DJI",
}

# Approximate Nifty 50 membership (index changes twice a year); missing tickers are skipped
NIFTY50 = [
    "ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK", "BAJAJ-AUTO", "BAJFINANCE", "BAJAJFINSV",
    "BEL", "BHARTIARTL", "CIPLA", "COALINDIA", "DRREDDY", "EICHERMOT", "ETERNAL", "GRASIM", "HCLTECH", "HDFCBANK",
    "HDFCLIFE", "HINDALCO", "HINDUNILVR", "ICICIBANK", "INDUSINDBK", "INFY", "ITC", "JIOFIN", "JSWSTEEL",
    "KOTAKBANK", "LT", "M&M", "MARUTI", "NESTLEIND", "NTPC", "ONGC", "POWERGRID", "RELIANCE", "SBILIFE", "SBIN",
    "SHRIRAMFIN", "SUNPHARMA", "TATACONSUM", "TATASTEEL", "TCS", "TECHM", "TITAN", "TRENT", "ULTRACEMCO", "WIPRO",
]


def fetch_index(name: str) -> Dict[str, Any]:
    """Level, day change, ranges and recent closes for a market index (Nifty 50, Sensex, Nasdaq...)."""
    key = name.strip().upper()
    symbol = INDEX_SYMBOLS.get(key) or (key if key.startswith("^") else None)
    if not symbol:
        return {"error": f"Unknown index '{name}'. Known: {', '.join(sorted(INDEX_SYMBOLS))}"}

    history = yf.Ticker(symbol).history(period="1y", interval="1d")
    closes = history["Close"].dropna() if history is not None and not history.empty else None
    if closes is None or len(closes) < 2:
        return {"error": f"No data for index {name}"}

    last, prev = float(closes.iloc[-1]), float(closes.iloc[-2])
    latest_bar = history.dropna(subset=["Close"]).iloc[-1]
    month_ago = float(closes.iloc[-22]) if len(closes) > 22 else float(closes.iloc[0])
    return {
        "index": name,
        "symbol": symbol,
        "level": round(last, 2),
        "day_change": round(last - prev, 2),
        "day_change_percent": round((last / prev - 1) * 100, 2),
        "day_high": round(float(latest_bar["High"]), 2),
        "day_low": round(float(latest_bar["Low"]), 2),
        "one_month_change_percent": round((last / month_ago - 1) * 100, 2),
        "week52_high": round(float(closes.max()), 2),
        "week52_low": round(float(closes.min()), 2),
        "recent_closes": {day.strftime("%Y-%m-%d"): round(float(value), 2) for day, value in closes.tail(10).items()},
        "source": "yfinance",
    }


def fetch_nifty50_movers(top: int = 5) -> Dict[str, Any]:
    """Day change of every Nifty 50 stock in one batch, with the top gainers and losers."""
    tickers = [f"{symbol}.NS" for symbol in NIFTY50]
    data = yf.download(tickers, period="5d", group_by="ticker", progress=False, auto_adjust=False, threads=True)

    rows = []
    for ticker in tickers:
        try:
            closes = data[ticker]["Close"].dropna()
            rows.append({
                "symbol": ticker.replace(".NS", ""),
                "price": round(float(closes.iloc[-1]), 2),
                "change_percent": round((float(closes.iloc[-1]) / float(closes.iloc[-2]) - 1) * 100, 2),
            })
        except Exception:
            continue  # delisted / no data

    if not rows:
        return {"error": "No Nifty 50 constituent data available right now"}
    rows.sort(key=lambda row: row["change_percent"], reverse=True)
    advancing = sum(1 for row in rows if row["change_percent"] > 0)
    return {
        "stocks_covered": len(rows),
        "advancing": advancing,
        "declining": len(rows) - advancing,
        "top_gainers": rows[:top],
        "top_losers": rows[-top:][::-1],
        "all_stocks": rows,
        "note": "Constituent list is approximate; day change is last close vs previous close.",
        "source": "yfinance",
    }


# (name for fetch_index, market-cap segment shown on the dashboard, TradingView chart symbol)
MARKET_INDICES = [
    ("Nifty 50", "Large cap", "NSE:NIFTY"),
    ("Sensex", "Large cap", "BSE:SENSEX"),
    ("Nifty Midcap 150", "Mid cap", "NSE:NIFTYMIDCAP150"),
    ("Nifty Smallcap 250", "Small cap", "NSE:NIFTYSMLCAP250"),
    ("Nifty Bank", "Banking", "NSE:BANKNIFTY"),
    ("Nifty IT", "IT sector", "NSE:CNXIT"),
]


def fetch_market_overview() -> Dict[str, Any]:
    """Everything for the dashboard's first page: index levels with day low/high by market-cap segment, plus Nifty 50 movers."""
    with ThreadPoolExecutor(max_workers=len(MARKET_INDICES) + 1) as pool:
        index_jobs = [pool.submit(fetch_index, name) for name, _, _ in MARKET_INDICES]
        movers_job = pool.submit(fetch_nifty50_movers)

        indices = []
        for (name, cap, chart_symbol), job in zip(MARKET_INDICES, index_jobs):
            try:
                data = job.result()
            except Exception:
                continue
            if "error" in data:
                continue
            indices.append({**data, "name": name, "cap": cap, "chart_symbol": chart_symbol})

        try:
            movers = movers_job.result()
        except Exception as exc:
            movers = {"error": str(exc)}

    return {
        "indices": indices,
        "movers": None if "error" in movers else {key: movers[key] for key in ("stocks_covered", "advancing", "declining", "top_gainers", "top_losers")},
        "as_of": datetime.now(timezone.utc).isoformat(),
    }


# range key -> (yfinance period, bar interval)
HISTORY_RANGES = {
    "1d": ("5d", "5m"),  # trimmed to the latest trading session below (period=1d is often empty)
    "5d": ("5d", "15m"),
    "1mo": ("1mo", "1d"),
    "6mo": ("6mo", "1d"),
    "1y": ("1y", "1d"),
    "5y": ("5y", "1wk"),
}


def fetch_history(symbol: str, range_key: str) -> Dict[str, Any]:
    """OHLC + volume bars for a stock or index, for the dashboard price chart."""
    if range_key not in HISTORY_RANGES:
        raise ValueError(f"Unknown range '{range_key}'. Use one of: {', '.join(HISTORY_RANGES)}")
    period, interval = HISTORY_RANGES[range_key]
    yf_symbol = _to_yf_symbol(symbol)

    history = yf.Ticker(yf_symbol).history(period=period, interval=interval)
    if history is None or history.empty:
        raise ValueError(f"No price history found for {symbol}")
    history = history.dropna(subset=["Close"])
    if range_key == "1d" and not history.empty:
        latest_day = history.index[-1].date()
        history = history[[stamp.date() == latest_day for stamp in history.index]]

    points = [
        {
            "t": index.isoformat(),
            "o": round(float(row["Open"]), 2),
            "h": round(float(row["High"]), 2),
            "l": round(float(row["Low"]), 2),
            "c": round(float(row["Close"]), 2),
            "v": int(row["Volume"]) if row["Volume"] == row["Volume"] else 0,
        }
        for index, row in history.iterrows()
    ]
    return {"symbol": symbol, "yf_symbol": yf_symbol, "range": range_key, "interval": interval, "points": points}
