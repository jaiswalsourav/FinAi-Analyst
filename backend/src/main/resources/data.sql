INSERT INTO users (email, password, role) VALUES (
  'admin@company.com',
  '$2a$10$M6pWBqzOe5h4bZfAtraVYuu1Z6HQRQ7UAnfiVv0muNiVtO2Cb1ve6',
  'ADMIN'
)
ON CONFLICT (email) DO NOTHING;
