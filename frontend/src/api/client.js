// Axios instance with auth token injection and offline-aware error handling.
// All API modules import from here — single place to change base URL or headers.

import axios from 'axios';

// In production VITE_API_URL = "https://your-render-app.onrender.com"
// In local dev  VITE_API_URL is unset → Vite proxy forwards /api → localhost:5000
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 15000, // 15s — generous for slow Tier-2 connections
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT from localStorage on every request.
// lsSet() JSON-encodes values, so we must JSON.parse to get the raw string.
client.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('sm_token');
    const token = raw ? JSON.parse(raw) : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

// Global response error handling
client.interceptors.response.use(
  (res) => res.data, // unwrap — callers get data directly, not res.data.data
  (err) => {
    if (!navigator.onLine) {
      // Network is offline — return a structured error the UI can handle gracefully
      return Promise.reject({ offline: true, message: 'No internet connection' });
    }

    if (err.response?.status === 401) {
      const hadToken = !!localStorage.getItem('sm_token');
      localStorage.removeItem('sm_token');
      localStorage.removeItem('sm_user');
      // Only redirect when the session actually expired — not for anonymous requests
      if (hadToken) {
        window.location.href = '/?auth=expired';
      }
    }

    // Propagate server error message for display in UI
    const message = err.response?.data?.message || 'Something went wrong. Please try again.';
    return Promise.reject({ ...err.response?.data, message, status: err.response?.status });
  }
);

export default client;
