// Everything goes through the backend, which checks the login token and talks to the AI service
// on the browser's behalf (the AI service itself requires a secret key and is never called directly).
import { BACKEND_URL } from './config';

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || data.detail || `Request failed with ${response.status}`);
  }
  return data;
}

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

export async function searchStocks(query, token) {
  const response = await fetch(`${BACKEND_URL}/search/stocksname?stockName=${encodeURIComponent(query)}`, {
    headers: authHeaders(token),
  });
  return parseResponse(response);
}

export async function fetchStockHistory(symbol, range, token) {
  const response = await fetch(`${BACKEND_URL}/api/stock-history?symbol=${encodeURIComponent(symbol)}&range=${range}`, {
    headers: authHeaders(token),
  });
  return parseResponse(response);
}

export async function fetchMarketOverview(token) {
  const response = await fetch(`${BACKEND_URL}/api/market-overview`, { headers: authHeaders(token) });
  return parseResponse(response);
}

export async function fetchStockNews(symbol, token) {
  const response = await fetch(`${BACKEND_URL}/api/stock-news?symbol=${encodeURIComponent(symbol)}`, {
    headers: authHeaders(token),
  });
  return parseResponse(response);
}

export async function fetchStockInfo(symbol, token) {
  const response = await fetch(`${BACKEND_URL}/api/stock-info?symbol=${encodeURIComponent(symbol)}`, {
    headers: authHeaders(token),
  });
  return parseResponse(response);
}

// Question about the stock open on the dashboard; each stock keeps its own conversation
export async function askAboutStock(symbol, question, token) {
  return askFinancialQuestion(question, symbol, token, `stock-${symbol}`);
}

// Financial question from the AI Analysis page (chat name is optional)
export async function askFinancialQuestion(question, symbol, token, session = '') {
  const response = await fetch(`${BACKEND_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ question, symbol, session }),
  });
  return parseResponse(response);
}
