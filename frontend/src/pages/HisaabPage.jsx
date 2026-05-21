// Hisaab — Hindi/Gujarati word for "account" / "ledger"
// Customer-facing savings & spending dashboard.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../api/orders.api.js';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

const STATUS_COLOR = {
  PENDING:   'text-yellow-600 bg-yellow-50',
  CONFIRMED: 'text-blue-600 bg-blue-50',
  PACKED:    'text-purple-600 bg-purple-50',
  OUT_FOR_DELIVERY: 'text-orange-600 bg-orange-50',
  DELIVERED: 'text-green-600 bg-green-50',
  CANCELLED: 'text-red-600 bg-red-50',
};

function StatCard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 flex flex-col gap-1">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

function SpendingBar({ months }) {
  if (!months.length) return null;
  const maxVal = Math.max(...months.map((m) => m.total), 1);
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 mt-3">
      <p className="text-sm font-bold text-gray-800 mb-4">Monthly Spending</p>
      <div className="flex items-end gap-2 h-24">
        {months.map((m) => {
          const height = Math.max(4, Math.round((m.total / maxVal) * 88));
          return (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
              <p className="text-[9px] text-gray-500 font-medium">₹{m.total > 999 ? `${(m.total / 1000).toFixed(1)}k` : m.total}</p>
              <div className="w-full bg-brand-600 rounded-t-lg transition-all" style={{ height: `${height}px` }} />
              <p className="text-[9px] text-gray-400">{m.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderRow({ order }) {
  const navigate = useNavigate();
  const date = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const saved = order.discount || 0;
  const statusStyle = STATUS_COLOR[order.status] || 'text-gray-600 bg-gray-50';

  return (
    <button onClick={() => navigate('/orders')}
      className="flex items-center gap-3 p-3 bg-white rounded-2xl ring-1 ring-gray-100 text-left w-full hover:ring-brand-200 transition-colors">
      <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🛍</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">#{order.orderNumber}</p>
        <p className="text-xs text-gray-400">{date} · {order.items?.length || 0} items</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-900">₹{order.total.toFixed(0)}</p>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusStyle}`}>
          {order.status}
        </span>
        {saved > 0 && <p className="text-[10px] text-green-600">Saved ₹{saved.toFixed(0)}</p>}
      </div>
    </button>
  );
}

export default function HisaabPage() {
  const navigate = useNavigate();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    ordersApi.getMyOrders({ page: 1, limit: 50 })
      .then((r) => setOrders(r.orders || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // Aggregate stats
  const totalOrders   = orders.length;
  const totalSpent    = orders.reduce((s, o) => s + o.total, 0);
  const totalSaved    = orders.reduce((s, o) => s + (o.discount || 0), 0);
  const avgOrder      = totalOrders ? totalSpent / totalOrders : 0;
  const savingsPct    = totalSpent > 0 ? Math.round((totalSaved / (totalSpent + totalSaved)) * 100) : 0;

  // Monthly spending (last 6 months)
  const monthlyMap = {};
  orders.forEach((o) => {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short' });
    monthlyMap[key] = { label, total: ((monthlyMap[key]?.total) || 0) + o.total };
  });
  const months = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([, v]) => ({ label: v.label, total: Math.round(v.total) }));

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header showSearch={false} />

      <div className="max-w-[1400px] mx-auto w-full px-3 pt-4">
        {/* Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-black text-gray-900">
            Mera Hisaab <span className="text-base font-medium text-gray-400">/ My Account</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Your shopping summary at a glance</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-4xl mb-2">😕</p>
            <p className="text-gray-600 font-medium">Could not load your data</p>
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Total Orders"
                value={totalOrders}
                sub="All time"
              />
              <StatCard
                label="Total Spent"
                value={`₹${totalSpent > 999 ? `${(totalSpent / 1000).toFixed(1)}k` : totalSpent.toFixed(0)}`}
                sub="All time"
              />
              <StatCard
                label="Total Saved"
                value={`₹${totalSaved.toFixed(0)}`}
                sub={savingsPct > 0 ? `${savingsPct}% savings rate` : 'on discounts'}
                color="text-green-600"
              />
              <StatCard
                label="Avg Order"
                value={`₹${avgOrder.toFixed(0)}`}
                sub="Per order"
              />
            </div>

            {/* Savings highlight */}
            {totalSaved > 0 && (
              <div className="mt-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-4 text-white">
                <p className="text-sm font-medium opacity-90">You have saved</p>
                <p className="text-3xl font-black">₹{totalSaved.toFixed(0)}</p>
                <p className="text-sm opacity-80">across {totalOrders} order{totalOrders !== 1 ? 's' : ''} 🎉</p>
              </div>
            )}

            {/* Monthly chart */}
            {months.length > 1 && <SpendingBar months={months} />}

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <button onClick={() => navigate('/orders')}
                className="bg-white rounded-2xl p-4 ring-1 ring-gray-100 shadow-sm text-left hover:ring-brand-200 transition-colors">
                <span className="text-2xl">📋</span>
                <p className="text-sm font-bold text-gray-800 mt-2">Order History</p>
                <p className="text-xs text-gray-400">{totalOrders} order{totalOrders !== 1 ? 's' : ''}</p>
              </button>
              <button onClick={() => navigate('/profile')}
                className="bg-white rounded-2xl p-4 ring-1 ring-gray-100 shadow-sm text-left hover:ring-brand-200 transition-colors">
                <span className="text-2xl">👤</span>
                <p className="text-sm font-bold text-gray-800 mt-2">My Profile</p>
                <p className="text-xs text-gray-400">Addresses & details</p>
              </button>
              <button onClick={() => navigate('/products?sort=discount')}
                className="bg-white rounded-2xl p-4 ring-1 ring-gray-100 shadow-sm text-left hover:ring-brand-200 transition-colors">
                <span className="text-2xl">🏷️</span>
                <p className="text-sm font-bold text-gray-800 mt-2">Best Deals</p>
                <p className="text-xs text-gray-400">Max discount products</p>
              </button>
              <button onClick={() => navigate('/products')}
                className="bg-white rounded-2xl p-4 ring-1 ring-gray-100 shadow-sm text-left hover:ring-brand-200 transition-colors">
                <span className="text-2xl">🛒</span>
                <p className="text-sm font-bold text-gray-800 mt-2">Shop Now</p>
                <p className="text-xs text-gray-400">Browse all products</p>
              </button>
            </div>

            {/* Recent orders */}
            {recentOrders.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-800">Recent Orders</h2>
                  <button onClick={() => navigate('/orders')} className="text-xs text-brand-600 font-semibold">See all →</button>
                </div>
                <div className="space-y-2">
                  {recentOrders.map((o) => <OrderRow key={o.id} order={o} />)}
                </div>
              </div>
            )}

            {totalOrders === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl ring-1 ring-gray-100 mt-4">
                <p className="text-5xl mb-3">🛒</p>
                <p className="text-gray-600 font-medium">No orders yet</p>
                <p className="text-gray-400 text-sm mt-1">Start shopping to see your Hisaab here</p>
                <button onClick={() => navigate('/products')}
                  className="mt-4 px-5 py-2.5 bg-brand-600 text-white font-bold rounded-2xl text-sm active:scale-95 transition-all">
                  Shop Now
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
