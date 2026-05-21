// DashboardPage — "Hisaab" dashboard with vernacular UX.
// Uses localized terms: "Aapni Bachat", "Aaj ni Kharch", "Varkhaano"
// Optimized for mobile: card-based, no horizontal scroll tables.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { ordersApi } from '../api/orders.api.js';
import { formatINR, formatPrice } from '../utils/currency.js';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    ordersApi.getDashboard()
      .then((res) => setMetrics(res.metrics))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>
  );

  const { today, allTime, topProducts, topCustomers, ordersByStatus, slotUtilization, revenueByDay } = metrics;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-brand-600 text-white px-4 pt-safe-top pb-6">
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-2xl font-bold">Hisaab 📊</h1>
            <p className="text-brand-100 text-sm mt-1">Store Performance Dashboard</p>
          </div>
          <button
            onClick={() => navigate('/admin/orders')}
            className="flex items-center gap-1.5 bg-white text-brand-700 text-sm font-semibold px-3 py-2 rounded-xl shadow"
          >
            📋 Manage Orders
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4">

        {/* ── Aaj ni Kharch (Today's stats) ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Aaj ni Kharch · Today
          </p>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon="💰"
              label="Revenue"
              value={formatINR(today.revenue)}
              sub="today"
              color="text-brand-600"
            />
            <StatCard
              icon="🛒"
              label="Orders"
              value={today.orders}
              sub="today"
              color="text-blue-600"
            />
          </div>
        </div>

        {/* ── All-time stats ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Kul Varkhaano · All Time
          </p>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon="📈" label="Total Revenue" value={formatINR(allTime.revenue)} color="text-purple-600" />
            <StatCard icon="📦" label="Total Orders" value={allTime.orders} color="text-orange-600" />
          </div>
        </div>

        {/* ── Revenue chart (7 days) ─────────────────────────────────────────── */}
        {revenueByDay?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm font-bold text-gray-800 mb-4">Revenue — Last 7 Days</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={revenueByDay} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v) => [formatINR(v), 'Revenue']}
                  labelFormatter={(l) => `Date: ${l}`}
                />
                <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Orders by status (queue) ───────────────────────────────────────── */}
        {ordersByStatus && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-800">Order Queue</p>
              <button
                onClick={() => navigate('/admin/orders')}
                className="text-xs text-brand-600 font-semibold hover:underline"
              >
                View All →
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ordersByStatus).map(([status, count]) => (
                <div key={status} className="text-center p-2 bg-gray-50 rounded-xl">
                  <div className="text-xl font-bold text-gray-900">{count}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
                    {status.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Delivery slot utilization ──────────────────────────────────────── */}
        {slotUtilization?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm font-bold text-gray-800 mb-3">Today's Delivery Slots</p>
            <div className="space-y-2">
              {slotUtilization.map((slot) => {
                const pct = Math.round((slot.booked / slot.capacity) * 100);
                return (
                  <div key={slot.startTime} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20 flex-shrink-0">
                      {slot.startTime}–{slot.endTime}
                    </span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-400' : pct >= 60 ? 'bg-amber-400' : 'bg-brand-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">
                      {slot.booked}/{slot.capacity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Top Products ───────────────────────────────────────────────────── */}
        {topProducts?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm font-bold text-gray-800 mb-3">Top Selling Products (30d)</p>
            <div className="space-y-2.5">
              {topProducts.slice(0, 5).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-gray-400 font-mono">{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      : <span className="text-sm">🛍️</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 line-clamp-1">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.totalQty} {p.unit}s sold</p>
                  </div>
                  <span className="text-sm font-bold text-brand-600">
                    {formatPrice(p.totalRevenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Top Customers (LTV) ───────────────────────────────────────────── */}
        {topCustomers?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-sm font-bold text-gray-800 mb-3">Sabse Wafadar Grahak 🌟</p>
            <div className="space-y-2.5">
              {topCustomers.slice(0, 5).map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center
                                  text-brand-600 text-sm font-bold flex-shrink-0">
                    {c.name?.charAt(0)?.toUpperCase() || '#'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{c.name || 'Guest'}</p>
                    <p className="text-xs text-gray-400">{c.orderCount} orders · {c.mobile?.slice(-4).padStart(10, '•')}</p>
                  </div>
                  <span className="text-sm font-bold text-purple-600">
                    {formatINR(c.lifetimeValue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
      ))}
    </div>
  );
}
