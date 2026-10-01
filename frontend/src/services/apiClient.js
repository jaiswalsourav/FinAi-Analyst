const AI_SERVICE_URL = 'http://localhost:8001';
const BACKEND_URL = 'http://localhost:8080';

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with ${response.status}`);
  }
  return data;
}

export async function searchStocks(query, token) {
  const response = await fetch(`${BACKEND_URL}/search/stocksname?stockName=${encodeURIComponent(query)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return parseResponse(response);
}

export async function fetchStockNews(symbol) {
  const response = await fetch(`${AI_SERVICE_URL}/stock-news?symbol=${encodeURIComponent(symbol)}`);
  return parseResponse(response);
}

export async function fetchStockInfo(symbol) {
  const response = await fetch(`${AI_SERVICE_URL}/stock-info?symbol=${encodeURIComponent(symbol)}`);
  return parseResponse(response);
}



export async function askAboutStock(symbol, question) {
  const response = await fetch(`${AI_SERVICE_URL}/agent/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: question, symbol, session_id: `stock-${symbol}` }),
  });
  return parseResponse(response);
}

export async function askAiQuestion(question) {
  const response = await fetch(`${AI_SERVICE_URL}/agent/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: question }),
  });
  return parseResponse(response);
}



//financial question api that is called by handlerAnalysis

export async function askFinancialQuestion(question, symbol, token) {
  const response = await fetch(`${BACKEND_URL}/api/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question, symbol }),
  });
  
  return parseResponse(response);
}
