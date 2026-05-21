// Account Dashboard — two-panel layout matching reference DMart/Blinkit screenshots.
// Desktop: sticky Header → [sidebar | content] → Footer
// Mobile:  Header → full-screen sidebar menu OR full-screen content section

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth.api.js';
import { ordersApi } from '../api/orders.api.js';
import { useAuthStore } from '../store/authStore.js';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  PENDING:          { label: 'Order placed',     shortLabel: 'Placed',    icon: '🕐', green: false },
  CONFIRMED:        { label: 'Order confirmed',  shortLabel: 'Confirmed', icon: '✅', green: false },
  PACKING:          { label: 'Being packed',      shortLabel: 'Packing',   icon: '📦', green: false },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', shortLabel: 'On the way',icon: '🛵', green: false },
  DELIVERED:        { label: 'Order arrived',    shortLabel: 'Arrived',   icon: null, green: true  },
  CANCELLED:        { label: 'Order cancelled',  shortLabel: 'Cancelled', icon: '✕', green: false },
  REFUNDED:         { label: 'Refunded',          shortLabel: 'Refunded',  icon: '↩', green: false },
};

function StatusIcon({ status, size = 'md' }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.PENDING;
  const sz  = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-8 h-8 text-base';
  if (cfg.green) {
    return (
      <div className={`${sz} rounded-full bg-green-100 flex items-center justify-center flex-shrink-0`}>
        <svg className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} fill="none" viewBox="0 0 24 24"
          stroke="#16a34a" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`${sz} rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500`}>
      {cfg.icon}
    </div>
  );
}

// ─── Sidebar nav items ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'addresses',       label: 'My Addresses',    icon: <AddressIcon /> },
  { key: 'orders',          label: 'My Orders',        icon: <OrdersIcon  /> },
  { key: 'prescriptions',   label: 'My Prescriptions', icon: <PrescIcon   /> },
  { key: 'gift-cards',      label: 'E-Gift Cards',     icon: <GiftIcon    /> },
  { key: 'account-privacy', label: 'Account privacy',  icon: <PrivacyIcon /> },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ user, active, onSelect, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      {/* Phone number header */}
      <div className="px-5 py-5 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800 font-mono tracking-wide">
          +{user?.mobile?.startsWith('91') ? '' : '91'}{user?.mobile}
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-1">
        {NAV_ITEMS.map(({ key, label, icon }) => (
          <button key={key} onClick={() => onSelect(key)}
            className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors
              ${active === key
                ? 'bg-gray-50 text-gray-900 font-semibold border-r-2 border-brand-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'}`}>
            <span className={`flex-shrink-0 ${active === key ? 'text-gray-700' : 'text-gray-400'}`}>
              {icon}
            </span>
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-100 py-1">
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-5 py-3.5 text-left text-gray-500
                     hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogoutIcon />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
}

// ─── Order list ───────────────────────────────────────────────────────────────

function OrderListView({ onSelectOrder }) {
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate                    = useNavigate();

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const r = await ordersApi.getMyOrders({ page: p, limit: 10 });
      setOrders(r.orders || []);
      setTotalPages(r.totalPages || 1);
    } catch { setOrders([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  if (loading) return (
    <div className="space-y-3 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 h-40 animate-pulse" />
      ))}
    </div>
  );

  if (orders.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 px-6">
      <div className="text-6xl mb-4">📦</div>
      <h3 className="text-lg font-bold text-gray-700 mb-1">No orders yet</h3>
      <p className="text-sm text-gray-400 mb-6 text-center">Your order history will appear here</p>
      <button onClick={() => navigate('/')}
        className="px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold
                   hover:bg-brand-700 transition-colors">
        Start Shopping
      </button>
    </div>
  );

  return (
    <div>
      <div className="divide-y divide-gray-100">
        {orders.map((order) => (
          <OrderListItem key={order.id} order={order} onClick={() => onSelectOrder(order)} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 p-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl
                       disabled:opacity-40 hover:bg-gray-50 transition-colors">
            ← Prev
          </button>
          <span className="text-sm text-gray-400">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl
                       disabled:opacity-40 hover:bg-gray-50 transition-colors">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function OrderListItem({ order, onClick }) {
  const cfg   = STATUS_CFG[order.status] || STATUS_CFG.PENDING;
  const date  = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const time  = new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const shown = order.items.slice(0, 4);
  const extra = order.items.length - 4;

  return (
    <button onClick={onClick}
      className="w-full px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors text-left group">
      <StatusIcon status={order.status} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={`text-sm font-bold ${cfg.green ? 'text-gray-900' : 'text-gray-700'}`}>
              {cfg.label}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              ₹{order.total.toFixed(0)} &nbsp;·&nbsp; {date}, {time}
            </p>
          </div>
          <svg className="w-5 h-5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-0.5 transition-colors"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <div className="flex items-center gap-2 mt-3">
          {shown.map((item) => (
            <div key={item.id}
              className="w-14 h-14 rounded-xl border border-gray-100 bg-gray-50
                         flex items-center justify-center overflow-hidden flex-shrink-0">
              {item.product.imageUrl
                ? <img src={item.product.imageUrl} alt={item.product.name}
                    className="w-full h-full object-contain p-1" loading="lazy" />
                : <span className="text-2xl">🛒</span>}
            </div>
          ))}
          {extra > 0 && (
            <div className="w-14 h-14 rounded-xl border border-gray-100 bg-gray-50
                            flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-gray-500">+{extra}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Order detail ─────────────────────────────────────────────────────────────

function BillRow({ label, value, valueClass = 'text-gray-700', bold = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-gray-900' : valueClass}`}>{value}</span>
    </div>
  );
}

function OrderDetailView({ order, onBack, onRemove }) {
  const [copied,            setCopied]           = useState(false);
  const [removing,          setRemoving]          = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const cfg      = STATUS_CFG[order.status] || STATUS_CFG.PENDING;
  const dateTime = new Date(order.createdAt).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  const mrpTotal       = order.items.reduce((s, i) => s + i.mrpAtPurchase * i.quantity, 0);
  const itemTotal      = order.subtotal;
  const productDiscount = mrpTotal - itemTotal;

  const copyOrderId = () => {
    navigator.clipboard?.writeText(order.orderNumber).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRemove = async () => {
    setRemoving(true);
    try { await ordersApi.deleteFromHistory(order.id); onRemove(order.id); }
    catch { /* ignore */ }
    finally { setRemoving(false); setShowRemoveConfirm(false); }
  };

  let addressDisplay = null;
  if (order.address) {
    try {
      const a = typeof order.address === 'string' ? JSON.parse(order.address) : order.address;
      addressDisplay = [a.line1, a.line2, a.city, a.pincode].filter(Boolean).join(', ');
    } catch { addressDisplay = order.address; }
  }

  return (
    <div className="bg-white min-h-full">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-900">Order summary</span>
      </div>

      <div className="divide-y divide-gray-100">
        {/* Status */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-3 mb-3">
            <StatusIcon status={order.status} size="md" />
            <div>
              <p className="text-base font-bold text-gray-900">{cfg.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{dateTime}</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm font-semibold text-green-600 hover:text-green-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Invoice
          </button>
        </div>

        {/* Items */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm font-bold text-gray-900">
            {order.items.length} item{order.items.length !== 1 ? 's' : ''} in this order
          </p>
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl border border-gray-100 bg-gray-50 flex-shrink-0
                              flex items-center justify-center overflow-hidden">
                {item.product.imageUrl
                  ? <img src={item.product.imageUrl} alt={item.product.name}
                      className="w-full h-full object-contain p-1" />
                  : <span className="text-2xl">🛒</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-2">
                  {item.product.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{item.product.unit} × {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900 flex-shrink-0">₹{item.lineTotal.toFixed(0)}</p>
            </div>
          ))}
        </div>

        {/* Bill details */}
        <div className="px-5 py-5 space-y-2.5">
          <p className="text-sm font-bold text-gray-900 mb-3">Bill details</p>
          <BillRow label="MRP" value={`₹${mrpTotal.toFixed(0)}`} />
          {productDiscount > 0 && (
            <BillRow label="Product discount" value={`−₹${productDiscount.toFixed(0)}`} valueClass="text-green-600" />
          )}
          <BillRow label="Item total" value={`₹${itemTotal.toFixed(0)}`} />
          <BillRow
            label="Delivery charges"
            value={order.deliveryFee > 0 ? `₹${order.deliveryFee.toFixed(0)}` : 'FREE'}
            valueClass={order.deliveryFee === 0 ? 'text-green-600 font-semibold' : 'text-gray-700'}
          />
          <div className="pt-2 border-t border-gray-100">
            <BillRow label="Bill total" value={`₹${order.total.toFixed(0)}`} bold />
          </div>
        </div>

        {/* Order details */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-sm font-bold text-gray-900">Order details</p>
          <div>
            <p className="text-xs text-gray-400 mb-1">Order id</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono text-gray-800">{order.orderNumber}</p>
              <button onClick={copyOrderId}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                {copied
                  ? <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>}
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Fulfillment</p>
            <p className="text-sm text-gray-800">
              {order.fulfillmentType === 'STORE_PICKUP' ? '🏪 Store Pickup' : '🛵 Home Delivery'}
            </p>
          </div>
          {addressDisplay && (
            <div>
              <p className="text-xs text-green-600 font-medium mb-1">Deliver to</p>
              <p className="text-sm text-gray-800">{addressDisplay}</p>
            </div>
          )}
          {order.deliverySlot && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Delivery slot</p>
              <p className="text-sm text-gray-800">
                {new Date(order.deliverySlot.date).toLocaleDateString('en-IN', {
                  weekday: 'short', day: 'numeric', month: 'short' })}
                {' · '}{order.deliverySlot.startTime} – {order.deliverySlot.endTime}
              </p>
            </div>
          )}
        </div>

        {/* Help */}
        <div className="px-5 py-5">
          <p className="text-sm font-bold text-gray-900 mb-3">Need help with your order?</p>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-100
                             hover:bg-gray-50 transition-colors text-left">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xl">
              💬
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">Chat with us</p>
              <p className="text-xs text-gray-400">About any issues related to your order</p>
            </div>
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Remove */}
        <div className="px-5 py-4">
          <button onClick={() => setShowRemoveConfirm(true)}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            Remove from history
          </button>
        </div>
      </div>

      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRemoveConfirm(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-xs w-full shadow-xl z-10">
            <p className="font-bold text-gray-800 text-center mb-1">Remove from history?</p>
            <p className="text-sm text-gray-400 text-center mb-5">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowRemoveConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium">Cancel</button>
              <button onClick={handleRemove} disabled={removing}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold
                           hover:bg-red-600 disabled:opacity-50 transition-colors">
                {removing ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── My Addresses ─────────────────────────────────────────────────────────────

const LABEL_ICON = { Home: '🏠', Office: '🏢', Other: '📍' };

function AddressesView({ user, onUserUpdate }) {
  const [showAdd, setShowAdd]   = useState(false);
  const [menuId, setMenuId]     = useState(null);   // 3-dot menu open for this id
  const [deletingId, setDeleting] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({
    label: 'Home', line1: '', line2: '', city: 'Surat', pincode: '', landmark: '', isDefault: false,
  });

  const handleAdd = async () => {
    if (!form.line1.trim() || form.line1.length < 5) return alert('Enter a valid address');
    if (!/^\d{6}$/.test(form.pincode)) return alert('Enter a valid 6-digit pincode');
    setSaving(true);
    try {
      const res = await authApi.addAddress(form);
      const updated = form.isDefault
        ? [res.address, ...user.addresses.map(a => ({ ...a, isDefault: false }))]
        : [...user.addresses, res.address];
      onUserUpdate({ addresses: updated });
      setShowAdd(false);
      setForm({ label: 'Home', line1: '', line2: '', city: 'Surat', pincode: '', landmark: '', isDefault: false });
    } catch (e) { alert(e.message || 'Failed to add address'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setMenuId(null);
    if (!window.confirm('Delete this address?')) return;
    setDeleting(id);
    try {
      await authApi.deleteAddress(id);
      onUserUpdate({ addresses: user.addresses.filter(a => a.id !== id) });
    } catch { alert('Failed to delete'); }
    finally { setDeleting(null); }
  };

  const handleSetDefault = async (id) => {
    setMenuId(null);
    try {
      await authApi.updateAddress(id, { isDefault: true });
      onUserUpdate({ addresses: user.addresses.map(a => ({ ...a, isDefault: a.id === id })) });
    } catch { alert('Failed to update'); }
  };

  return (
    <div className="p-5 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-gray-900">My addresses</h2>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors">
          <span className="text-lg leading-none">+</span>
          Add new address
        </button>
      </div>

      {(user?.addresses || []).length === 0 && !showAdd && (
        <div className="bg-gray-50 rounded-2xl p-10 text-center border border-gray-100">
          <div className="text-3xl mb-2">📍</div>
          <p className="text-sm text-gray-400">No saved addresses yet</p>
        </div>
      )}

      {/* Address cards */}
      {(user?.addresses || []).map((addr) => (
        <div key={addr.id}
          className={`bg-white rounded-2xl border p-4 relative shadow-sm
            ${addr.isDefault ? 'border-brand-200' : 'border-gray-100'}`}>
          <div className="flex items-start gap-3">
            {/* Label icon */}
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
              {LABEL_ICON[addr.label] || '📍'}
            </div>

            {/* Address text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-gray-800">{addr.label}</span>
                {addr.isDefault && (
                  <span className="text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded-full font-medium">
                    Default
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 leading-snug">
                {[addr.line1, addr.line2, addr.city, addr.pincode].filter(Boolean).join(', ')}
              </p>
              {addr.landmark && (
                <p className="text-xs text-gray-400 mt-0.5">Near: {addr.landmark}</p>
              )}
            </div>

            {/* 3-dot menu */}
            <div className="relative flex-shrink-0">
              <button onClick={() => setMenuId(menuId === addr.id ? null : addr.id)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>

              {menuId === addr.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                  <div className="absolute right-0 top-9 z-20 bg-white border border-gray-100 rounded-xl
                                  shadow-lg overflow-hidden min-w-[140px]">
                    {!addr.isDefault && (
                      <button onClick={() => handleSetDefault(addr.id)}
                        className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors">
                        Set as default
                      </button>
                    )}
                    <button onClick={() => handleDelete(addr.id)} disabled={deletingId === addr.id}
                      className="w-full px-4 py-2.5 text-sm text-left text-red-500 hover:bg-red-50 transition-colors
                                 disabled:opacity-50">
                      {deletingId === addr.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add address form */}
      {showAdd && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 shadow-sm">
          <p className="text-sm font-bold text-gray-900">New Address</p>
          <div className="flex gap-2">
            {['Home', 'Office', 'Other'].map(l => (
              <button key={l} onClick={() => setForm(f => ({ ...f, label: l }))}
                className={`px-3 py-1.5 rounded-xl text-sm border font-medium transition-colors
                  ${form.label === l
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {LABEL_ICON[l]} {l}
              </button>
            ))}
          </div>
          {[
            { ph: 'Flat / Building, Street *', k: 'line1'    },
            { ph: 'Area / Locality',           k: 'line2'    },
            { ph: 'Landmark',                  k: 'landmark' },
          ].map(({ ph, k }) => (
            <input key={k} placeholder={ph} value={form[k] || ''}
              onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none
                         focus:border-brand-500 transition-colors" />
          ))}
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="City *" value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500" />
            <input placeholder="Pincode *" value={form.pincode} inputMode="numeric" maxLength={6}
              onChange={e => setForm(f => ({ ...f, pincode: e.target.value.replace(/\D/g, '') }))}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={form.isDefault}
              onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
              className="rounded" />
            Set as default address
          </label>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowAdd(false)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleAdd} disabled={saving}
              className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold
                         hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save Address'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Account Privacy + Delete Account ────────────────────────────────────────

function AccountPrivacyView({ user, onUserUpdate, onLogout }) {
  const { token, setAuth }   = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState(user?.name || '');
  const [email, setEmail]     = useState(user?.email || '');
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput]             = useState('');
  const [deleting, setDeleting]                   = useState(false);

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const res = await authApi.updateProfile({ name, email });
      onUserUpdate(res.user);
      setAuth(token, { ...user, ...res.user });
      setEditing(false);
      setMsg('Profile updated successfully');
    } catch (e) { setMsg(e.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleting(true);
    try {
      await authApi.deleteAccount?.();
      onLogout();
    } catch (e) {
      alert(e.message || 'Failed to delete account. Please contact support.');
      setDeleting(false);
    }
  };

  return (
    <div className="p-5 space-y-6">
      {/* Personal details */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">Personal Details</h2>
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="text-sm text-brand-600 font-medium hover:underline">Edit</button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none
                           focus:border-brand-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none
                           focus:border-brand-500 transition-colors" />
            </div>
            <p className="text-xs text-gray-400">Mobile number cannot be changed after registration.</p>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setMsg(''); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold
                           hover:bg-brand-700 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
            {[
              { label: 'Name',         value: user?.name || '—' },
              { label: 'Mobile',       value: `+91 ${user?.mobile}` },
              { label: 'Email',        value: user?.email || 'Not set' },
              { label: 'Member since', value: new Date(user?.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-gray-400">{label}</span>
                <span className="text-sm font-medium text-gray-800">{value}</span>
              </div>
            ))}
          </div>
        )}

        {msg && (
          <p className={`text-sm text-center mt-2 ${msg.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
            {msg}
          </p>
        )}
      </div>

      {/* ── Delete account section ── */}
      <div className="border-t border-gray-100 pt-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Delete Account</h2>
        <p className="text-sm text-gray-400 mb-4 leading-relaxed">
          Permanently delete your SuperMart account and all associated data.
          This action <span className="font-semibold text-gray-600">cannot be undone</span>.
        </p>

        <button onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-600
                     rounded-xl text-sm font-semibold hover:bg-red-50 hover:border-red-400
                     transition-all active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete my account
        </button>
      </div>

      {/* Delete account confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl z-10">
            {/* Warning icon */}
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Delete Account</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              This will permanently delete your account, order history, and all saved data.
            </p>

            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
              <p className="text-xs text-red-700 font-medium mb-2">
                Type <span className="font-black tracking-widest">DELETE</span> to confirm:
              </p>
              <input
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="Type DELETE here"
                className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm outline-none
                           focus:border-red-400 transition-colors font-mono tracking-widest"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== 'DELETE' || deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40
                           text-white rounded-xl text-sm font-bold transition-colors">
                {deleting ? 'Deleting…' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Coming soon stub ─────────────────────────────────────────────────────────

function ComingSoonView({ title }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6">
      <div className="text-5xl mb-4">🚧</div>
      <h3 className="text-base font-bold text-gray-700 mb-1">{title}</h3>
      <p className="text-sm text-gray-400 text-center">This feature is coming soon.</p>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function ProfilePage({ defaultSection = 'orders' }) {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearAuth, user: storeUser, setAuth, token } = useAuthStore();

  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  const initSection = searchParams.get('tab') || defaultSection;
  const [activeSection, setActiveSection] = useState(initSection);
  const [mobileView, setMobileView]       = useState('menu');   // 'menu' | 'content'
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    authApi.getProfile()
      .then(r => setUser(r.user))
      .catch(e => { if (e.status === 401) navigate('/'); else setUser(storeUser); })
      .finally(() => setLoading(false));
  }, []);

  const handleUserUpdate = (patch) => setUser(prev => ({ ...prev, ...patch }));

  const handleSelectSection = (key) => {
    setActiveSection(key);
    setSelectedOrder(null);
    setMobileView('content');
  };

  const handleLogout = () => { clearAuth(); navigate('/'); };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  // Content panel for the current section
  const renderContent = () => {
    if (activeSection === 'orders') {
      if (selectedOrder) {
        return (
          <OrderDetailView
            order={selectedOrder}
            onBack={() => setSelectedOrder(null)}
            onRemove={() => setSelectedOrder(null)}
          />
        );
      }
      return (
        <div>
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">My Orders</h2>
          </div>
          <OrderListView onSelectOrder={setSelectedOrder} />
        </div>
      );
    }
    if (activeSection === 'addresses') {
      return <AddressesView user={user} onUserUpdate={handleUserUpdate} />;
    }
    if (activeSection === 'account-privacy') {
      return <AccountPrivacyView user={user} onUserUpdate={handleUserUpdate} onLogout={handleLogout} />;
    }
    if (activeSection === 'prescriptions') return <ComingSoonView title="My Prescriptions" />;
    if (activeSection === 'gift-cards')    return <ComingSoonView title="E-Gift Cards" />;

    return <ComingSoonView title="Coming soon" />;
  };

  const sidebarEl = (
    <Sidebar
      user={user}
      active={activeSection}
      onSelect={handleSelectSection}
      onLogout={handleLogout}
    />
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* ── Standard header ── */}
      <Header />

      {/* ── Mobile layout ── */}
      <div className="md:hidden flex-1 flex flex-col bg-white">
        {mobileView === 'menu' ? (
          sidebarEl
        ) : (
          <>
            {/* Back bar */}
            {!selectedOrder && (
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3
                              flex items-center gap-3 z-10">
                <button onClick={() => setMobileView('menu')}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-gray-900 capitalize">
                  {NAV_ITEMS.find(n => n.key === activeSection)?.label || activeSection}
                </span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{renderContent()}</div>
          </>
        )}
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden md:flex flex-1 max-w-5xl w-full mx-auto bg-white shadow-sm my-4 rounded-2xl overflow-hidden border border-gray-100">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-gray-100 bg-white">
          {sidebarEl}
        </aside>

        {/* Content */}
        <main className="flex-1 bg-white overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}

// ─── SVG Icons (inline for zero-import cost) ─────────────────────────────────

function AddressIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function OrdersIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}
function PrescIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function GiftIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}
function PrivacyIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
