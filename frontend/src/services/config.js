// Backend address, set with VITE_BACKEND_URL in .env (docker-compose passes it to the frontend).
// The default matches the docker-compose port mapping on a local machine.
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080').replace(/\/+$/, '');
