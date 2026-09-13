"""
app/api/rag_api.py
FastAPI router for document ingestion and retrieval.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.schemas.rag import AddDocumentRequest, RetrieveRequest
from app.service.rag_service import rag_manager

router = APIRouter(prefix="/rag", tags=["RAG / Vector Store"])


@router.post("/add-document")
def add_document(req: AddDocumentRequest):
    if not rag_manager:
        raise HTTPException(status_code=503, detail="RAG service not initialized")

    metadata = req.metadata or {}
    if req.symbol:
        metadata["symbol"] = req.symbol.upper()

    chunks_added = rag_manager.add_document(
        text=req.content,
        metadata=metadata,
        doc_id=req.doc_id
    )
    return {"status": "success", "chunks_added": chunks_added}


@router.post("/add-file")
def add_file(file: UploadFile = File(...), symbol: Optional[str] = None):
    if not rag_manager:
        raise HTTPException(status_code=503, detail="RAG service not initialized")

    try:
        content = file.file.read().decode("utf-8", errors="ignore")
        metadata = {
            "filename": file.filename,
            "content_type": file.content_type,
            "symbol": symbol.upper() if symbol else "GENERAL"
        }
        chunks_added = rag_manager.add_document(
            text=content,
            metadata=metadata,
            doc_id=file.filename
        )
        return {"status": "success", "filename": file.filename, "chunks_added": chunks_added}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File ingestion error: {str(e)}")


@router.post("/retrieve")
def retrieve_documents(req: RetrieveRequest):
    if not rag_manager:
        raise HTTPException(status_code=503, detail="RAG service not initialized")

    filter_dict = {"symbol": req.symbol.upper()} if req.symbol else None
    results = rag_manager.retrieve(query=req.query, k=req.k, filter_dict=filter_dict)
    return {"query": req.query, "count": len(results), "results": results}


@router.delete("/clear")
def clear_vector_store():
    if not rag_manager:
        raise HTTPException(status_code=503, detail="RAG service not initialized")

    rag_manager.clear()
    return {"status": "success", "message": "RAG collection cleared"}