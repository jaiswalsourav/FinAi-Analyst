"""
app/schemas/rag.py
Pydantic schemas for RAG ingestion and retrieval operations.
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class AddDocumentRequest(BaseModel):
    content: str = Field(..., description="Raw text content to chunk and store")
    symbol: Optional[str] = Field(default=None, description="Stock ticker associated with document")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata tags")
    doc_id: Optional[str] = Field(default=None, description="Optional custom identifier for the document")


class RetrieveRequest(BaseModel):
    query: str = Field(..., description="Semantic search query")
    symbol: Optional[str] = Field(default=None, description="Optional ticker filter")
    k: int = Field(default=3, ge=1, le=20, description="Number of context chunks to return")