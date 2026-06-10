import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE = process.env.BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(BASE + path, { headers });
  return res.json();
}

(async () => {
  try {
    const email = process.env.E2E_TEST_EMAIL || `e2e+${Date.now()}@example.com`;
    const password = process.env.E2E_TEST_PASSWORD || 'Testpass123!';

    console.log('Registering', email);
    const reg = await post('/api/auth/register', { email, password, name: 'E2E Tester' });
    console.log('Register response:', reg);

    console.log('Logging in');
    const loginRes = await post('/api/auth/login', { email, password });
    console.log('Login response:', loginRes);

    const token = loginRes?.accessToken;
    if (!token) {
      console.error('No token returned; check server logs and enable JWT_SECRET');
      process.exit(2);
    }

    console.log('Calling /api/auth/me with token');
    const me = await get('/api/auth/me', token);
    console.log('/api/auth/me response:', me);

    console.log('E2E auth test finished');
  } catch (err) {
    console.error('E2E test error:', err);
    process.exit(1);
  }
})();
