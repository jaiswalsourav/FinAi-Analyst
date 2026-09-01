"""
RAG (Retrieval-Augmented Generation) Module using LangChain + ChromaDB

Provides document storage, embedding, and retrieval capabilities
for enhancing LLM responses with relevant financial context.
"""

import os
from typing import List, Dict, Optional
from pathlib import Path

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.schema import Document


class RAGManager:
    """
    Manages Retrieval-Augmented Generation using LangChain + ChromaDB.
    
    Handles document storage, chunking, embedding, and semantic search.
    """
    
    def __init__(self, api_key: str, persist_directory: str = "./chroma_db"):
        """
        Initialize RAG Manager.
        
        Args:
            api_key: Google Generative AI API key for embeddings
            persist_directory: Path to persist ChromaDB locally
        """
        self.api_key = api_key
        self.persist_directory = persist_directory
        
        # Initialize embeddings model (Gemini)
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=api_key
        )
        
        # Initialize ChromaDB vector store
        self.vector_store = Chroma(
            embedding_function=self.embeddings,
            persist_directory=persist_directory,
            collection_name="financial_documents"
        )
        
        # Text splitter for chunking documents
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )
        
        print(f"RAG Manager initialized. ChromaDB persisted at: {persist_directory}")
    
    def add_document(self, text: str, metadata: Optional[Dict] = None, doc_id: Optional[str] = None) -> int:
        """
        Add a document to the vector store.
        
        Args:
            text: Document content
            metadata: Optional metadata (source, category, etc.)
            doc_id: Optional unique document ID
            
        Returns:
            Number of chunks added
        """
        if not text or not text.strip():
            print("Warning: Empty document provided")
            return 0
        
        # Set default metadata
        if metadata is None:
            metadata = {}
        
        # Split document into chunks
        chunks = self.text_splitter.split_text(text)
        
        # Create documents with metadata
        documents = [
            Document(
                page_content=chunk,
                metadata={
                    **metadata,
                    "chunk_index": i,
                    "doc_id": doc_id or metadata.get("source", f"doc_{id(text)}")
                }
            )
            for i, chunk in enumerate(chunks)
        ]
        
        # Add to ChromaDB
        self.vector_store.add_documents(documents)
        self.vector_store.persist()  # Persist changes to disk
        
        print(f"Added document with {len(documents)} chunks")
        return len(documents)
    
    def retrieve(self, query: str, k: int = 3) -> List[Dict]:
        """
        Retrieve relevant documents for a query.
        
        Args:
            query: Search query
            k: Number of results to return
            
        Returns:
            List of retrieved documents with content and metadata
        """
        try:
            # Search in vector store
            results = self.vector_store.similarity_search_with_score(query, k=k)
            
            retrieved = []
            for doc, score in results:
                retrieved.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "score": float(score)  # Similarity score
                })
            
            return retrieved
        except Exception as e:
            print(f"Error retrieving documents: {e}")
            return []
    
    def add_file(self, filepath: str, metadata: Optional[Dict] = None) -> int:
        """
        Load and add a text file to the vector store.
        
        Args:
            filepath: Path to text file
            metadata: Optional metadata for the document
            
        Returns:
            Number of chunks added
        """
        try:
            if not os.path.exists(filepath):
                raise FileNotFoundError(f"File not found: {filepath}")
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if metadata is None:
                metadata = {}
            
            metadata["source"] = filepath
            metadata["filename"] = os.path.basename(filepath)
            
            return self.add_document(content, metadata=metadata)
        
        except Exception as e:
            print(f"Error loading file {filepath}: {e}")
            return 0
    
    def format_context(self, retrieved_docs: List[Dict]) -> str:
        """
        Format retrieved documents as context string for LLM.
        
        Args:
            retrieved_docs: List of retrieved documents
            
        Returns:
            Formatted context string for prompt
        """
        if not retrieved_docs:
            return ""
        
        context = "RETRIEVED CONTEXT:\n"
        context += "=" * 50 + "\n\n"
        
        for i, doc in enumerate(retrieved_docs, 1):
            score = doc.get('score', 0)
            source = doc.get('metadata', {}).get('source', 'Unknown')
            
            context += f"[Document {i}] (Similarity: {score:.3f}, Source: {source})\n"
            context += "-" * 50 + "\n"
            context += doc.get('content', '')[:800] + "...\n\n"
        
        return context


def get_rag_manager(api_key: str) -> RAGManager:
    """
    Factory function to get or create RAG manager.
    
    Args:
        api_key: Google Generative AI API key
        
    Returns:
        RAGManager instance
    """
    return RAGManager(api_key)
