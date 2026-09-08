const BACKEND_URL = 'http://localhost:8080';

async function request(path, options = {}) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export function login(email, password) {
  return request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
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
  return request('/api/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token, password) {
  return request('/api/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}
