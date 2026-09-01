# Financial Data + RAG Integration Guide

This guide explains how to use the integrated financial data storage with RAG for smarter AI analysis.

## Overview

The system now automatically stores financial data fetched from Alpha Vantage into the RAG database. This creates a searchable knowledge base that the AI can reference when:
- Analyzing stocks
- Identifying trends
- Making predictions
- Comparing performance

## How It Works

### 1. **Automatic Storage**
When you fetch stock data (via `/stock-info` or `/financial/store-stock-data`), it's automatically stored in RAG with metadata:
- Symbol (e.g., "AAPL")
- Data type (global_quote or time_series)
- Timestamp (when data was fetched)
- Full financial details (price, volume, change %)

### 2. **AI Context Enrichment**
When you ask the AI about a stock (via `/ask-stock` with `use_rag=true`), it:
1. Gets real-time data from Alpha Vantage
2. Retrieves stored historical data from RAG
3. Combines both for analysis
4. Provides informed insights

## API Endpoints

### Store Financial Data

#### Fetch & Store Stock Data
```bash
POST /financial/store-stock-data?symbol=AAPL
```

Automatically fetches current and historical data, then stores in RAG.

**Response:**
```json
{
  "status": "success",
  "symbol": "AAPL",
  "message": "Financial data for AAPL fetched and stored in RAG",
  "data_stored": {
    "has_quote": true,
    "quote_keys": ["05. price", "09. change", "10. change percent", "..."],
    "timeseries_records": 100
  }
}
```

#### Get Stored Symbols
```bash
GET /financial/stored-symbols
```

See which symbols have been stored and when.

**Response:**
```json
{
  "total_symbols": 3,
  "symbols": ["AAPL", "GOOGL", "MSFT"],
  "data_types": {
    "AAPL": ["global_quote", "time_series"],
    "GOOGL": ["global_quote", "time_series"],
    "MSFT": ["global_quote"]
  },
  "latest_updates": {
    "AAPL": "2026-09-01T15:30:00.123456",
    "GOOGL": "2026-09-01T14:20:00.987654",
    "MSFT": "2026-09-01T13:45:00.654321"
  }
}
```

### Search Financial Data

#### Search Historical Data
```bash
POST /financial/search-historical
Content-Type: application/json

{
  "query": "Apple price trends last month",
  "k": 5
}
```

Search for specific financial information across all stored data.

**Response:**
```json
{
  "query": "Apple price trends last month",
  "results_count": 3,
  "results": [
    {
      "content": "Stock Symbol: AAPL\nTimestamp: 2026-09-01T15:30:00\n...",
      "metadata": {
        "symbol": "AAPL",
        "data_type": "time_series",
        "timestamp": "2026-09-01T15:30:00",
        "source": "alpha_vantage",
        "num_records": 100
      },
      "relevance_score": 0.92,
      "symbol": "AAPL",
      "data_type": "time_series",
      "timestamp": "2026-09-01T15:30:00"
    },
    ...
  ]
}
```

## Usage Workflows

### Workflow 1: Prime RAG with Stock Data

```bash
# 1. Store data for multiple stocks
POST /financial/store-stock-data?symbol=AAPL
POST /financial/store-stock-data?symbol=GOOGL
POST /financial/store-stock-data?symbol=MSFT

# 2. Verify storage
GET /financial/stored-symbols

# 3. Ask AI questions about the stocks
POST /ask-stock
{
  "symbol": "AAPL",
  "question": "How has Apple performed compared to its competitors?",
  "use_rag": true
}

# 4. AI can now compare using stored data for AAPL, GOOGL, and MSFT
```

### Workflow 2: Historical Analysis

```bash
# 1. Store data for a stock
POST /financial/store-stock-data?symbol=TSLA

# 2. Search for specific information
POST /financial/search-historical
{
  "query": "Tesla 52-week high and low",
  "k": 3
}

# 3. Get detailed information
POST /ask-stock
{
  "symbol": "TSLA",
  "question": "What has been Tesla's 52-week performance?",
  "use_rag": true
}
```

### Workflow 3: Trend Analysis

```bash
# 1. Store multiple snapshots over time (daily/weekly)
POST /financial/store-stock-data?symbol=BTC  # or any crypto symbol via Alpha Vantage

# 2. Later, ask about trends
POST /ask-stock
{
  "symbol": "BTC",
  "question": "Show me the price trend and volume changes",
  "use_rag": true
}

# 3. AI uses all stored snapshots to identify trends
```

## Data Stored in RAG

### Global Quote Format
```
Stock Symbol: AAPL
Timestamp: 2026-09-01T15:30:00

Current Market Data (Global Quote):
- Price: $185.42
- Change: +2.15 (+1.17%)
- High (52 Week): $125.30 - $199.62
- Volume: 51,234,000
- PE Ratio: 28.5
- EPS: 6.50
```

### Time Series Format
```
Time Series Daily Data for AAPL:
Generated: 2026-09-01T15:30:00

Recent Trading Data (Last 10 Days):
Date: 2026-09-01
- Open: $183.50
- High: $186.00
- Low: $183.20
- Close: $185.42
- Adjusted Close: $185.40
- Volume: 51,234,000
```

## Best Practices

### 1. Regular Updates
Store stock data regularly (daily/weekly) to build historical context:

```bash
# Add this to a scheduled task or cron job
for symbol in AAPL GOOGL MSFT TSLA AMZN; do
  curl -X POST http://localhost:8001/financial/store-stock-data?symbol=$symbol
done
```

### 2. Monitor Storage
Check what's in your RAG:

```bash
GET /financial/stored-symbols
```

### 3. Clean Up Old Data
When RAG gets too large, clear and rebuild:

```bash
DELETE /rag/clear

# Then re-store important symbols
POST /financial/store-stock-data?symbol=AAPL
POST /financial/store-stock-data?symbol=GOOGL
```

### 4. Use RAG in Queries
Always set `use_rag=true` for better insights:

```bash
POST /ask
{
  "question": "Which stored stocks have the best PE ratios?",
  "use_rag": true
}
```

## Frontend Integration

### React Example: Store Stock Data

```javascript
async function storeStockData(symbol) {
  try {
    const response = await fetch(`http://localhost:8001/financial/store-stock-data?symbol=${symbol}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    console.log(`Stored data for ${symbol}:`, data);
  } catch (error) {
    console.error('Error storing stock data:', error);
  }
}

// Usage
await storeStockData('AAPL');
```

### React Example: Ask with RAG Context

```javascript
async function askAboutStock(symbol, question) {
  const response = await fetch('http://localhost:8001/ask-stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol: symbol,
      question: question,
      use_rag: true  // Enable RAG context
    })
  });
  
  const data = await response.json();
  console.log('Answer:', data.answer);
  console.log('Used RAG:', data.used_rag);
  
  if (data.used_rag) {
    // Show indicator that historical data was used
    showBadge('Using historical data');
  }
}

// Usage
await askAboutStock('AAPL', 'How has the stock performed?');
```

## Advanced: Custom Financial Queries

Combine RAG retrieval with custom analysis:

```bash
# 1. Search for specific metrics
POST /financial/search-historical
{
  "query": "PE ratio earnings per share market cap",
  "k": 10
}

# 2. Then ask AI to analyze
POST /ask
{
  "question": "Based on the retrieved financial data, which stocks are undervalued?",
  "use_rag": true
}
```

## Troubleshooting

### Data Not Being Stored
- Check GEMINI_API_KEY is set (needed for embeddings)
- Ensure RAG manager initialized: `GET /health`
- Verify Alpha Vantage key: `GET /health`

### Slow Retrieval
- RAG caches embeddings, first query is slower
- Check ChromaDB path has write permissions
- Clear and reinitialize if corrupted: `DELETE /rag/clear`

### Poor Relevance
- Search results not matching expected data?
- Try more specific queries
- Add more context to questions

## Performance Metrics

- **Storage**: ~1-2 seconds per stock (API call + embedding + storage)
- **Retrieval**: ~100ms per search (cached after first retrieval)
- **AI Generation**: 2-5 seconds (depends on context size)

Total time for question with RAG: ~3-7 seconds

## See Also

- [RAG_GUIDE.md](RAG_GUIDE.md) - General RAG documentation
- [Alpha Vantage API](https://www.alphavantage.co/documentation/) - Stock data API
