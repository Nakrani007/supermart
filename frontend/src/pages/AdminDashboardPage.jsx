// Admin Dashboard — daily / monthly / yearly revenue analytics + top products.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Tip from '../components/common/Tooltip.jsx';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import AdminLayout        from './AdminLayout.jsx';
import { adminApi }       from '../api/admin.api.js';
import { useAdminStoreStore } from '../store/adminStoreStore.js';

const STATUS_META = {
  PENDING:          { label: 'Pending',         color: 'bg-yellow-400' },
  CONFIRMED:        { label: 'Confirmed',        color: 'bg-blue-400'   },
  PACKED:           { label: 'Packed',           color: 'bg-purple-400' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-orange-400' },
  DELIVERED:        { label: 'Delivered',        color: 'bg-green-400'  },
  CANCELLED:        { label: 'Cancelled',        color: 'bg-red-400'    },
  REFUNDED:         { label: 'Refunded',         color: 'bg-gray-400'   },
};

function fmt(n) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

function fmtFull(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${color}`}>{sub}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

// ─── Revenue Chart ────────────────────────────────────────────────────────────

const CHART_TABS = [
  { key: 'daily',   label: 'Daily (30d)'  },
  { key: 'monthly', label: 'Monthly (12m)' },
  { key: 'yearly',  label: 'Yearly (5y)'  },
];

function RevenueChart({ revenueByDay, revenueByMonth, revenueByYear }) {
  const [tab, setTab] = useState('daily');

  const datasets = {
    daily:   { data: revenueByDay   || [], xKey: 'label', label: 'Daily'  },
    monthly: { data: revenueByMonth || [], xKey: 'label', label: 'Monthly' },
    yearly:  { data: revenueByYear  || [], xKey: 'label', label: 'Yearly' },
  };

  const { data, xKey } = datasets[tab];
  const total = data.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <p className="text-sm font-bold text-white">Revenue Overview</p>
          <p className="text-xs text-gray-400">Total: {fmtFull(total)}</p>
        </div>
        <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
          {CHART_TABS.map(({ key, label }) => {
            const tabTip = { daily: 'Last 30 days', monthly: 'Last 12 months', yearly: 'Last 5 years' };
            return (
              <Tip key={key} text={tabTip[key]} position="top">
                <button onClick={() => setTab(key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors
                    ${tab === key ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  {label}
                </button>
              </Tip>
            );
          })}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={fmt} />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '12px' }}
            labelStyle={{ color: '#9ca3af', fontSize: 11 }}
            formatter={(v) => [fmtFull(v), 'Revenue']}
          />
          <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} fill="url(#grad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Top Products ─────────────────────────────────────────────────────────────

function TopProducts({ topProducts }) {
  if (!topProducts?.length) return null;
  const max = topProducts[0]?.totalRevenue || 1;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <p className="text-sm font-bold text-white mb-4">Top Selling Products (30d)</p>
      <div className="space-y-3">
        {topProducts.slice(0, 8).map((p, i) => (
          <div key={p.id || i} className="flex items-center gap-3">
            <span className="w-5 text-xs text-gray-500 font-mono text-right">{i + 1}</span>
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              {p.imageUrl
                ? <img src={p.imageUrl} alt="" className="w-full h-full object-contain p-0.5" />
                : <span className="text-sm">🛍️</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{p.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${((p.totalRevenue || 0) / max) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{p.totalQty} {p.unit}s</span>
              </div>
            </div>
            <span className="text-sm font-bold text-brand-500 flex-shrink-0">{fmt(p.totalRevenue || 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Order Status Distribution ────────────────────────────────────────────────

function OrderStatusGrid({ ordersByStatus, total, navigate }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-white">Order Status</p>
        <button onClick={() => navigate('/admin/orders')}
          className="text-xs text-brand-500 hover:underline">View All →</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(ordersByStatus || {}).map(([status, count]) => {
          const m = STATUS_META[status] || { label: status, color: 'bg-gray-400' };
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <Tip key={status} text={`${count} orders (${pct}% of total) — click to view`} position="top">
              <button
                onClick={() => navigate(`/admin/orders?status=${status}`)}
                className="w-full bg-gray-800 hover:bg-gray-750 rounded-xl p-2.5 text-center transition-colors active:scale-[.97]">
                <div className={`w-2 h-2 rounded-full ${m.color} mx-auto mb-1`} />
                <p className="text-lg font-bold text-white">{count}</p>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide leading-tight">{m.label}</p>
                <p className="text-[9px] text-gray-600 mt-0.5">{pct}%</p>
              </button>
            </Tip>
          );
        })}
      </div>
    </div>
  );
}

// ─── Recent Orders ────────────────────────────────────────────────────────────

function RecentOrders({ orders, navigate }) {
  if (!orders?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-white">Recent Orders</p>
        <button onClick={() => navigate('/admin/orders')}
          className="text-xs text-brand-500 hover:underline">View All →</button>
      </div>
      <div className="space-y-2">
        {orders.map((o) => {
          const m = STATUS_META[o.status] || {};
          return (
            <button key={o.id}
              onClick={() => navigate('/admin/orders')}
              className="w-full flex items-center gap-3 py-2 border-b border-gray-800 last:border-0 hover:opacity-80 text-left">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.color || 'bg-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">#{o.orderNumber}</p>
                <p className="text-xs text-gray-400 truncate">{o.customer?.name || 'Guest'} · {o.itemCount} item{o.itemCount !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-white">₹{Math.round(o.total)}</p>
                <p className="text-[10px] text-gray-500">
                  {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { selectedStore } = useAdminStoreStore();
  const [metrics, setMetrics]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const loadMetrics = (store) => {
    setLoading(true); setError('');
    const params = store ? { storeId: store.id } : {};
    adminApi.getMetrics(params)
      .then((res) => setMetrics(res.metrics))
      .catch((err) => setError(err.message || 'Failed to load metrics'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMetrics(selectedStore); }, [selectedStore?.id]); // eslint-disable-line

  const totalOrders = metrics ? Object.values(metrics.ordersByStatus || {}).reduce((s, v) => s + v, 0) : 0;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 text-sm">Store analytics & insights</p>
          </div>
          <Tip text="Refresh dashboard metrics" position="left">
            <button onClick={() => loadMetrics(selectedStore)}
              className="w-9 h-9 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </Tip>
        </div>

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 text-red-400 text-sm">{error}</div>
        )}

        {!loading && metrics && (
          <>
            {/* ── Summary Cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard icon="💰" label="Today's Revenue"  value={fmt(metrics.revenue.today)}   sub="Today"    color="bg-green-900/50 text-green-400"  />
              <SummaryCard icon="📅" label="Monthly Revenue"  value={fmt(metrics.revenue.month)}   sub="This Month" color="bg-blue-900/50 text-blue-400" />
              <SummaryCard icon="📈" label="Yearly Revenue"   value={fmt(metrics.revenue.year)}    sub="This Year"  color="bg-purple-900/50 text-purple-400" />
              <SummaryCard icon="🏆" label="All-Time Revenue" value={fmt(metrics.revenue.allTime)} sub="Total"    color="bg-yellow-900/50 text-yellow-400" />
            </div>

            {/* ── Orders + Users quick stats ────────────────────────────────── */}
            <div className={`grid gap-3 ${selectedStore && metrics.invStats ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{metrics.orders.today}</p>
                <p className="text-xs text-gray-400 mt-1">Orders Today</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{metrics.orders.total}</p>
                <p className="text-xs text-gray-400 mt-1">Total Orders</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{metrics.totalUsers}</p>
                <p className="text-xs text-gray-400 mt-1">Total Users</p>
              </div>
              {selectedStore && metrics.inventory && (
                <Tip text={`${metrics.inventory.outOfStock} out of stock · ${metrics.inventory.lowStock} low stock (< 5 units)`} position="top">
                  <div className="bg-brand-950/40 border border-brand-800/50 rounded-2xl p-4 text-center col-span-2 md:col-span-1 cursor-help">
                    <p className="text-2xl font-bold text-brand-400">{metrics.inventory.total}</p>
                    <p className="text-xs text-brand-300/70 mt-1">SKUs Configured</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {metrics.inventory.outOfStock} out · {metrics.inventory.lowStock} low
                    </p>
                  </div>
                </Tip>
              )}
            </div>

            {/* ── Revenue Chart ─────────────────────────────────────────────── */}
            <RevenueChart
              revenueByDay={metrics.revenueByDay}
              revenueByMonth={metrics.revenueByMonth}
              revenueByYear={metrics.revenueByYear}
            />

            {/* ── Status + Top Products ──────────────────────────────────────── */}
            <div className="grid md:grid-cols-2 gap-4">
              <OrderStatusGrid ordersByStatus={metrics.ordersByStatus} total={totalOrders} navigate={navigate} />
              <TopProducts topProducts={metrics.topProducts} />
            </div>

            {/* ── Recent Orders ──────────────────────────────────────────────── */}
            <RecentOrders orders={metrics.recentOrders} navigate={navigate} />
          </>
        )}
      </div>
    </AdminLayout>
  );
}
