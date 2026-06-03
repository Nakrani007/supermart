// Admin Orders Panel — view ALL customer orders, update status.
// Uses adminApi (admin token) — NOT the regular user client.
// URL: /admin/orders

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout            from './AdminLayout.jsx';
import { adminApi }           from '../api/admin.api.js';
import { useAdminStoreStore } from '../store/adminStoreStore.js';
import Tooltip                from '../components/common/Tooltip.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ['ALL', 'PENDING', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

const STATUS_META = {
  PENDING:          { label: 'Pending',         color: 'bg-yellow-900/60 text-yellow-300',  dot: 'bg-yellow-400',  next: ['CONFIRMED', 'CANCELLED'] },
  CONFIRMED:        { label: 'Confirmed',        color: 'bg-blue-900/60 text-blue-300',      dot: 'bg-blue-400',    next: ['PACKED', 'CANCELLED'] },
  PACKED:           { label: 'Packed',           color: 'bg-purple-900/60 text-purple-300',  dot: 'bg-purple-400',  next: ['OUT_FOR_DELIVERY', 'CANCELLED'] },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-orange-900/60 text-orange-300',  dot: 'bg-orange-400',  next: ['DELIVERED', 'CANCELLED'] },
  DELIVERED:        { label: 'Delivered',        color: 'bg-green-900/60 text-green-300',    dot: 'bg-green-400',   next: [] },
  CANCELLED:        { label: 'Cancelled',        color: 'bg-red-900/60 text-red-300',        dot: 'bg-red-400',     next: [] },
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: 'bg-gray-800 text-gray-400', dot: 'bg-gray-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
      {m.label}
    </span>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

function OrderModal({ order, onClose, onStatusUpdate }) {
  const [updating,       setUpdating]       = useState(false);
  const [msg,            setMsg]            = useState('');
  // Live tracking state
  const [tracking,       setTracking]       = useState(false);  // currently sharing GPS
  const [trackingMsg,    setTrackingMsg]    = useState('');
  const trackingInterval = useRef(null);

  const meta    = STATUS_META[order.status] || {};
  const address = order.address
    ? (() => { try { return JSON.parse(order.address); } catch { return null; } })()
    : null;

  // Google Maps URL — prefer exact GPS coords if captured at order time
  const hasGps  = order.customerLat != null && order.customerLng != null;
  const mapsUrl = address
    ? hasGps
      ? `https://www.google.com/maps?q=${order.customerLat},${order.customerLng}`
      : `https://www.google.com/maps/search/${encodeURIComponent(
          [address.line1, address.line2, address.city, address.pincode].filter(Boolean).join(', ')
        )}`
    : null;

  const trackingPageUrl = `${window.location.origin}/track/${order.id}`;

  const handleStatus = async (newStatus) => {
    setUpdating(true); setMsg('');
    try {
      await adminApi.updateOrderStatus(order.id, newStatus);
      setMsg(`✅ Status updated to ${STATUS_META[newStatus]?.label || newStatus}`);
      onStatusUpdate(order.id, newStatus);
    } catch (e) {
      setMsg(`❌ ${e.message || 'Update failed'}`);
    } finally {
      setUpdating(false);
    }
  };

  // Start/stop GPS sharing for delivery tracking
  const sendLocation = async () => {
    if (!navigator.geolocation) {
      setTrackingMsg('❌ Geolocation not supported on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        try {
          await adminApi.updateDeliveryTracking(order.id, lat, lng);
          setTrackingMsg(`📍 Location updated · ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
        } catch (e) {
          setTrackingMsg(`❌ ${e.message || 'Failed to update location'}`);
        }
      },
      () => setTrackingMsg('❌ Location access denied'),
      { timeout: 8000, maximumAge: 10000 },
    );
  };

  const startTracking = () => {
    setTracking(true);
    sendLocation();
    trackingInterval.current = setInterval(sendLocation, 30000);
  };

  const stopTracking = () => {
    setTracking(false);
    clearInterval(trackingInterval.current);
    setTrackingMsg('⏹ Tracking stopped');
  };

  // Clean up interval when modal closes
  useEffect(() => {
    return () => clearInterval(trackingInterval.current);
  }, []);

  const copyTrackingLink = () => {
    navigator.clipboard?.writeText(trackingPageUrl);
    setTrackingMsg('✅ Tracking link copied!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl z-10 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <div>
            <p className="text-xs text-gray-500">Order</p>
            <p className="text-base font-bold text-white">#{order.orderNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Customer */}
          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Customer</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-900 rounded-full flex items-center justify-center text-sm font-bold text-white">
                {order.user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{order.user?.name || 'Unknown'}</p>
                <p className="text-xs text-gray-400">
                  {order.user?.mobile}{order.user?.email ? ` · ${order.user.email}` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 font-medium">Date & Time</p>
              <p className="text-sm font-semibold text-white mt-1">
                {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="bg-gray-800 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 font-medium">Fulfillment</p>
              <p className="text-sm font-semibold text-white mt-1">
                {order.fulfillmentType === 'HOME_DELIVERY' ? '🚚 Home Delivery' : '🏪 Store Pickup'}
              </p>
              {order.deliverySlot && (
                <p className="text-xs text-gray-400">
                  {new Date(order.deliverySlot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {' '}{order.deliverySlot.startTime}–{order.deliverySlot.endTime}
                </p>
              )}
            </div>
          </div>

          {/* Address + Map */}
          {address && (
            <div className="bg-gray-800 rounded-xl p-3 space-y-2">
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Delivery Address</p>
              <p className="text-sm text-gray-200 leading-relaxed">
                {address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city} – {address.pincode}
              </p>
              {address.landmark && (
                <p className="text-xs text-gray-400">📍 Near {address.landmark}</p>
              )}

              {/* GPS Coordinates */}
              {hasGps ? (
                <div className="flex items-center gap-2 bg-gray-900/60 rounded-lg px-2.5 py-2">
                  <span className="text-base leading-none">🛰️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-500 font-medium">GPS Coordinates</p>
                    <p className="text-xs text-gray-300 font-mono">
                      {order.customerLat.toFixed(6)}, {order.customerLng.toFixed(6)}
                    </p>
                  </div>
                  <a href={`https://www.google.com/maps?q=${order.customerLat},${order.customerLng}`}
                    target="_blank" rel="noreferrer"
                    className="text-[10px] font-bold text-brand-400 hover:text-brand-300 whitespace-nowrap transition-colors">
                    Exact Pin ↗
                  </a>
                </div>
              ) : (
                <p className="text-[10px] text-gray-600 italic">📡 Location not provided at checkout</p>
              )}

              <a href={mapsUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400
                           hover:text-brand-300 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {hasGps ? 'View Exact Location on Maps ↗' : 'Search Address on Maps ↗'}
              </a>
            </div>
          )}

          {/* Live Delivery Tracking (only when OUT_FOR_DELIVERY + HOME_DELIVERY) */}
          {order.fulfillmentType === 'HOME_DELIVERY' && order.status === 'OUT_FOR_DELIVERY' && (
            <div className="bg-orange-950/30 border border-orange-800/50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-orange-400">🛵 Live Delivery Tracking</p>

              <div className="flex gap-2">
                {tracking ? (
                  <Tooltip text="Stop broadcasting your GPS to the customer" position="top" className="flex-1">
                    <button onClick={stopTracking}
                      className="w-full py-2 text-xs font-bold rounded-xl bg-red-700 hover:bg-red-600
                                 text-white transition-colors active:scale-95">
                      ⏹ Stop Sharing Location
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip text="Start sending live GPS updates to the customer every 30s" position="top" className="flex-1">
                    <button onClick={startTracking}
                      className="w-full py-2 text-xs font-bold rounded-xl bg-orange-600 hover:bg-orange-500
                                 text-white transition-colors active:scale-95">
                      📡 Start Sharing Location
                    </button>
                  </Tooltip>
                )}
                <Tooltip text="Copy tracking link to share with customer" position="top">
                  <button onClick={copyTrackingLink}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-gray-700 hover:bg-gray-600
                               text-gray-200 transition-colors active:scale-95">
                    🔗 Copy Link
                  </button>
                </Tooltip>
                <Tooltip text="Open live tracking map in new tab" position="top">
                  <a href={trackingPageUrl} target="_blank" rel="noreferrer"
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-gray-700 hover:bg-gray-600
                               text-gray-200 transition-colors active:scale-95 flex items-center">
                    🗺
                  </a>
                </Tooltip>
              </div>

              {trackingMsg && (
                <p className="text-[11px] text-orange-300 font-medium">{trackingMsg}</p>
              )}
              {tracking && (
                <p className="text-[10px] text-gray-400">Updating location every 30 seconds</p>
              )}
            </div>
          )}

          {/* Items */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
              Items ({order.items?.length || 0})
            </p>
            <div className="space-y-2">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.product?.imageUrl
                      ? <img src={item.product.imageUrl} alt="" className="w-full h-full object-contain p-1" />
                      : <span className="text-xl">📦</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.product?.name}</p>
                    <p className="text-xs text-gray-400">{item.product?.unit} · ₹{item.unitPrice}/unit</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-white">₹{Math.round(item.lineTotal)}</p>
                    <p className="text-xs text-gray-500">×{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-gray-800 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-300">
              <span>Subtotal</span><span>₹{Math.round(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-green-400">
                <span>Discount</span><span>− ₹{Math.round(order.discount)}</span>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm text-gray-300">
                <span>Delivery Fee</span><span>₹{Math.round(order.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-white pt-1.5 border-t border-gray-700">
              <span>Total</span><span>₹{Math.round(order.total)}</span>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-yellow-950/40 border border-yellow-800/50 rounded-xl p-3">
              <p className="text-xs font-bold text-yellow-500 mb-1">Customer Note</p>
              <p className="text-sm text-yellow-200">{order.notes}</p>
            </div>
          )}

          {/* Status feedback */}
          {msg && (
            <p className={`text-sm font-medium text-center py-2.5 rounded-xl
              ${msg.startsWith('✅') ? 'bg-green-950/60 text-green-400' : 'bg-red-950/60 text-red-400'}`}>
              {msg}
            </p>
          )}
        </div>

        {/* Status update buttons */}
        {meta.next?.length > 0 && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-800 bg-gray-900">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Update Status</p>
            <div className="flex gap-2 flex-wrap">
              {meta.next.map((s) => {
                const tooltipMap = {
                  CONFIRMED:        'Mark order as confirmed — notify customer',
                  PACKED:           'Items packed and ready for dispatch',
                  OUT_FOR_DELIVERY: 'Order is on the way to the customer',
                  DELIVERED:        'Mark as successfully delivered',
                  CANCELLED:        'Cancel this order',
                };
                return (
                  <Tooltip key={s} text={tooltipMap[s] || `Move to ${STATUS_META[s]?.label}`} position="top" className="flex-1">
                    <button onClick={() => handleStatus(s)} disabled={updating}
                      className={`w-full min-w-[120px] py-2.5 text-xs font-bold rounded-xl transition-all active:scale-95
                        disabled:opacity-60
                        ${s === 'CANCELLED'
                          ? 'bg-red-950/60 text-red-400 border border-red-800 hover:bg-red-950'
                          : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
                      {updating ? '…' : (STATUS_META[s]?.label || s)}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Order Row ────────────────────────────────────────────────────────────────

function OrderRow({ order, onSelect }) {
  const date = new Date(order.createdAt);
  return (
    <button onClick={() => onSelect(order)}
      className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-800 hover:bg-gray-800/50
                 active:bg-gray-800 transition-colors text-left">
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_META[order.status]?.dot || 'bg-gray-600'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">#{order.orderNumber}</span>
          <span className="text-xs text-gray-500">
            {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            {' '}{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {order.user?.name || 'Guest'} · {order.user?.mobile}
          {' · '}{order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
          {order.fulfillmentType === 'STORE_PICKUP' ? ' · 🏪 Pickup' : ' · 🚚 Delivery'}
        </p>
      </div>
      <div className="flex-shrink-0 text-right space-y-1">
        <p className="text-sm font-bold text-white">₹{Math.round(order.total)}</p>
        <StatusBadge status={order.status} />
      </div>
      <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'ALL';
  const { selectedStore } = useAdminStoreStore();

  const [orders, setOrders]         = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState(null);
  const [counts, setCounts]         = useState({});
  const [error, setError]           = useState('');

  const buildParams = useCallback((pg, status, q) => {
    const p = { page: pg, limit: 20 };
    if (status && status !== 'ALL') p.status = status;
    if (q)                          p.search  = q;
    if (selectedStore)              p.storeId = selectedStore.id;
    return p;
  }, [selectedStore]);

  const load = useCallback(async (pg, status, q) => {
    setLoading(true); setError('');
    try {
      const r = await adminApi.getOrders(buildParams(pg, status, q));
      setOrders(r.orders || []);
      setTotal(r.total || 0);
      setTotalPages(r.totalPages || 1);
    } catch (e) {
      setError(e.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  const loadCounts = useCallback(async () => {
    try {
      const storeParam = selectedStore ? { storeId: selectedStore.id } : {};
      const all = await adminApi.getOrders({ page: 1, limit: 1, ...storeParam });
      const c   = { ALL: all.total };
      await Promise.all(
        STATUSES.slice(1).map((s) =>
          adminApi.getOrders({ page: 1, limit: 1, status: s, ...storeParam })
            .then((r) => { c[s] = r.total; })
            .catch(() => {})
        )
      );
      setCounts(c);
    } catch {}
  }, [selectedStore]);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  useEffect(() => {
    setPage(1);
    load(1, statusFilter, search);
  }, [statusFilter, load, selectedStore?.id]); // eslint-disable-line

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, statusFilter, search);
  };

  const handleStatusUpdate = (orderId, newStatus) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selected?.id === orderId) setSelected((p) => ({ ...p, status: newStatus }));
    loadCounts();
  };

  const setTab = (s) => {
    const p = {};
    if (s !== 'ALL') p.status = s;
    setSearchParams(p);
  };

  const pageRevenue = orders.reduce((s, o) => s + o.total, 0);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-950">

        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 pt-4 pb-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 mb-3">
            <div>
              <h1 className="text-lg font-bold text-white">Orders</h1>
              <p className="text-xs text-gray-400">{total} total order{total !== 1 ? 's' : ''}</p>
            </div>
            <Tooltip text="Refresh orders list" position="left" className="ml-auto">
              <button onClick={() => { load(page, statusFilter, search); loadCounts(); }}
                className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </Tooltip>
          </div>
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 flex items-center bg-gray-800 rounded-xl px-3 py-2 gap-2">
              <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Order #, name or mobile..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none" />
            </div>
            <button type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-colors">
              Search
            </button>
          </form>
        </div>

        {/* Status tabs */}
        <div className="bg-gray-900 border-b border-gray-800 overflow-x-auto no-scrollbar">
          <div className="flex">
            {STATUSES.map((s) => {
              const tabTip = {
                ALL:              'Show all orders',
                PENDING:          'Orders waiting for confirmation',
                CONFIRMED:        'Orders confirmed, not yet packed',
                PACKED:           'Packed and ready for pickup/dispatch',
                OUT_FOR_DELIVERY: 'Currently out for delivery',
                DELIVERED:        'Successfully delivered orders',
                CANCELLED:        'Cancelled or rejected orders',
              };
              return (
                <Tooltip key={s} text={tabTip[s]} position="bottom">
                  <button onClick={() => setTab(s)}
                    className={`flex-shrink-0 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap
                      ${statusFilter === s
                        ? 'border-brand-500 text-brand-500'
                        : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                    {s === 'ALL' ? 'All' : (STATUS_META[s]?.label || s)}
                    {counts[s] !== undefined && (
                      <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full
                        ${statusFilter === s ? 'bg-brand-900/60 text-brand-500' : 'bg-gray-800 text-gray-500'}`}>
                        {counts[s]}
                      </span>
                    )}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 bg-red-950/50 border border-red-800 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Summary bar */}
        {!loading && orders.length > 0 && (
          <div className="px-4 py-2 bg-gray-900/50 flex items-center text-xs text-gray-500 gap-4 border-b border-gray-800/50">
            <span>Showing {orders.length} of {total}</span>
            <span className="ml-auto font-semibold text-gray-400">
              Page revenue: ₹{Math.round(pageRevenue).toLocaleString('en-IN')}
            </span>
          </div>
        )}

        {/* Orders list */}
        <div>
          {loading ? (
            <div>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-700 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-800 rounded animate-pulse w-1/3" />
                    <div className="h-3 bg-gray-800/50 rounded animate-pulse w-2/3" />
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="h-3.5 bg-gray-800 rounded animate-pulse w-12" />
                    <div className="h-5 bg-gray-800/50 rounded-full animate-pulse w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-400 font-medium">No orders found</p>
              {statusFilter !== 'ALL' && (
                <button onClick={() => setTab('ALL')} className="mt-2 text-brand-500 text-sm font-semibold">
                  View all orders
                </button>
              )}
            </div>
          ) : (
            orders.map((order) => (
              <OrderRow key={order.id} order={order} onSelect={setSelected} />
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-6">
            <button onClick={() => { const p = page - 1; setPage(p); load(p, statusFilter, search); }}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-700 text-gray-300
                         disabled:opacity-40 hover:bg-gray-800 transition-colors">
              ← Prev
            </button>
            <span className="text-sm text-gray-500 font-medium">Page {page} of {totalPages}</span>
            <button onClick={() => { const p = page + 1; setPage(p); load(p, statusFilter, search); }}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-700 text-gray-300
                         disabled:opacity-40 hover:bg-gray-800 transition-colors">
              Next →
            </button>
          </div>
        )}

        {/* Order Detail Modal */}
        {selected && (
          <OrderModal
            order={selected}
            onClose={() => setSelected(null)}
            onStatusUpdate={handleStatusUpdate}
          />
        )}
      </div>
    </AdminLayout>
  );
}
