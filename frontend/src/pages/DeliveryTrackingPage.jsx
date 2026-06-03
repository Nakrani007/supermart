// DeliveryTrackingPage.jsx
// Public page — no login required.
// Shows live delivery boy location on an OpenStreetMap (Leaflet, no API key).
// Polls the tracking API every 15 seconds for live updates.
// URL: /track/:orderId

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi } from '../api/orders.api.js';

// ─── Haversine (distance label only) ─────────────────────────────────────────

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, r = Math.PI / 180;
  const dL = (lat2 - lat1) * r, dG = (lng2 - lng1) * r;
  const a = Math.sin(dL / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Leaflet icon factory ─────────────────────────────────────────────────────

function makeIcon(emoji, bg) {
  if (!window.L) return null;
  return window.L.divIcon({
    html: `<div style="
      width:40px;height:40px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:${bg};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:18px;line-height:1">${emoji}</span>
    </div>`,
    iconSize:    [40, 40],
    iconAnchor:  [20, 40],
    popupAnchor: [0, -42],
    className:   '',
  });
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_LABEL = {
  PENDING:          { label: 'Order Placed',        color: 'bg-yellow-100 text-yellow-800', icon: '🕐' },
  CONFIRMED:        { label: 'Confirmed',            color: 'bg-blue-100 text-blue-800',    icon: '✅' },
  PACKING:          { label: 'Being Packed',         color: 'bg-purple-100 text-purple-800',icon: '📦' },
  PACKED:           { label: 'Packed',               color: 'bg-purple-100 text-purple-800',icon: '📦' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery 🛵',  color: 'bg-orange-100 text-orange-800',icon: '🛵' },
  DELIVERED:        { label: 'Delivered ✓',          color: 'bg-green-100 text-green-800',  icon: '✓'  },
  CANCELLED:        { label: 'Cancelled',            color: 'bg-red-100 text-red-800',      icon: '✕'  },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DeliveryTrackingPage() {
  const { orderId } = useParams();
  const navigate    = useNavigate();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const mapRef         = useRef(null);     // DOM div ref
  const mapInstance    = useRef(null);     // Leaflet map instance
  const markersRef     = useRef({});       // { store, customer, deliveryBoy }
  const polylineRef    = useRef(null);     // route line

  // ── Fetch tracking data ──────────────────────────────────────────────────────
  const fetchTracking = useCallback(async () => {
    try {
      const res  = await ordersApi.getTracking(orderId);
      setData(res);
      setLastUpdated(new Date());
      setError('');
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Could not load tracking info');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 15000);
    return () => clearInterval(interval);
  }, [fetchTracking]);

  // ── Initialize map once ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!data || !mapRef.current || mapInstance.current) return;
    if (!window.L) { return; }

    // Center on store as default; shift to delivery boy if available
    const center = data.deliveryBoy
      ? [data.deliveryBoy.lat, data.deliveryBoy.lng]
      : [data.store.lat, data.store.lng];

    const map = window.L.map(mapRef.current, { center, zoom: 14, zoomControl: true });

    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Store marker
    const storeMarker = window.L.marker([data.store.lat, data.store.lng], {
      icon: makeIcon('🏪', '#16a34a'),
    }).addTo(map).bindPopup(`<b>${data.store.name}</b><br>${data.store.address}`);
    markersRef.current.store = storeMarker;

    // Customer marker
    if (data.customer) {
      const custMarker = window.L.marker([data.customer.lat, data.customer.lng], {
        icon: makeIcon('🏠', '#2563eb'),
      }).addTo(map).bindPopup('<b>Your Location</b>');
      markersRef.current.customer = custMarker;
    }

    // Delivery boy marker
    if (data.deliveryBoy) {
      const riderMarker = window.L.marker([data.deliveryBoy.lat, data.deliveryBoy.lng], {
        icon: makeIcon('🛵', '#ea580c'),
      }).addTo(map).bindPopup('<b>Delivery Agent</b>');
      markersRef.current.deliveryBoy = riderMarker;
    }

    // Draw route line between store → delivery boy → customer
    updatePolyline(map);

    // Fit map to show all markers
    fitBounds(map, data);

    mapInstance.current = map;
  }, [data]);

  // ── Update delivery boy marker on each poll ──────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || !data?.deliveryBoy) return;
    const { lat, lng } = data.deliveryBoy;

    if (markersRef.current.deliveryBoy) {
      markersRef.current.deliveryBoy.setLatLng([lat, lng]);
    } else {
      markersRef.current.deliveryBoy = window.L.marker([lat, lng], {
        icon: makeIcon('🛵', '#ea580c'),
      }).addTo(mapInstance.current).bindPopup('<b>Delivery Agent</b>');
    }

    updatePolyline(mapInstance.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.deliveryBoy?.lat, data?.deliveryBoy?.lng]);

  function updatePolyline(map) {
    const points = [];
    if (data?.store)       points.push([data.store.lat, data.store.lng]);
    if (data?.deliveryBoy) points.push([data.deliveryBoy.lat, data.deliveryBoy.lng]);
    if (data?.customer)    points.push([data.customer.lat, data.customer.lng]);

    if (polylineRef.current) polylineRef.current.remove();
    if (points.length >= 2) {
      polylineRef.current = window.L.polyline(points, {
        color: '#ea580c', weight: 3, opacity: 0.7, dashArray: '8 6',
      }).addTo(map);
    }
  }

  function fitBounds(map, d) {
    const pts = [];
    if (d?.store)       pts.push([d.store.lat, d.store.lng]);
    if (d?.deliveryBoy) pts.push([d.deliveryBoy.lat, d.deliveryBoy.lng]);
    if (d?.customer)    pts.push([d.customer.lat, d.customer.lng]);
    if (pts.length > 1) {
      map.fitBounds(window.L.latLngBounds(pts).pad(0.15));
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────────
  const statusCfg = STATUS_LABEL[data?.status] || { label: data?.status, color: 'bg-gray-100 text-gray-800', icon: '?' };
  const distRemaining = data?.deliveryBoy && data?.customer
    ? haversineKm(data.deliveryBoy.lat, data.deliveryBoy.lng, data.customer.lat, data.customer.lng)
    : null;
  const lastUpdStr = data?.deliveryBoy?.updatedAt
    ? new Date(data.deliveryBoy.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Loading tracking…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="text-5xl">😕</div>
          <p className="text-lg font-bold text-gray-800">Tracking not available</p>
          <p className="text-sm text-gray-400">{error || 'Order not found'}</p>
          <button onClick={() => navigate('/')}
            className="px-6 py-2.5 bg-brand-600 text-white rounded-2xl text-sm font-bold">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 z-10 flex-shrink-0">
        <button onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-500">Tracking</p>
          <p className="text-sm font-bold text-white">#{data.orderNumber}</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusCfg.color}`}>
          {statusCfg.icon} {statusCfg.label}
        </span>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative min-h-[65vh]">
        <div ref={mapRef} className="absolute inset-0" />

        {/* Legend overlay */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur rounded-2xl px-3 py-2.5 shadow-lg text-xs space-y-1.5">
          <div className="flex items-center gap-2"><span>🏪</span><span className="text-gray-700 font-medium">SuperMart Store</span></div>
          {data.deliveryBoy && <div className="flex items-center gap-2"><span>🛵</span><span className="text-gray-700 font-medium">Delivery Agent</span></div>}
          {data.customer    && <div className="flex items-center gap-2"><span>🏠</span><span className="text-gray-700 font-medium">Your Location</span></div>}
        </div>

        {/* No tracking yet overlay */}
        {!data.deliveryBoy && data.status !== 'DELIVERED' && (
          <div className="absolute inset-0 flex items-center justify-center z-[999] pointer-events-none">
            <div className="bg-white/95 backdrop-blur rounded-2xl px-6 py-5 shadow-xl text-center max-w-xs mx-4">
              <div className="text-4xl mb-3">🛵</div>
              <p className="font-bold text-gray-800 text-sm">Tracking not started yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Live tracking will appear once the delivery agent is out for delivery.
              </p>
            </div>
          </div>
        )}

        {/* Delivered overlay */}
        {data.status === 'DELIVERED' && (
          <div className="absolute inset-0 flex items-center justify-center z-[999] pointer-events-none">
            <div className="bg-white/95 backdrop-blur rounded-2xl px-6 py-5 shadow-xl text-center max-w-xs mx-4">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-bold text-gray-800 text-sm">Order Delivered!</p>
              <p className="text-xs text-gray-400 mt-1">Your order has been successfully delivered.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Info card ── */}
      <div className="bg-white rounded-t-3xl shadow-xl px-4 py-5 flex-shrink-0 space-y-3">

        {/* Distance row */}
        {data.deliveryBoy && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-xl flex-shrink-0">
              🛵
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Delivery agent on the way</p>
              {distRemaining != null && (
                <p className="text-xs text-orange-600 font-semibold">
                  {distRemaining.toFixed(1)} km away from your location
                </p>
              )}
            </div>
            {lastUpdStr && (
              <div className="text-right">
                <p className="text-[10px] text-gray-400">Updated</p>
                <p className="text-[10px] font-semibold text-gray-600">{lastUpdStr}</p>
              </div>
            )}
          </div>
        )}

        {/* Store info */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-3 py-3">
          <span className="text-xl">🏪</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-gray-800">{data.store.name}</p>
            <p className="text-xs text-gray-500">{data.store.address}</p>
          </div>
          <a
            href={`https://www.google.com/maps?q=${data.store.lat},${data.store.lng}`}
            target="_blank" rel="noreferrer"
            className="text-xs text-brand-600 font-semibold hover:underline"
          >
            Navigate →
          </a>
        </div>

        {/* Auto-refresh note */}
        <p className="text-[10px] text-gray-400 text-center">
          Map refreshes automatically every 15 seconds
          {lastUpdated && ` · Last refreshed ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
        </p>
      </div>
    </div>
  );
}
