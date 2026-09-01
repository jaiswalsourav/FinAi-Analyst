# RAG (Retrieval-Augmented Generation) Implementation

This guide explains how to use the RAG features in your FinAI Analyst AI service.

## What is RAG?

Retrieval-Augmented Generation (RAG) enhances LLM responses by:
1. **Retrieving** relevant documents from a knowledge base
2. **Augmenting** the prompt with retrieved context
3. **Generating** more accurate, contextual responses

## Architecture

- **Embeddings Model**: Gemini's `embedding-001` (built-in)
- **Vector Database**: ChromaDB (local, persistent)
- **Text Processing**: LangChain's RecursiveCharacterTextSplitter

## Setup

### 1. Install Dependencies

The required packages are already in `requirements.txt`:
```bash
pip install -r requirements.txt
```

This includes:
- `langchain` - Framework for LLM applications
- `langchain-google-genai` - Gemini integration
- `chromadb` - Vector database

### 2. ChromaDB Persistence

ChromaDB stores embeddings locally in `./chroma_db/`. This persists across restarts, so you don't need to re-embed documents.

## Usage

### 1. Add Documents via API

#### Option A: Add text directly
```bash
curl -X POST http://localhost:8001/rag/add-document \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Apple Inc. (AAPL) is a technology company...",
    "metadata": {"source": "manual", "category": "stocks"},
    "doc_id": "aapl_overview"
  }'
```

Response:
```json
{
  "status": "success",
  "chunks_added": 2,
  "message": "Document added successfully with 2 chunks"
}
```

#### Option B: Upload a file
```bash
curl -X POST http://localhost:8001/rag/add-file \
  -F "file=@financial_report.txt" \
  -F "doc_id=annual_report_2024"
```

### 2. Use RAG in Queries

Both `/ask` and `/ask-stock` endpoints support RAG by default.

#### With RAG (default):
```bash
curl -X POST http://localhost:8001/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is Apple's market strategy?",
    "use_rag": true
  }'
```

Response:
```json
{
  "answer": "Based on recent financial documents, Apple's market strategy...",
  "used_rag": true
}
```

#### Without RAG:
```bash
curl -X POST http://localhost:8001/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is Apple's market strategy?",
    "use_rag": false
  }'
```

### 3. Stock Queries with RAG

```bash
curl -X POST http://localhost:8001/ask-stock \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "question": "What are the recent news and analyst opinions?",
    "use_rag": true
  }'
```

The endpoint combines:
- Real-time stock data (Alpha Vantage)
- Retrieved historical/analytical documents (RAG)
- LLM-generated insights

### 4. Retrieve Documents

Search for relevant documents without generating responses:
```bash
curl -X POST http://localhost:8001/rag/retrieve \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Apple financial performance",
    "k": 3
  }'
```

Response:
```json
{
  "query": "Apple financial performance",
  "count": 3,
  "results": [
    {
      "content": "Apple reported Q3 2024 earnings...",
      "metadata": {"source": "earnings_report.txt", "chunk_index": 0},
      "score": 0.85
    },
    ...
  ]
}
```

### 5. Clear RAG Store

```bash
curl -X DELETE http://localhost:8001/rag/clear
```

Response:
```json
{
  "status": "success",
  "message": "RAG store cleared and reinitialized"
}
```

## Configuration

### Environment Variables

Add to `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
ALPHA_VANTAGE_KEY=your_alpha_vantage_key_here
CORS_ORIGINS=http://localhost:3000
```

### Chunking Parameters

Edit `rag.py` to customize chunking:
```python
self.text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,        # Size of each chunk
    chunk_overlap=200,      # Overlap between chunks for context
    separators=["\n\n", "\n", " ", ""]  # Preferred split points
)
```

### Retrieval Parameters

Control how many documents are retrieved:
```python
# In /ask endpoint
retrieved_docs = rag_manager.retrieve(req.question, k=3)  # k = number of results
```

## Best Practices

1. **Document Quality**: Use clean, well-structured financial documents for better results.

2. **Metadata**: Include helpful metadata (source, date, category) for filtering:
   ```json
   {
     "content": "...",
     "metadata": {
       "source": "SEC filing",
       "ticker": "AAPL",
       "year": 2024,
       "doc_type": "10-K"
     }
   }
   ```

3. **Chunking Strategy**: 
   - Smaller chunks (500-800 tokens): Better for precision, more retrievals
   - Larger chunks (1000-2000 tokens): Better for context, fewer retrievals

4. **Vector Store Maintenance**:
   - Periodically review document quality
   - Remove outdated documents (use clear endpoint)
   - Add new documents as they become available

## Performance Tips

1. **Batch Operations**: If adding many documents, do it in batches to avoid timeouts.

2. **Caching**: ChromaDB caches embeddings, so repeated queries are fast (< 100ms).

3. **Similarity Threshold**: Consider filtering results by score:
   ```python
   high_confidence = [doc for doc in results if doc['score'] < 0.5]  # Lower is better
   ```

## Troubleshooting

### RAG Manager Not Initialized
- Check GEMINI_API_KEY is set correctly
- Verify LangChain packages are installed: `pip install -r requirements.txt`

### Slow Retrieval
- Check ChromaDB persistence path is writable
- Clear and reinitialize if corrupted: `DELETE /rag/clear`

### Poor Retrieval Results
- Ensure documents are semantically relevant to queries
- Try different chunk sizes and overlaps
- Add more documents for better coverage

## Example Workflow

```python
# 1. Load financial documents
POST /rag/add-file with annual_report_2024.txt
POST /rag/add-file with analyst_opinions.txt

# 2. Query with RAG
POST /ask with "What are growth prospects?" (use_rag=true)
# → Retrieved documents + LLM response

# 3. Check specific retrieval
POST /rag/retrieve with "analyst recommendations"
# → See which documents matched

# 4. Clean up when needed
DELETE /rag/clear
```

## Integration with Frontend

Your React frontend can:

1. Upload documents to prime RAG:
   ```javascript
   const formData = new FormData();
   formData.append('file', file);
   fetch('http://localhost:8001/rag/add-file', {
     method: 'POST',
     body: formData
   });
   ```

2. Query with RAG awareness:
   ```javascript
   const response = await fetch('http://localhost:8001/ask', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       question: userInput,
       use_rag: true  // Enable RAG retrieval
     })
   });
   ```

3. Display confidence with `used_rag` flag:
   ```javascript
   if (data.used_rag) {
     // Show "Powered by documents" indicator
   }
   ```

## Learn More

- [LangChain Docs](https://python.langchain.com/)
- [ChromaDB Docs](https://docs.trychroma.com/)
- [Gemini Embeddings](https://ai.google.dev/docs/embeddings)
