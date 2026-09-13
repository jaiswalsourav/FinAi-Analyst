"""
app/schemas/agent.py
Pydantic schemas for the Gemini AI agent routes.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AgentAskRequest(BaseModel):
    prompt: str = Field(..., description="User query or financial question")
    session_id: str = Field(default="default", description="Conversation session ID for multi-turn chat")
    symbol: Optional[str] = Field(default=None, description="Optional stock ticker context (e.g. AAPL)")
    user_portfolio: Optional[List[str]] = Field(default=None, description="List of tickers owned by user")


class AgentAskResponse(BaseModel):
    answer: str
    session_id: str
    tools_used: List[Dict[str, Any]] = Field(default_factory=list)