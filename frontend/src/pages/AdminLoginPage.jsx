// Admin Login Page — secure entry point for the admin panel.
// Default credentials: store / store@123

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin.api.js';
import { useAdminAuthStore } from '../store/adminAuthStore.js';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const login    = useAdminAuthStore((s) => s.login);

  const [form, setForm]       = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.login({ username: form.username.trim(), password: form.password });
      login(res.token, res.admin);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">🛒</span>
          </div>
          <h1 className="text-2xl font-bold text-white">SuperMart Admin</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to the store dashboard</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                autoComplete="username"
                placeholder="store"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                           rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500
                           focus:ring-1 focus:ring-brand-500 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                             rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-brand-500
                             focus:ring-1 focus:ring-brand-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPass
                    ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
                    : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-950/50 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white
                         font-bold py-3 rounded-xl transition-colors active:scale-[.98] text-sm"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</span>
                : 'Sign In'
              }
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-800 text-center">
            <p className="text-xs text-gray-600">Restricted access — authorised personnel only</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 mt-4">
          SuperMart v1.0 · Admin Panel
        </p>
      </div>
    </div>
  );
}
