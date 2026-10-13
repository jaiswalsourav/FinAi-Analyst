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
//start
async function encryptedPost(path, body) {
  // Fetch the server's RSA public key (not secret, so no auth needed).
  const keyResult = await request('/api/public-key');
  if (!keyResult.response.ok) return keyResult;

  // The timestamp lets the server reject replayed requests.
  //below encryptRequest function is called which will encrypt the request body and return the payload and aesKey
  const { payload, aesKey } = await encryptRequest(
    { ...body, timestamp: Date.now() },keyResult.data.publicKey,);


  //here reset password api has been called 
  const result = await request(path, { method: 'POST', body: JSON.stringify(payload) });
  if (!result.response.ok) return result; // errors are plain JSON, nothing to decrypt

  return { response: result.response, data: await decryptResponse(result.data, aesKey) };
}//end

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

// Reset the password using the token from the requestPasswordReset() call. The server will verify the token and update the user's password.
export function resetPassword(token, password) {
  return encryptedPost('/api/reset-password', { token, password });
}
