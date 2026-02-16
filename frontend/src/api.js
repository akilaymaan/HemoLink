const API = '/api';

function getToken() {
  return localStorage.getItem('hemolink_token');
}

export async function authRegister(email, password, name, role = 'seeker') {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Register failed');
  return data;
}

export async function authLogin(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function authMe() {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function donorCreateOrUpdate(body) {
  const res = await fetch(`${API}/donors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function donorMe() {
  const res = await fetch(`${API}/donors/me`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  const data = await res.json();
  return data.donor ?? null;
}

export async function donorsList(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/donors?${q}`);
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export async function requestCreate(body) {
  const res = await fetch(`${API}/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed');
  return data;
}

export async function requestMatch(params) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/requests/match?${q}`);
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export async function myRequests() {
  const res = await fetch(`${API}/requests`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}
