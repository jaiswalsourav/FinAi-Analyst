import { BACKEND_URL } from './config';
import { decryptResponse, encryptRequest } from './hybridCrypto';

async function request(path, options = {}) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
       headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

// POSTs `body` using hybrid encryption (see hybridCrypto.js). Returns the same
// { response, data } shape as request(), where `data` is the already-decrypted reply on success.
async function encryptedPost(path, body) {
  // Fetch the server's RSA public key (not secret, so no auth needed).
  const keyResult = await request('/api/public-key');
  if (!keyResult.response.ok) return keyResult;

  // The timestamp lets the server reject replayed requests.
  const { payload, aesKey } = await encryptRequest(
    { ...body, timestamp: Date.now() },
    keyResult.data.publicKey,
  );

  const result = await request(path, { method: 'POST', body: JSON.stringify(payload) });
  if (!result.response.ok) return result; // errors are plain JSON, nothing to decrypt

  return { response: result.response, data: await decryptResponse(result.data, aesKey) };
}

export function login(email, password) {
  return encryptedPost('/api/login', { email, password });
}

export function fetchCurrentUser(token) {
  return request('/api/me', { headers: { Authorization: `Bearer ${token}` } });
}

export function fetchUsers(token) {
  return request('/api/users', { headers: { Authorization: `Bearer ${token}` } });
}

export function registerUser(name, email, password) {
  return request('/api/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export function requestPasswordReset(email) {
  return encryptedPost('/api/forgot-password', { email });
}

export function resetPassword(token, password) {
  return encryptedPost('/api/reset-password', { token, password });
}
