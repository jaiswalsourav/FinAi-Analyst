"""
app/core/cache.py
Centralized in-memory TTL caches and session state storage.
"""

from typing import Any, Dict
from cachetools import TTLCache

# Real-time stock quote cache (2-minute TTL, max 250 symbols)
quote_cache: TTLCache = TTLCache(maxsize=250, ttl=120)

# Fundamentals and quarterly earnings cache (24-hour TTL, max 100 symbols)
fundamentals_cache: TTLCache = TTLCache(maxsize=100, ttl=86400)

# Technical indicators cache (10-minute TTL, max 250 symbols)
technicals_cache: TTLCache = TTLCache(maxsize=250, ttl=600)

# Multi-turn Gemini ChatSession objects keyed by session_id
session_store: Dict[str, Any] = {}


def clear_all_caches() -> None:
    """Utility to flush all in-memory caches simultaneously."""
    quote_cache.clear()
    fundamentals_cache.clear()
    technicals_cache.clear()