# Quarterly Results Storage with RAG

This guide explains how to store and analyze quarterly earnings data using RAG integration.

## Overview

The system now supports storing and retrieving quarterly earnings data from Alpha Vantage:
- **Quarterly EPS** - Reported vs Estimated, with Surprise %
- **Annual EPS** - Year-over-year earnings trends
- **Searchable** - Query by symbol, metric, or earnings terms
- **AI Analysis** - Provide context to LLM for earnings analysis

## API Endpoints

### Store Quarterly Results

#### Fetch & Store Quarterly Earnings
```bash
POST /financial/store-quarterly-results
Content-Type: application/json

{
  "symbol": "AAPL",
  "store_in_rag": true
}
```

Fetches latest quarterly and annual earnings data, then stores in RAG.

**Response:**
```json
{
  "status": "success",
  "symbol": "AAPL",
  "message": "Quarterly results for AAPL fetched and stored",
  "data_summary": {
    "quarterly_records": 20,
    "annual_records": 10,
    "latest_quarter": {
      "fiscalDateEnding": "2026-06-30",
      "reportedEPS": "2.25",
      "estimatedEPS": "2.20",
      "surprisePercentage": "2.27"
    }
  }
}
```

### Search Quarterly Data

#### Search Quarterly Earnings
```bash
POST /financial/search-quarterly
Content-Type: application/json

{
  "symbol": "AAPL",
  "metric": "earnings",
  "k": 5
}
```

Search for specific quarterly metrics or earnings data.

**Parameters:**
- `symbol` (optional): Filter by stock symbol
- `metric` (optional): Filter by metric type (earnings, EPS, revenue, etc.)
- `k` (default: 5): Number of results to return

**Response:**
```json
{
  "query": "AAPL quarterly earnings EPS results",
  "results_count": 5,
  "results": [
    {
      "content": "Q1 2026-06-30:\n  - Reported EPS: 2.25\n  - Estimated EPS: 2.20\n  - Surprise: 2.27%",
      "metadata": {
        "symbol": "AAPL",
        "data_type": "quarterly_earnings",
        "timestamp": "2026-09-01T15:30:00",
        "source": "alpha_vantage",
        "num_quarters": 20
      },
      "relevance_score": 0.95,
      "symbol": "AAPL",
      "data_type": "quarterly_earnings",
      "timestamp": "2026-09-01T15:30:00"
    }
  ]
}
```

#### Get Quarterly Summary
```bash
GET /financial/quarterly-summary/AAPL?limit=8
```

Get a summary of stored quarterly results for a symbol.

**Response:**
```json
{
  "symbol": "AAPL",
  "status": "success",
  "documents_found": 3,
  "latest_data": [
    {
      "content": "Quarterly Earnings Report for AAPL\nGenerated: 2026-09-01T15:30:00\n\nRecent Quarterly Results (Latest 8 Quarters):\n\nQ1 2026-06-30:\n  - Reported EPS: 2.25\n  - Estimated EPS: 2.20\n  - Surprise: 2.27%\n...",
      "timestamp": "2026-09-01T15:30:00",
      "num_quarters": 20
    }
  ]
}
```

## Data Stored in RAG

### Quarterly Earnings Format
```
Quarterly Earnings Report for AAPL
Generated: 2026-09-01T15:30:00

Recent Quarterly Results (Latest 8 Quarters):

Q1 2026-06-30:
  - Reported EPS: $2.25
  - Estimated EPS: $2.20
  - Surprise: 2.27%

Q2 2025-12-31:
  - Reported EPS: $2.10
  - Estimated EPS: $2.05
  - Surprise: 2.44%

[... more quarters ...]
```

### Annual Earnings Format
```
Annual Earnings Report for AAPL
Generated: 2026-09-01T15:30:00

Year-over-Year EPS Performance:

FY 2026: $8.50
FY 2025: $8.20
FY 2024: $7.95
FY 2023: $7.50
FY 2022: $7.10
```

## Usage Workflows

### Workflow 1: Store and Analyze Earnings

```bash
# 1. Store quarterly results for multiple companies
POST /financial/store-quarterly-results
{"symbol": "AAPL", "store_in_rag": true}

POST /financial/store-quarterly-results
{"symbol": "GOOGL", "store_in_rag": true}

POST /financial/store-quarterly-results
{"symbol": "MSFT", "store_in_rag": true}

# 2. Query earnings with AI
POST /ask
{
  "question": "Which stored company had the best earnings surprise this quarter?",
  "use_rag": true
}

# AI now has access to all quarterly earnings data!
```

### Workflow 2: Search Specific Metrics

```bash
# Search for EPS surprises
POST /financial/search-quarterly
{
  "symbol": "AAPL",
  "metric": "earnings",
  "k": 10
}

# Then ask AI for analysis
POST /ask
{
  "question": "Based on the retrieved data, has AAPL been consistently beating earnings expectations?",
  "use_rag": true
}
```

### Workflow 3: Trend Analysis with RAG

```bash
# 1. Store quarterly results
POST /financial/store-quarterly-results
{"symbol": "TSLA", "store_in_rag": true}

# 2. Get summary
GET /financial/quarterly-summary/TSLA

# 3. Ask AI about trends
POST /ask-stock
{
  "symbol": "TSLA",
  "question": "Show me the EPS trend and whether recent quarters have beaten or missed expectations",
  "use_rag": true
}
```

## Combined Analysis Example

Store both price data and earnings data, then analyze:

```bash
# 1. Store financial data (price, volume)
POST /financial/store-stock-data?symbol=AAPL

# 2. Store quarterly data (earnings, EPS)
POST /financial/store-quarterly-results
{"symbol": "AAPL", "store_in_rag": true}

# 3. Ask comprehensive question
POST /ask
{
  "question": "For AAPL: How did stock price move after the last earnings report? Was there a surprise?",
  "use_rag": true
}

# AI can now correlate:
# - Earnings data (from quarterly results)
# - Price movements (from historical data)
# - To provide holistic analysis
```

## Data Types in RAG

When you store quarterly results, two types of documents are created:

1. **quarterly_earnings**
   - Recent 8 quarters of EPS data
   - Reported vs Estimated EPS
   - Surprise percentages
   - Searchable by date range

2. **annual_earnings**
   - Last 5 years of annual EPS
   - Year-over-year trends
   - Long-term performance view

## Frontend Integration

### React: Store Quarterly Results

```javascript
async function storeQuarterlyResults(symbol) {
  const response = await fetch('http://localhost:8001/financial/store-quarterly-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol: symbol,
      store_in_rag: true
    })
  });
  
  const data = await response.json();
  console.log(`Stored quarterly results for ${symbol}:`, data);
  
  // Show latest quarter summary
  if (data.data_summary.latest_quarter) {
    console.log('Latest EPS:', data.data_summary.latest_quarter.reportedEPS);
    console.log('Surprise:', data.data_summary.latest_quarter.surprisePercentage);
  }
}
```

### React: Search Quarterly Data

```javascript
async function searchEarnings(symbol, metric) {
  const response = await fetch('http://localhost:8001/financial/search-quarterly', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol: symbol,
      metric: metric,
      k: 5
    })
  });
  
  const data = await response.json();
  
  return data.results.map(result => ({
    content: result.content,
    symbol: result.symbol,
    timestamp: result.timestamp,
    score: result.relevance_score
  }));
}
```

### React: Display Quarterly Summary

```javascript
async function displayQuarterlySummary(symbol) {
  const response = await fetch(`http://localhost:8001/financial/quarterly-summary/${symbol}`);
  const data = await response.json();
  
  if (data.status === 'success') {
    console.log(`Found ${data.documents_found} documents for ${symbol}`);
    console.log('Latest earnings:', data.latest_data[0].content);
  } else {
    console.log('No quarterly data stored. Please store it first.');
  }
}
```

## Advanced: Multi-Symbol Earnings Dashboard

```bash
#!/bin/bash

# Store earnings for multiple symbols
symbols=("AAPL" "GOOGL" "MSFT" "AMZN" "TSLA" "FB" "NVDA")

for symbol in "${symbols[@]}"; do
  echo "Storing quarterly results for $symbol..."
  curl -X POST http://localhost:8001/financial/store-quarterly-results \
    -H "Content-Type: application/json" \
    -d "{\"symbol\": \"$symbol\", \"store_in_rag\": true}"
  
  sleep 1  # Rate limit
done

# Query with AI
curl -X POST http://localhost:8001/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Which of the stored companies have the most consistent earnings growth? Show year-over-year trends.",
    "use_rag": true
  }'
```

## Best Practices

### 1. Regular Updates
Store quarterly results after earnings announcements:
```bash
# Monthly check for latest earnings
POST /financial/store-quarterly-results
{"symbol": "AAPL", "store_in_rag": true}
```

### 2. Combine Data Sources
- **Price data**: `/financial/store-stock-data`
- **Quarterly earnings**: `/financial/store-quarterly-results`
- **Both**: Together provide complete picture

### 3. Clean Searches
Use specific terms for better results:
```bash
# Good
POST /financial/search-quarterly
{"symbol": "AAPL", "metric": "earnings"}

# Less specific
POST /financial/search-quarterly
{"query": "company performance"}
```

### 4. AI Analysis
Always use RAG for earnings questions:
```bash
POST /ask
{
  "question": "Analyze earnings trends",
  "use_rag": true  # Critical for earnings data
}
```

## Troubleshooting

### "No quarterly results found"
- Make sure you've called `POST /financial/store-quarterly-results` first
- Check Alpha Vantage API key is valid
- Verify symbol is correct (use uppercase)

### Slow retrieval
- ChromaDB caches embeddings after first search
- First query ~2 seconds, subsequent queries ~100ms

### Missing quarters
- Alpha Vantage provides last ~20 quarters of data
- Annual data shows ~10 years of history

## Performance

- **Store quarterly results**: 2-3 seconds (API call + embedding + storage)
- **Search quarterly data**: 100-200ms (after caching)
- **AI analysis with RAG**: 3-7 seconds total

## Data Retention

Quarterly data is stored persistently in ChromaDB. To clear:
```bash
DELETE /rag/clear  # Clears ALL data including quarterly results
```

To selective delete, use timestamps in metadata to filter queries.

## See Also

- [FINANCIAL_RAG_GUIDE.md](FINANCIAL_RAG_GUIDE.md) - Stock price data storage
- [RAG_GUIDE.md](RAG_GUIDE.md) - General RAG documentation
- [Alpha Vantage Earnings API](https://www.alphavantage.co/documentation/#earnings)
