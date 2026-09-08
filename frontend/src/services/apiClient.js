const AI_SERVICE_URL = 'http://localhost:8001';
const BACKEND_URL = 'http://localhost:8080';

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with ${response.status}`);
  }
  return data;
}

export async function fetchStockInfo(symbol) {
  const response = await fetch(`${AI_SERVICE_URL}/stock-info?symbol=${encodeURIComponent(symbol)}`);
  return parseResponse(response);
}

export async function askAboutStock(symbol, question) {
  const response = await fetch(`${AI_SERVICE_URL}/ask-stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, question }),
  });
  return parseResponse(response);
}

export async function askAiQuestion(question) {
  const response = await fetch(`${AI_SERVICE_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  return parseResponse(response);
}

export async function askFinancialQuestion(question, token) {
  const response = await fetch(`${BACKEND_URL}/api/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question }),
  });
  return parseResponse(response);
}
