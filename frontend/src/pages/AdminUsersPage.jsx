// Admin Users Page — view all registered customers with order stats, enable/disable, and order history.

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from './AdminLayout.jsx';
import { adminApi } from '../api/admin.api.js';

// ─── Password Cell ────────────────────────────────────────────────────────────

function PasswordCell({ authType, passwordHint }) {
  const [show, setShow] = useState(false);

  if (authType === 'otp') {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-blue-900/40 text-blue-400 px-2 py-1 rounded-full font-medium">
        📱 OTP Auth
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-mono text-gray-400 truncate max-w-[120px]">
        {show ? passwordHint : '••••••••••••'}
      </span>
      <button onClick={() => setShow((v) => !v)}
        className="text-gray-600 hover:text-gray-400 flex-shrink-0 transition-colors"
        title={show ? 'Hide' : 'Show hash preview'}>
        {show
          ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
          : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        }
      </button>
      {show && (
        <span className="text-[9px] bg-green-900/40 text-green-500 px-1.5 py-0.5 rounded font-medium">bcrypt</span>
      )}
    </div>
  );
}

// ─── Order History Modal ──────────────────────────────────────────────────────

const STATUS_COLORS = {
  PENDING:    'bg-yellow-900/50 text-yellow-400',
  CONFIRMED:  'bg-blue-900/50 text-blue-400',
  PACKED:     'bg-purple-900/50 text-purple-400',
  OUT_FOR_DELIVERY: 'bg-orange-900/50 text-orange-400',
  DELIVERED:  'bg-green-900/50 text-green-400',
  CANCELLED:  'bg-red-900/50 text-red-400',
  REFUNDED:   'bg-gray-800 text-gray-400',
};

function OrderHistoryModal({ user, onClose }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async (pg) => {
    setLoading(true);
    try {
      const r = await adminApi.getUserOrders(user.id, { page: pg, limit: 10 });
      setOrders(r.orders || []);
      setTotalPages(r.totalPages || 1);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user.id]);

  useEffect(() => { load(1); }, [load]);

  const initials = user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl z-10 max-h-[88vh] flex flex-col mx-0 sm:mx-4">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">{user.name}</p>
            <p className="text-xs text-gray-500">{user.mobile} · {user.orderCount} orders · ₹{Math.round(user.totalSpent || 0)} spent</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />)
          ) : orders.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">📦</p>
              <p className="text-gray-400 text-sm">No orders yet</p>
            </div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-white">#{o.orderNumber}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] || 'bg-gray-700 text-gray-400'}`}>
                      {o.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}{o.items?.length || 0} item{(o.items?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <p className="text-sm font-bold text-brand-500 flex-shrink-0">₹{o.total?.toFixed(2)}</p>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-gray-800 flex-shrink-0">
            <button onClick={() => { const p = page - 1; setPage(p); load(p); }} disabled={page === 1}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-800 transition-colors">
              ← Prev
            </button>
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => { const p = page + 1; setPage(p); load(p); }} disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-800 transition-colors">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── User Card (mobile) ───────────────────────────────────────────────────────

function UserCard({ user, onToggle, onViewOrders }) {
  const initials = user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className={`bg-gray-900 border rounded-2xl p-4 space-y-3 transition-colors ${user.isActive ? 'border-gray-800' : 'border-gray-800/40 opacity-70'}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-700 to-brand-900 flex items-center
                        justify-center text-sm font-bold text-white flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white truncate">{user.name}</p>
            {user.isVerified && (
              <span className="text-[10px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                ✓ Verified
              </span>
            )}
            {!user.isActive && (
              <span className="text-[10px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                Disabled
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400">{user.mobile}</p>
          {user.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800 rounded-xl p-2 text-center">
          <p className="text-base font-bold text-white">{user.orderCount}</p>
          <p className="text-[10px] text-gray-500">Orders</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-2 text-center">
          <p className="text-base font-bold text-brand-500">
            {user.totalSpent >= 1000 ? `₹${(user.totalSpent / 1000).toFixed(1)}K` : `₹${Math.round(user.totalSpent)}`}
          </p>
          <p className="text-[10px] text-gray-500">Spent</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-2 text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">Joined</p>
          <p className="text-[11px] font-medium text-gray-300">
            {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Password:</span>
        <PasswordCell authType={user.authType} passwordHint={user.passwordHint} />
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-gray-800">
        <button onClick={() => onViewOrders(user)}
          className="text-xs text-brand-500 font-semibold hover:text-brand-600 transition-colors">
          View Orders →
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{user.isActive ? 'Active' : 'Disabled'}</span>
          <button onClick={() => onToggle(user)}
            className={`w-10 h-5 rounded-full transition-colors ${user.isActive ? 'bg-brand-600' : 'bg-gray-700'}`}>
            <div className={`w-4 h-4 mt-0.5 mx-0.5 bg-white rounded-full shadow transition-transform ${user.isActive ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop Table Row ────────────────────────────────────────────────────────

function UserRow({ user, index, onToggle, onViewOrders }) {
  const initials = user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <tr className={`border-b border-gray-800 hover:bg-gray-800/30 transition-colors ${!user.isActive ? 'opacity-60' : ''}`}>
      <td className="px-4 py-3 text-sm text-gray-500">{index}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-700 to-brand-900 flex items-center
                          justify-center text-xs font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-white">{user.name}</p>
              {user.isVerified && <span className="text-[9px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded-full">✓</span>}
              {!user.isActive && <span className="text-[9px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded-full">Disabled</span>}
            </div>
            {user.email && <p className="text-xs text-gray-500 truncate max-w-[160px]">{user.email}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-300 font-mono">{user.mobile}</td>
      <td className="px-4 py-3">
        <PasswordCell authType={user.authType} passwordHint={user.passwordHint} />
      </td>
      <td className="px-4 py-3 text-sm text-white text-center font-medium">{user.orderCount}</td>
      <td className="px-4 py-3 text-sm text-brand-500 font-bold">
        {user.totalSpent >= 1000 ? `₹${(user.totalSpent / 1000).toFixed(1)}K` : `₹${Math.round(user.totalSpent)}`}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => onViewOrders(user)}
            className="text-xs text-brand-500 hover:text-brand-600 font-semibold transition-colors whitespace-nowrap">
            Orders
          </button>
          <button onClick={() => onToggle(user)}
            className={`w-9 h-4 rounded-full transition-colors ${user.isActive ? 'bg-brand-600' : 'bg-gray-700'}`}>
            <div className={`w-3 h-3 mt-0.5 mx-0.5 bg-white rounded-full shadow transition-transform ${user.isActive ? 'translate-x-4' : ''}`} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [error, setError]       = useState('');
  const [toast, setToast]       = useState('');
  const [historyUser, setHistoryUser] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async (pg, q) => {
    setLoading(true); setError('');
    try {
      const params = { page: pg, limit: 20 };
      if (q) params.search = q;
      const r = await adminApi.getUsers(params);
      setUsers(r.users || []);
      setTotal(r.total || 0);
      setTotalPages(r.totalPages || 1);
    } catch (e) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1, ''); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, search);
  };

  const handleClear = () => {
    setSearch('');
    setPage(1);
    load(1, '');
  };

  const handleToggle = async (user) => {
    try {
      await adminApi.toggleUser(user.id);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
      showToast(`${!user.isActive ? '✅' : '🚫'} ${user.name} ${!user.isActive ? 'enabled' : 'disabled'}`);
    } catch (e) { showToast(`❌ ${e.message}`); }
  };

  const offset = (page - 1) * 20;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Users</h1>
            <p className="text-gray-400 text-sm">{total} registered customer{total !== 1 ? 's' : ''}</p>
          </div>
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
            <div className="flex-1 md:w-64 flex items-center bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 gap-2">
              <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, mobile or email..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none" />
              {search && (
                <button type="button" onClick={handleClear} className="text-gray-500 hover:text-gray-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-colors">
              Search
            </button>
          </form>
        </div>

        {/* Security note */}
        <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-xl px-4 py-2.5 flex items-start gap-2">
          <span className="text-yellow-500 text-sm flex-shrink-0">🔒</span>
          <p className="text-xs text-yellow-400/80">
            Passwords are stored as <strong className="text-yellow-400">bcrypt hashes</strong> (one-way encryption).
            The hash preview shown is only the algorithm prefix — the actual password cannot be recovered from it.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-xl p-3 text-red-400 text-sm">{error}</div>
        )}

        {/* Desktop table */}
        {!loading && users.length > 0 && (
          <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Mobile</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Password</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wide">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Total Spent</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <UserRow key={user.id} user={user} index={offset + i + 1}
                    onToggle={handleToggle} onViewOrders={setHistoryUser} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile cards */}
        {!loading && users.length > 0 && (
          <div className="md:hidden grid gap-3">
            {users.map((user) => (
              <UserCard key={user.id} user={user} onToggle={handleToggle} onViewOrders={setHistoryUser} />
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && users.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-gray-400 font-medium">
              {search ? `No users found for "${search}"` : 'No registered users yet'}
            </p>
            {search && (
              <button onClick={handleClear} className="mt-2 text-brand-500 text-sm font-semibold">
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={() => { const p = page - 1; setPage(p); load(p, search); }}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-700 text-gray-300
                         disabled:opacity-40 hover:bg-gray-800 transition-colors">
              ← Prev
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => { const p = page + 1; setPage(p); load(p, search); }}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-700 text-gray-300
                         disabled:opacity-40 hover:bg-gray-800 transition-colors">
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Order History Modal */}
      {historyUser && (
        <OrderHistoryModal user={historyUser} onClose={() => setHistoryUser(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 bg-gray-800 border border-gray-700 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </AdminLayout>
  );
}
