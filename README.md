# FinAI Analyst

A starter full-stack project for a financial analyst assistant that combines:
- React for the web experience
- Java Spring Boot for the backend API
- Python FastAPI for Gemini-powered AI analysis with **Retrieval-Augmented Generation (RAG)**

## Key Features

- **AI-Powered Analysis**: Gemini LLM for financial insights
- **RAG Integration**: Retrieval-Augmented Generation using ChromaDB for context-aware responses
- **Real-time Stock Data**: Alpha Vantage API integration for live prices and historical data
- **Quarterly Earnings Storage**: Automatically store and retrieve quarterly earnings, EPS, and surprises
- **Secure Authentication**: JWT-based auth with Spring Security
- **Document Management**: Upload and manage financial documents for RAG

## Architecture

- Frontend: React + Vite
- Backend: Java Spring Boot
- AI service: Python FastAPI with Gemini + RAG (ChromaDB)
- Orchestration: Docker Compose

## Project Structure

```text
frontend/   React app
backend/    Java Spring Boot API
ai-service/ Python AI service with RAG
```

## Run locally

```bash
docker compose up --build
```

Then open:
- Frontend: http://localhost:3000
- Backend: http://localhost:8080/api/health
- AI service: http://localhost:8001/health

## Environment

Set required API keys before running:

```bash
set GEMINI_API_KEY=your_gemini_key_here
set ALPHA_VANTAGE_KEY=your_alpha_vantage_key_here
set CORS_ORIGINS=http://localhost:3000
```

## RAG (Retrieval-Augmented Generation)

The AI service includes built-in RAG capabilities for enhanced responses:

- **Upload Documents**: Add financial reports, analyst notes, research papers
- **Semantic Search**: Find relevant information across your document library
- **Context-Aware Responses**: LLM generates responses augmented with retrieved context

### Quick Start with RAG

1. **Add a document**:
   ```bash
   curl -X POST http://localhost:8001/rag/add-document \
     -H "Content-Type: application/json" \
     -d '{
       "content": "Apple reported strong Q3 earnings...",
       "metadata": {"source": "earnings_report"}
     }'
   ```

2. **Query with RAG**:
   ```bash
   curl -X POST http://localhost:8001/ask \
     -H "Content-Type: application/json" \
     -d '{
       "question": "How is Apple performing?",
       "use_rag": true
     }'
   ```

For detailed RAG documentation, see [RAG_GUIDE.md](ai-service/RAG_GUIDE.md)

## API Endpoints

### AI Service - Core
- `POST /ask` - Ask a general question (with optional RAG)
- `POST /ask-stock` - Ask about a specific stock (with optional RAG)
- `GET /health` - Health check

### Financial Data
- `GET /stock-info` - Get current stock data from Alpha Vantage
- `POST /financial/store-stock-data` - Fetch and store stock data in RAG
- `POST /financial/search-historical` - Search stored historical data
- `GET /financial/stored-symbols` - List all stored stock symbols
- `POST /financial/store-quarterly-results` - Fetch and store quarterly earnings in RAG
- `POST /financial/search-quarterly` - Search quarterly earnings data
- `GET /financial/quarterly-summary/{symbol}` - Get quarterly results summary

### RAG Management
- `POST /rag/add-document` - Add document to RAG store
- `POST /rag/add-file` - Upload file to RAG store
- `POST /rag/retrieve` - Retrieve relevant documents
- `DELETE /rag/clear` - Clear RAG store

### Backend
- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

## Documentation

- [RAG_GUIDE.md](ai-service/RAG_GUIDE.md) - Complete RAG documentation
- [FINANCIAL_RAG_GUIDE.md](ai-service/FINANCIAL_RAG_GUIDE.md) - Stock data + RAG integration
- [QUARTERLY_RESULTS_GUIDE.md](ai-service/QUARTERLY_RESULTS_GUIDE.md) - Quarterly earnings storage

## Technologies

- **LLM**: Google Gemini 2.0 Flash
- **Embeddings**: Gemini Embeddings API
- **Vector Database**: ChromaDB
- **RAG Framework**: LangChain
- **Backend**: Spring Boot 3.3.1
- **Frontend**: React 18, Vite, Recharts
- **Financial Data**: Alpha Vantage API (stocks, earnings)

