"""
app/services/rag_service.py
RAG service utilizing LangChain, Google GenAI embeddings, and ChromaDB.
"""

import os
import shutil
from typing import Dict, List, Optional

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings


class RAGManager:
    """Manages document chunking, embeddings, upserts, and vector retrieval."""

    def __init__(self, api_key: str = settings.GEMINI_API_KEY, persist_directory: str = settings.CHROMA_PERSIST_DIR):
        self.api_key = api_key
        self.persist_directory = persist_directory
        self.collection_name = "financial_documents"

        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            google_api_key=self.api_key
        )

        self._init_vector_store()

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )

    def _init_vector_store(self) -> None:
        """Initialize or reconnect to the Chroma collection."""
        self.vector_store = Chroma(
            collection_name=self.collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_directory
        )

    def add_document(
        self,
        text: str,
        metadata: Optional[Dict] = None,
        doc_id: Optional[str] = None
    ) -> int:
        """Add or upsert a document into Chroma with deterministic chunk IDs."""
        if not text or not text.strip():
            return 0

        metadata = metadata or {}
        chunks = self.text_splitter.split_text(text)
        base_id = doc_id or f"doc_{abs(hash(text))}"

        documents = []
        ids = []

        for idx, chunk in enumerate(chunks):
            chunk_id = f"{base_id}_chunk_{idx}"
            documents.append(
                Document(
                    page_content=chunk,
                    metadata={
                        **metadata,
                        "chunk_index": idx,
                        "doc_id": base_id
                    }
                )
            )
            ids.append(chunk_id)

        # Providing explicit IDs guarantees deterministic upserts instead of duplicate records
        self.vector_store.add_documents(documents=documents, ids=ids)
        return len(documents)

    def retrieve(
        self,
        query: str,
        k: int = 3,
        filter_dict: Optional[Dict] = None
    ) -> List[Dict]:
        """Search vector store using optional native Chroma metadata filters."""
        try:
            results = self.vector_store.similarity_search_with_score(
                query=query,
                k=k,
                filter=filter_dict
            )

            retrieved = []
            for doc, score in results:
                retrieved.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "distance": float(score)
                })
            return retrieved
        except Exception as err:
            print(f"Error retrieving documents: {err}")
            return []

    def clear(self) -> None:
        """Wipe collection and re-establish database connection."""
        try:
            self.vector_store.delete_collection()
        except Exception:
            if os.path.exists(self.persist_directory):
                shutil.rmtree(self.persist_directory)
        self._init_vector_store()

    def format_context(self, retrieved_docs: List[Dict]) -> str:
        """Format retrieved documents into structured context for prompt synthesis."""
        if not retrieved_docs:
            return ""

        context_blocks = ["=== RETRIEVED CONTEXT ==="]
        for i, doc in enumerate(retrieved_docs, 1):
            source = doc.get("metadata", {}).get("source", "Internal KB")
            symbol = doc.get("metadata", {}).get("symbol", "N/A")
            distance = doc.get("distance", 0.0)

            header = f"[Doc {i}] Symbol: {symbol} | Source: {source} | Distance: {distance:.3f}"
            context_blocks.append(f"{header}\n{doc.get('content', '').strip()}\n")

        return "\n".join(context_blocks)


# Singleton instance for dependency injection
rag_manager = RAGManager() if settings.GEMINI_API_KEY else None