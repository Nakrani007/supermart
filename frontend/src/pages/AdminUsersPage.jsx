// Admin Users Page — full user profiles with addresses, GPS, map links, and order history.

import { useState, useEffect, useCallback } from 'react';
import Tooltip from '../components/common/Tooltip.jsx';
import AdminLayout from './AdminLayout.jsx';
import { adminApi } from '../api/admin.api.js';

// ─── Store constants (keep in sync with backend .env) ─────────────────────────

const STORE_LAT   = 21.2094;
const STORE_LNG   = 72.8261;
const DELIVERY_KM = 5;

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, r = Math.PI / 180;
  const dL = (lat2 - lat1) * r, dG = (lng2 - lng1) * r;
  const a = Math.sin(dL / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LABEL_ICON  = { Home: '🏠', Office: '🏢', Other: '📍' };
const STATUS_CLR  = {
  PENDING: 'bg-yellow-900/50 text-yellow-400', CONFIRMED: 'bg-blue-900/50 text-blue-400',
  PACKED: 'bg-purple-900/50 text-purple-400', OUT_FOR_DELIVERY: 'bg-orange-900/50 text-orange-400',
  DELIVERED: 'bg-green-900/50 text-green-400', CANCELLED: 'bg-red-900/50 text-red-400',
};

function InfoRow({ label, value, mono = false, children }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-700 last:border-0">
      <span className="text-xs text-gray-500 flex-shrink-0 mt-0.5">{label}</span>
      {children
        ? <div className="flex-1 text-right">{children}</div>
        : <span className={`text-sm text-right flex-1 ${mono ? 'font-mono text-gray-300' : 'text-gray-200'}`}>
            {value || '—'}
          </span>
      }
    </div>
  );
}

// ─── Address Card ─────────────────────────────────────────────────────────────

function AddressCard({ addr, index }) {
  const hasCoords = addr.lat != null && addr.lng != null;
  const dist      = hasCoords ? haversineKm(addr.lat, addr.lng, STORE_LAT, STORE_LNG) : null;
  const eligible  = dist != null ? dist <= DELIVERY_KM : null;

  const mapsUrlCoords   = hasCoords
    ? `https://www.google.com/maps?q=${addr.lat},${addr.lng}`
    : null;
  const mapsUrlSearch   = `https://www.google.com/maps/search/${encodeURIComponent(
    [addr.line1, addr.line2, addr.city, addr.pincode].filter(Boolean).join(', ')
  )}`;

  return (
    <div className={`bg-gray-800 rounded-2xl p-4 border ${addr.isDefault ? 'border-brand-700/60' : 'border-gray-700/40'}`}>

      {/* Label row */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-base">{LABEL_ICON[addr.label] || '📍'}</span>
        <span className="text-sm font-bold text-white">{addr.label}</span>
        {addr.isDefault && (
          <span className="text-[10px] bg-brand-600 text-white px-1.5 py-0.5 rounded-full font-medium">
            Default
          </span>
        )}
        {eligible !== null && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold
            ${eligible
              ? 'bg-green-900/50 text-green-400 border border-green-800/50'
              : 'bg-red-900/50 text-red-400 border border-red-800/50'}`}>
            {eligible ? '✅' : '❌'} {dist.toFixed(1)} km from store
          </span>
        )}
        {eligible === null && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-700 text-gray-500">
            📍 No GPS saved
          </span>
        )}
      </div>

      {/* Address text */}
      <p className="text-sm text-gray-200 leading-snug">
        {[addr.line1, addr.line2].filter(Boolean).join(', ')}
      </p>
      <p className="text-sm text-gray-300 mt-0.5 font-medium">
        {[addr.city, addr.pincode].filter(Boolean).join(' – ')}
      </p>
      {addr.landmark && (
        <p className="text-xs text-gray-500 mt-0.5">Near: {addr.landmark}</p>
      )}

      {/* GPS + Map section */}
      <div className="mt-3 space-y-2">
        {hasCoords ? (
          <div className="bg-gray-700/50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1">
              📡 GPS Coordinates
            </p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-gray-300">
                  {addr.lat.toFixed(6)}, {addr.lng.toFixed(6)}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Lat: {addr.lat.toFixed(6)} · Lng: {addr.lng.toFixed(6)}
                </p>
              </div>
              <a
                href={mapsUrlCoords}
                target="_blank" rel="noreferrer"
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700
                           text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                View on Map
              </a>
            </div>
          </div>
        ) : (
          <a
            href={mapsUrlSearch}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Search address on Maps ↗
            <span className="text-gray-600 text-[10px]">(no GPS saved)</span>
          </a>
        )}
      </div>
    </div>
  );
}

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
      <button onClick={() => setShow((v) => !v)} className="text-gray-600 hover:text-gray-400 flex-shrink-0 transition-colors">
        {show
          ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
          : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        }
      </button>
      {show && <span className="text-[9px] bg-green-900/40 text-green-500 px-1.5 py-0.5 rounded font-medium">bcrypt</span>}
    </div>
  );
}

// ─── User Detail Modal ────────────────────────────────────────────────────────

function UserDetailModal({ user, onClose }) {
  const [tab,        setTab]        = useState('profile');  // 'profile' | 'addresses' | 'orders'
  const [orders,     setOrders]     = useState([]);
  const [ordLoading, setOrdLoading] = useState(false);
  const [ordPage,    setOrdPage]    = useState(1);
  const [ordTotal,   setOrdTotal]   = useState(1);

  const initials = user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const defaultAddr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];

  const loadOrders = useCallback(async (pg) => {
    setOrdLoading(true);
    try {
      const r = await adminApi.getUserOrders(user.id, { page: pg, limit: 10 });
      setOrders(r.orders || []);
      setOrdTotal(r.totalPages || 1);
    } catch { /* silent */ }
    finally { setOrdLoading(false); }
  }, [user.id]);

  useEffect(() => {
    if (tab === 'orders' && orders.length === 0) loadOrders(1);
  }, [tab]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl z-10 max-h-[92vh] flex flex-col mx-0 sm:mx-4">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-700 to-brand-900 flex items-center
                          justify-center text-sm font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              {user.isVerified && (
                <span className="text-[9px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded-full flex-shrink-0">✓ Verified</span>
              )}
              {!user.isActive && (
                <span className="text-[9px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded-full flex-shrink-0">Disabled</span>
              )}
            </div>
            <p className="text-xs text-gray-500">{user.mobile} · {user.orderCount} orders · ₹{Math.round(user.totalSpent || 0)} spent</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-800 flex-shrink-0">
          {[
            { key: 'profile',   label: '👤 Profile'   },
            { key: 'addresses', label: `📍 Addresses (${user.addresses?.length || 0})` },
            { key: 'orders',    label: `📦 Orders (${user.orderCount})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2
                ${tab === key
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Profile Tab ── */}
          {tab === 'profile' && (
            <div className="p-4 space-y-4">

              {/* Contact info */}
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                  Contact Information
                </p>
                <div className="bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-700">
                  <InfoRow label="Full Name"  value={user.name} />
                  <InfoRow label="Mobile"     value={user.mobile} mono />
                  <InfoRow label="Email"      value={user.email || 'Not provided'} />
                  <InfoRow label="Auth Method">
                    <PasswordCell authType={user.authType} passwordHint={user.passwordHint} />
                  </InfoRow>
                  <InfoRow label="Verified"   value={user.isVerified ? '✓ Email Verified' : 'Not Verified'} />
                  <InfoRow label="Member Since" value={new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
                  <InfoRow label="Status"     value={user.isActive ? '🟢 Active' : '🔴 Disabled'} />
                </div>
              </div>

              {/* Order stats */}
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                  Purchase Summary
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-white">{user.orderCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Total Orders</p>
                  </div>
                  <div className="bg-gray-800 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-brand-400">
                      {user.totalSpent >= 1000 ? `₹${(user.totalSpent / 1000).toFixed(1)}K` : `₹${Math.round(user.totalSpent)}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Total Spent</p>
                  </div>
                </div>
              </div>

              {/* Primary address preview */}
              {defaultAddr && (
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                    Primary Address
                  </p>
                  <AddressCard addr={defaultAddr} />
                  {(user.addresses?.length || 0) > 1 && (
                    <button onClick={() => setTab('addresses')}
                      className="mt-2 w-full py-2 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors">
                      View all {user.addresses.length} addresses →
                    </button>
                  )}
                </div>
              )}
              {!defaultAddr && (
                <div className="bg-gray-800 rounded-2xl p-6 text-center">
                  <p className="text-2xl mb-2">📍</p>
                  <p className="text-xs text-gray-500">No saved addresses</p>
                </div>
              )}
            </div>
          )}

          {/* ── Addresses Tab ── */}
          {tab === 'addresses' && (
            <div className="p-4 space-y-3">
              {(user.addresses?.length || 0) === 0 ? (
                <div className="text-center py-14">
                  <p className="text-4xl mb-3">📍</p>
                  <p className="text-gray-400 text-sm">No saved addresses</p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-gray-500 px-1">
                    {user.addresses.length} saved address{user.addresses.length !== 1 ? 'es' : ''} · Default shown first
                  </p>
                  {user.addresses.map((addr, i) => (
                    <AddressCard key={addr.id} addr={addr} index={i + 1} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Orders Tab ── */}
          {tab === 'orders' && (
            <div className="p-4">
              {ordLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />)}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-14">
                  <p className="text-4xl mb-3">📦</p>
                  <p className="text-gray-400 text-sm">No orders yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.map((o) => {
                    const addr = o.address
                      ? (() => { try { return JSON.parse(o.address); } catch { return null; } })()
                      : null;
                    return (
                      <div key={o.id} className="bg-gray-800 rounded-xl px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white">#{o.orderNumber}</p>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CLR[o.status] || 'bg-gray-700 text-gray-400'}`}>
                                {o.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {' · '}{o.items?.length || 0} item{(o.items?.length || 0) !== 1 ? 's' : ''}
                              {' · '}{o.fulfillmentType === 'STORE_PICKUP' ? '🏪 Pickup' : '🚚 Delivery'}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-brand-400 flex-shrink-0">₹{o.total?.toFixed(0)}</p>
                        </div>

                        {/* Delivery address snapshot in order */}
                        {addr && (
                          <div className="bg-gray-700/50 rounded-xl px-3 py-2 space-y-1">
                            <p className="text-[10px] text-gray-500 font-medium">📦 Delivered to</p>
                            <p className="text-xs text-gray-300">
                              {[addr.line1, addr.line2, addr.city, addr.pincode].filter(Boolean).join(', ')}
                              {addr.landmark ? ` · Near ${addr.landmark}` : ''}
                            </p>
                            {/* GPS coords saved at order time */}
                            {(o.customerLat || o.customerLat === 0) && (
                              <div className="flex items-center justify-between pt-1">
                                <p className="text-[10px] font-mono text-gray-500">
                                  📡 {o.customerLat?.toFixed(5)}, {o.customerLng?.toFixed(5)}
                                </p>
                                <a
                                  href={`https://www.google.com/maps?q=${o.customerLat},${o.customerLng}`}
                                  target="_blank" rel="noreferrer"
                                  className="text-[10px] text-brand-400 hover:text-brand-300 font-semibold"
                                >
                                  Map ↗
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Pagination */}
                  {ordTotal > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button onClick={() => { const p = ordPage - 1; setOrdPage(p); loadOrders(p); }} disabled={ordPage === 1}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-800">
                        ← Prev
                      </button>
                      <span className="text-xs text-gray-500">Page {ordPage} of {ordTotal}</span>
                      <button onClick={() => { const p = ordPage + 1; setOrdPage(p); loadOrders(p); }} disabled={ordPage === ordTotal}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-800">
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── User Card (mobile) ───────────────────────────────────────────────────────

function UserCard({ user, onToggle, onViewDetails }) {
  const initials   = user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const defaultAddr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];

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
            {user.isVerified && <Tooltip text="Mobile verified"><span className="text-[10px] bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 cursor-help">✓</span></Tooltip>}
            {!user.isActive && <Tooltip text="Account is disabled — user cannot log in"><span className="text-[10px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 cursor-help">Disabled</span></Tooltip>}
          </div>
          <p className="text-xs text-gray-400">{user.mobile}</p>
          {user.email && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
        </div>
      </div>

      {/* Primary address mini preview */}
      {defaultAddr && (
        <div className="bg-gray-800 rounded-xl px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs">{LABEL_ICON[defaultAddr.label] || '📍'}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase">{defaultAddr.label}</span>
            {defaultAddr.lat != null && (
              <span className="text-[10px] text-green-500">📡</span>
            )}
          </div>
          <p className="text-xs text-gray-300 truncate">
            {[defaultAddr.line1, defaultAddr.city, defaultAddr.pincode].filter(Boolean).join(', ')}
          </p>
        </div>
      )}

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
          <p className="text-[10px] text-gray-500 mb-0.5">Addresses</p>
          <p className="text-sm font-bold text-gray-300">{user.addresses?.length || 0}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-gray-800">
        <Tooltip text="View full profile, orders & addresses" position="right">
          <button onClick={() => onViewDetails(user)}
            className="text-xs text-brand-500 font-semibold hover:text-brand-400 transition-colors">
            View Details →
          </button>
        </Tooltip>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{user.isActive ? 'Active' : 'Disabled'}</span>
          <Tooltip text={user.isActive ? 'Disable this account' : 'Re-enable this account'} position="left">
            <button onClick={() => onToggle(user)}
              className={`w-10 h-5 rounded-full transition-colors ${user.isActive ? 'bg-brand-600' : 'bg-gray-700'}`}>
              <div className={`w-4 h-4 mt-0.5 mx-0.5 bg-white rounded-full shadow transition-transform ${user.isActive ? 'translate-x-5' : ''}`} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop Table Row ────────────────────────────────────────────────────────

function UserRow({ user, index, onToggle, onViewDetails }) {
  const initials    = user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const defaultAddr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];

  return (
    <tr className={`border-b border-gray-800 hover:bg-gray-800/30 transition-colors ${!user.isActive ? 'opacity-60' : ''}`}>
      <td className="px-4 py-3 text-sm text-gray-500">{index}</td>

      {/* Customer */}
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
            {user.email && <p className="text-xs text-gray-500 truncate max-w-[150px]">{user.email}</p>}
          </div>
        </div>
      </td>

      {/* Mobile */}
      <td className="px-4 py-3 text-sm text-gray-300 font-mono">{user.mobile}</td>

      {/* Primary address */}
      <td className="px-4 py-3 max-w-[200px]">
        {defaultAddr ? (
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-xs">{LABEL_ICON[defaultAddr.label] || '📍'}</span>
              <span className="text-[10px] text-gray-500">{defaultAddr.label}</span>
              {defaultAddr.lat != null && <span className="text-[9px] text-green-500 ml-1">📡GPS</span>}
            </div>
            <p className="text-xs text-gray-300 truncate">
              {[defaultAddr.line1, defaultAddr.city].filter(Boolean).join(', ')}
            </p>
            <p className="text-[10px] text-gray-500">{defaultAddr.pincode}</p>
          </div>
        ) : (
          <span className="text-xs text-gray-600">No address</span>
        )}
      </td>

      {/* Address count */}
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-medium text-gray-300">{user.addresses?.length || 0}</span>
      </td>

      {/* Orders */}
      <td className="px-4 py-3 text-sm text-white text-center font-medium">{user.orderCount}</td>

      {/* Spent */}
      <td className="px-4 py-3 text-sm text-brand-500 font-bold">
        {user.totalSpent >= 1000 ? `₹${(user.totalSpent / 1000).toFixed(1)}K` : `₹${Math.round(user.totalSpent)}`}
      </td>

      {/* Joined */}
      <td className="px-4 py-3 text-xs text-gray-400">
        {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Tooltip text="View full profile, orders & addresses" position="top">
            <button onClick={() => onViewDetails(user)}
              className="text-xs text-brand-500 hover:text-brand-400 font-semibold transition-colors whitespace-nowrap">
              Details
            </button>
          </Tooltip>
          <Tooltip text={user.isActive ? 'Disable account' : 'Enable account'} position="top">
            <button onClick={() => onToggle(user)}
              className={`w-9 h-4 rounded-full transition-colors ${user.isActive ? 'bg-brand-600' : 'bg-gray-700'}`}>
              <div className={`w-3 h-3 mt-0.5 mx-0.5 bg-white rounded-full shadow transition-transform ${user.isActive ? 'translate-x-4' : ''}`} />
            </button>
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users,       setUsers]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [error,       setError]       = useState('');
  const [toast,       setToast]       = useState('');
  const [detailUser,  setDetailUser]  = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async (pg, q) => {
    setLoading(true); setError('');
    try {
      const r = await adminApi.getUsers({ page: pg, limit: 20, ...(q && { search: q }) });
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

  const handleSearch = (e) => { e.preventDefault(); setPage(1); load(1, search); };
  const handleClear  = () => { setSearch(''); setPage(1); load(1, ''); };

  const handleToggle = async (user) => {
    try {
      await adminApi.toggleUser(user.id);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
      // Also update the detail modal if it's open
      if (detailUser?.id === user.id) setDetailUser((d) => ({ ...d, isActive: !d.isActive }));
      showToast(`${!user.isActive ? '✅' : '🚫'} ${user.name} ${!user.isActive ? 'enabled' : 'disabled'}`);
    } catch (e) { showToast(`❌ ${e.message}`); }
  };

  const offset = (page - 1) * 20;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Users</h1>
            <p className="text-gray-400 text-sm">{total} registered customer{total !== 1 ? 's' : ''}</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
            <div className="flex-1 md:w-72 flex items-center bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 gap-2">
              <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, mobile or email…"
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

        {/* Error */}
        {error && <div className="bg-red-950/50 border border-red-800 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

        {/* Desktop table */}
        {!loading && users.length > 0 && (
          <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-2xl overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  {['#', 'Customer', 'Mobile', 'Primary Address', 'Addrs', 'Orders', 'Spent', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <UserRow key={user.id} user={user} index={offset + i + 1}
                    onToggle={handleToggle} onViewDetails={setDetailUser} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile cards */}
        {!loading && users.length > 0 && (
          <div className="md:hidden grid gap-3">
            {users.map((user) => (
              <UserCard key={user.id} user={user} onToggle={handleToggle} onViewDetails={setDetailUser} />
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

        {/* Empty */}
        {!loading && users.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-gray-400 font-medium">
              {search ? `No users found for "${search}"` : 'No registered users yet'}
            </p>
            {search && <button onClick={handleClear} className="mt-2 text-brand-500 text-sm font-semibold">Clear search</button>}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={() => { const p = page - 1; setPage(p); load(p, search); }} disabled={page === 1}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-700 text-gray-300
                         disabled:opacity-40 hover:bg-gray-800 transition-colors">← Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => { const p = page + 1; setPage(p); load(p, search); }} disabled={page === totalPages}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-700 text-gray-300
                         disabled:opacity-40 hover:bg-gray-800 transition-colors">Next →</button>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {detailUser && (
        <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} />
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
