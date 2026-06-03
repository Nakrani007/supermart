// DeliveryZoneCheck.jsx
// Shows delivery availability based on the customer's GPS location.
// Zone settings (radius, pincodes) are fetched live from the backend.
// Haversine distance runs client-side for instant feedback.

import { useState, useEffect } from 'react';
import { publicApi } from '../../api/admin.api.js';

// ─── Haversine ────────────────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R   = 6371;
  const rad = Math.PI / 180;
  const dL  = (lat2 - lat1) * rad;
  const dG  = (lng2 - lng1) * rad;
  const a   =
    Math.sin(dL / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Fallback zone used if API call fails
const DEFAULT_ZONE = {
  radiusKm:        5,
  allowedPincodes: [],
  storeLat:        21.2094,
  storeLng:        72.8261,
  storeArea:       'Kapodra, Surat',
};

/**
 * @param {{
 *   onResult: (result: { eligible: boolean|null, coords: {lat,lng}|null, distanceKm?: number }) => void
 *   pincode?: string   — if provided, pincode-whitelist check runs even without GPS
 * }} props
 */
export default function DeliveryZoneCheck({ onResult, pincode }) {
  // idle | checking | eligible | outside | denied | error
  const [status, setStatus]   = useState('idle');
  const [distanceKm, setDist] = useState(null);
  const [zone, setZone]       = useState(DEFAULT_ZONE);

  // Fetch zone settings once on mount
  useEffect(() => {
    publicApi.getDeliveryZone()
      .then((r) => { if (r?.zone) setZone(r.zone); })
      .catch(() => {}); // silently fall back to defaults
  }, []);

  // If pincode prop changes and is in the whitelist, mark eligible immediately
  useEffect(() => {
    if (!pincode || status !== 'idle') return;
    const pc = pincode.replace(/\s/g, '');
    if (zone.allowedPincodes.includes(pc)) {
      setStatus('eligible');
      onResult({ eligible: true, coords: null, pincodeMatch: true });
    }
  }, [pincode, zone.allowedPincodes, status, onResult]);

  const detect = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      onResult({ eligible: null, coords: null });
      return;
    }
    setStatus('checking');
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng } }) => {
        const dist = haversineKm(lat, lng, zone.storeLat, zone.storeLng);
        // Eligible if within radius OR pincode is whitelisted
        const pincodeOk = pincode
          ? zone.allowedPincodes.includes(pincode.replace(/\s/g, ''))
          : false;
        const eligible = dist <= zone.radiusKm || pincodeOk;
        setDist(dist);
        setStatus(eligible ? 'eligible' : 'outside');
        onResult({ eligible, coords: { lat, lng }, distanceKm: dist });
      },
      (err) => {
        // Even without GPS, allow if pincode is whitelisted
        const pincodeOk = pincode
          ? zone.allowedPincodes.includes(pincode.replace(/\s/g, ''))
          : false;
        if (pincodeOk) {
          setStatus('eligible');
          onResult({ eligible: true, coords: null, pincodeMatch: true });
          return;
        }
        setStatus(err.code === 1 /* PERMISSION_DENIED */ ? 'denied' : 'error');
        onResult({ eligible: null, coords: null });
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 space-y-3">

      {/* Store badge */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-lg flex-shrink-0">
          🏪
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">SuperMart · {zone.storeArea}</p>
          <p className="text-xs text-gray-500">Home delivery within {zone.radiusKm} km radius</p>
        </div>
      </div>

      {/* ── idle ── */}
      {status === 'idle' && (
        <button
          type="button"
          onClick={detect}
          className="w-full py-2.5 border-2 border-dashed border-brand-300 text-brand-600 text-sm
                     font-semibold rounded-xl hover:bg-brand-50 active:scale-95 transition-all
                     flex items-center justify-center gap-2"
        >
          <span className="text-base">📡</span>
          Check if we deliver to you
        </button>
      )}

      {/* ── checking ── */}
      {status === 'checking' && (
        <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-gray-500">
          <svg className="w-4 h-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Detecting your location…
        </div>
      )}

      {/* ── eligible ✅ ── */}
      {status === 'eligible' && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
          <span className="text-xl flex-shrink-0">✅</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-green-800">We deliver to you!</p>
            <p className="text-xs text-green-600">
              {distanceKm != null
                ? <>You're <span className="font-semibold">{distanceKm.toFixed(1)} km</span> from our {zone.storeArea} store</>
                : 'Your pincode is in our delivery area'}
            </p>
          </div>
          <button type="button" onClick={detect}
            className="text-xs text-green-600 hover:text-green-800 underline flex-shrink-0">
            Re-check
          </button>
        </div>
      )}

      {/* ── outside ❌ ── */}
      {status === 'outside' && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
          <span className="text-xl flex-shrink-0">❌</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-800">Outside delivery area</p>
            <p className="text-xs text-red-600">
              You're <span className="font-semibold">{distanceKm?.toFixed(1)} km</span> away —
              we deliver within {zone.radiusKm} km of {zone.storeArea}.
            </p>
            <p className="text-xs text-red-500 mt-1 font-medium">
              💡 Try <span className="underline">Store Pickup</span> — free & ready in 30 min.
            </p>
          </div>
          <button type="button" onClick={detect}
            className="text-xs text-red-500 hover:text-red-700 underline flex-shrink-0">
            Re-check
          </button>
        </div>
      )}

      {/* ── denied / error ⚠️ ── */}
      {(status === 'denied' || status === 'error') && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">
              {status === 'denied' ? 'Location access denied' : 'Could not detect location'}
            </p>
            <p className="text-xs text-amber-700">
              Please make sure your address is within {zone.radiusKm} km of {zone.storeArea}.
              Orders outside our delivery zone may be cancelled.
            </p>
            <button type="button" onClick={detect}
              className="text-xs text-amber-600 hover:text-amber-800 underline mt-1">
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
