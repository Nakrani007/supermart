// Separate Axios instance for admin API calls.
// Reads admin token from sm_admin_token (stored via lsSet → JSON-encoded).

import axios from 'axios';

const adminClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

adminClient.interceptors.request.use((config) => {
  try {
    const raw   = localStorage.getItem('sm_admin_token');
    const token = raw ? JSON.parse(raw) : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

adminClient.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const data  = err.response?.data;
    const error = new Error(data?.message || err.message || 'Request failed');
    error.status = err.response?.status;
    return Promise.reject(error);
  }
);

export default adminClient;
