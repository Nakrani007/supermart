// AdminStoresPage.jsx
// Manage physical store locations. Supports multiple stores.
// The "Main" store is used as the delivery zone origin.
// Leaflet map (window.L via CDN) lets admin drag-pin the exact location.

import { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from './AdminLayout.jsx';
import { adminApi } from '../api/admin.api.js';
import Tooltip from '../components/common/Tooltip.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h % 12) || 12).toString().padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

const EMPTY_FORM = {
  name: '', address: '', city: 'Surat', state: 'Gujarat', pincode: '',
  phone: '', email: '', lat: '', lng: '', openTime: '09:00', closeTime: '21:00',
  isActive: true, isMain: false,
};

// ─── Map Pin Picker ───────────────────────────────────────────────────────────

function MapPinPicker({ lat, lng, onConfirm, onClose }) {
  const divRef    = useRef(null);
  const mapRef    = useRef(null);
  const markerRef = useRef(null);
  const [pos, setPos] = useState(
    lat && lng ? { lat: Number(lat), lng: Number(lng) } : null
  );

  useEffect(() => {
    const L = window.L;
    if (!L || mapRef.current) return;

    const initLat = lat && lng ? Number(lat) : 21.2094;
    const initLng = lat && lng ? Number(lng) : 72.8261;

    const map = L.map(divRef.current, { zoomControl: true }).setView([initLat, initLng], 15);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Store marker (red)
    const storeIcon = L.divIcon({
      html: `<div style="width:28px;height:28px;background:#16a34a;border:3px solid #fff;
                          border-radius:50% 50% 50% 0;transform:rotate(-45deg);
                          box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
      iconSize: [28, 28], iconAnchor: [14, 28], className: '',
    });

    function placePin(latlng) {
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = L.marker(latlng, {
        draggable: true,
        icon: storeIcon,
      }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng();
        setPos({ lat: p.lat, lng: p.lng });
      });
      setPos({ lat: latlng.lat, lng: latlng.lng });
    }

    // Place initial pin if coords exist
    if (lat && lng) placePin(L.latLng(initLat, initLng));

    map.on('click', (e) => placePin(e.latlng));

    // Try to detect current location if no coords given
    if (!lat || !lng) {
      navigator.geolocation?.getCurrentPosition(
        ({ coords }) => {
          map.setView([coords.latitude, coords.longitude], 16);
          placePin(L.latLng(coords.latitude, coords.longitude));
        },
        () => {}
      );
    }

    return () => { map.remove(); mapRef.current = null; };
  }, []);// eslint-disable-line

  return (
    <div className="fixed inset-0 z-[60] flex flex-col">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex flex-col h-full max-h-[90vh] m-4 md:m-10 bg-gray-900 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0 z-10">
          <div>
            <h3 className="text-sm font-bold text-white">Pin Store Location</h3>
            <p className="text-xs text-gray-400">Tap the map or drag the pin to set the exact store location</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-gray-800">✕</button>
        </div>

        {/* Map */}
        <div ref={divRef} className="flex-1 min-h-0" />

        {/* Bottom bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-900 border-t border-gray-800 flex-shrink-0">
          {pos ? (
            <p className="text-xs font-mono text-gray-400">
              📍 {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
            </p>
          ) : (
            <p className="text-xs text-gray-500">Tap on the map to place the pin</p>
          )}
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-700 text-gray-300 text-sm font-semibold hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => pos && onConfirm(pos)}
              disabled={!pos}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-bold transition-colors">
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Store Form Modal ─────────────────────────────────────────────────────────

function StoreModal({ store, onClose, onSave }) {
  const isEdit = !!store?.id;
  const [form, setForm]       = useState(store ? {
    name:      store.name      || '',
    address:   store.address   || '',
    city:      store.city      || 'Surat',
    state:     store.state     || 'Gujarat',
    pincode:   store.pincode   || '',
    phone:     store.phone     || '',
    email:     store.email     || '',
    lat:       store.lat       ?? '',
    lng:       store.lng       ?? '',
    openTime:  store.openTime  || '09:00',
    closeTime: store.closeTime || '21:00',
    isActive:  store.isActive  !== false,
    isMain:    store.isMain    || false,
  } : { ...EMPTY_FORM });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [showMap, setShowMap] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())    { setError('Store name is required'); return; }
    if (!form.address.trim()) { setError('Address is required'); return; }
    if (!form.pincode.trim()) { setError('Pincode is required'); return; }

    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        lat: form.lat !== '' ? Number(form.lat) : null,
        lng: form.lng !== '' ? Number(form.lng) : null,
      };
      if (isEdit) await adminApi.updateStore(store.id, payload);
      else        await adminApi.createStore(payload);
      onSave();
    } catch (err) { setError(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl z-10 overflow-hidden mx-4 max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
            <h2 className="text-base font-bold text-white">{isEdit ? 'Edit Store' : 'Add New Store'}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto flex-1">

            {/* Store name */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Store Name *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. SuperMart Kapodra" className={inputCls} />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Full Address *</label>
              <textarea value={form.address} onChange={(e) => set('address', e.target.value)}
                placeholder="Building, Street, Area" rows={2}
                className={`${inputCls} resize-none`} />
            </div>

            {/* City / State / Pincode */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">City *</label>
                <input value={form.city} onChange={(e) => set('city', e.target.value)}
                  placeholder="Surat" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">State</label>
                <input value={form.state} onChange={(e) => set('state', e.target.value)}
                  placeholder="Gujarat" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Pincode *</label>
                <input value={form.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="395001" inputMode="numeric" className={inputCls} />
              </div>
            </div>

            {/* Phone / Email */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Phone</label>
                <input value={form.phone} onChange={(e) => set('phone', e.target.value)}
                  placeholder="+91 98765 43210" inputMode="tel" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Email</label>
                <input value={form.email} onChange={(e) => set('email', e.target.value)}
                  placeholder="store@supermart.in" type="email" className={inputCls} />
              </div>
            </div>

            {/* Opening Hours */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Opens At</label>
                <input type="time" value={form.openTime} onChange={(e) => set('openTime', e.target.value)}
                  className={`${inputCls} [color-scheme:dark]`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Closes At</label>
                <input type="time" value={form.closeTime} onChange={(e) => set('closeTime', e.target.value)}
                  className={`${inputCls} [color-scheme:dark]`} />
              </div>
            </div>

            {/* GPS Location */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">GPS Location</label>
                <button type="button" onClick={() => setShowMap(true)}
                  className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
                  <span>📍</span> {form.lat && form.lng ? 'Change pin on map' : 'Set on map'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number" step="0.000001" value={form.lat}
                  onChange={(e) => set('lat', e.target.value)}
                  placeholder="Latitude (21.2094)"
                  className={inputCls}
                />
                <input
                  type="number" step="0.000001" value={form.lng}
                  onChange={(e) => set('lng', e.target.value)}
                  placeholder="Longitude (72.8261)"
                  className={inputCls}
                />
              </div>
              {form.lat && form.lng && (
                <a
                  href={`https://www.google.com/maps?q=${form.lat},${form.lng}`}
                  target="_blank" rel="noreferrer"
                  className="text-[11px] text-brand-400 hover:text-brand-300 mt-1 flex items-center gap-1"
                >
                  🗺 View on Google Maps ↗
                </a>
              )}
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              {[
                { key: 'isActive', label: 'Store is active', desc: 'Show this store to customers' },
                { key: 'isMain',   label: 'Set as Main Store', desc: 'Used as delivery zone origin — only one store can be main' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between bg-gray-800/60 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-[11px] text-gray-500">{desc}</p>
                  </div>
                  <button type="button" onClick={() => set(key, !form[key])}
                    className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ml-3 ${form[key] ? 'bg-brand-600' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 mt-0.5 mx-0.5 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              ))}
            </div>

            {error && (
              <p className="bg-red-950/50 border border-red-800 rounded-xl px-3 py-2 text-red-400 text-sm">
                {error}
              </p>
            )}
          </form>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-4 border-t border-gray-800 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm font-semibold hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold transition-colors">
              {saving ? 'Saving…' : isEdit ? 'Update Store' : 'Add Store'}
            </button>
          </div>
        </div>
      </div>

      {/* Map picker overlay */}
      {showMap && (
        <MapPinPicker
          lat={form.lat}
          lng={form.lng}
          onConfirm={(pos) => {
            set('lat', pos.lat.toFixed(6));
            set('lng', pos.lng.toFixed(6));
            setShowMap(false);
          }}
          onClose={() => setShowMap(false)}
        />
      )}
    </>
  );
}

// ─── Store Card ───────────────────────────────────────────────────────────────

function StoreCard({ store, onEdit, onDelete, onSetMain }) {
  const [showDel, setShowDel] = useState(false);

  return (
    <div className={`bg-gray-900 border rounded-2xl overflow-hidden transition-all
      ${store.isMain ? 'border-brand-600' : 'border-gray-800'}`}>

      {/* Card header */}
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0
            ${store.isMain ? 'bg-brand-900' : 'bg-gray-800'}`}>
            🏪
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white truncate">{store.name}</h3>
              {store.isMain && (
                <span className="text-[10px] font-bold text-brand-400 bg-brand-950 border border-brand-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  ⭐ Main
                </span>
              )}
              {!store.isActive && (
                <span className="text-[10px] font-bold text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
              {store.address}, {store.city} – {store.pincode}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Tooltip text="Edit store details, hours & GPS location" position="top">
            <button onClick={() => onEdit(store)}
              className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg transition-colors">
              Edit
            </button>
          </Tooltip>
          <Tooltip text="Delete this store permanently" position="top">
            <button onClick={() => setShowDel(true)}
              className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-400 text-xs font-semibold rounded-lg transition-colors">
              Del
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Details */}
      <div className="px-4 pb-3 space-y-1.5">
        {/* Hours */}
        {(store.openTime || store.closeTime) && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>🕐</span>
            <span>{fmt12(store.openTime)} – {fmt12(store.closeTime)}</span>
          </div>
        )}

        {/* Phone / Email */}
        <div className="flex flex-wrap items-center gap-3">
          {store.phone && (
            <a href={`tel:${store.phone}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
              <span>📞</span> {store.phone}
            </a>
          )}
          {store.email && (
            <a href={`mailto:${store.email}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
              <span>📧</span> {store.email}
            </a>
          )}
        </div>

        {/* GPS + actions row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            {store.lat != null && store.lng != null ? (
              <a
                href={`https://www.google.com/maps?q=${store.lat},${store.lng}`}
                target="_blank" rel="noreferrer"
                className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
              >
                📍 View on Maps ↗
              </a>
            ) : (
              <span className="text-[11px] text-gray-600 italic">No GPS set</span>
            )}
          </div>

          {!store.isMain && (
            <Tooltip text="Set as the primary store used for delivery zone calculations" position="left">
              <button onClick={() => onSetMain(store.id)}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-950/40 hover:bg-amber-950/60 px-2.5 py-1 rounded-full transition-colors">
                ⭐ Set as Main
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {showDel && (
        <div className="px-4 py-3 bg-red-950/30 border-t border-red-900/50">
          <p className="text-sm font-bold text-red-300 mb-1">Delete this store?</p>
          {store.isMain && (
            <p className="text-xs text-red-400 mb-2">⚠ Set another store as main first</p>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowDel(false)}
              className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-300 text-xs font-semibold hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => { setShowDel(false); onDelete(store.id); }}
              disabled={store.isMain}
              className="flex-1 py-2 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-xs font-bold transition-colors">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminStoresPage() {
  const [stores,  setStores]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);   // null | {} | store-object
  const [toast,   setToast]   = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.getStores();
      setStores(r.stores || []);
    } catch (e) { showToast(`❌ ${e.message}`); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await adminApi.deleteStore(id); showToast('🗑️ Store deleted'); load(); }
    catch (e) { showToast(`❌ ${e.message}`); }
  };

  const handleSetMain = async (id) => {
    try { await adminApi.setMainStore(id); showToast('⭐ Main store updated'); load(); }
    catch (e) { showToast(`❌ ${e.message}`); }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Store Locations</h1>
            <p className="text-gray-400 text-sm">
              Manage your physical stores. The <span className="text-brand-400 font-semibold">Main</span> store is used as the delivery zone origin.
            </p>
          </div>
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            <span className="text-base leading-none">＋</span> Add Store
          </button>
        </div>

        {/* Info banner (shown when no stores) */}
        {!loading && stores.length === 0 && (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl px-6 py-12 text-center">
            <p className="text-4xl mb-3">🏪</p>
            <p className="text-white font-bold mb-1">No stores yet</p>
            <p className="text-gray-400 text-sm mb-4">
              Add your first store to enable delivery zone calculations and let customers find you.
            </p>
            <button
              onClick={() => setModal({})}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              + Add First Store
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl h-44 animate-pulse" />
            ))}
          </div>
        )}

        {/* Stores grid */}
        {!loading && stores.length > 0 && (
          <>
            {/* Stats row */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2">
                <span className="text-xs text-gray-400">Total stores</span>
                <span className="text-sm font-bold text-white">{stores.length}</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2">
                <span className="text-xs text-gray-400">Active</span>
                <span className="text-sm font-bold text-green-400">{stores.filter((s) => s.isActive).length}</span>
              </div>
              {stores.find((s) => s.isMain) && (
                <div className="flex items-center gap-2 bg-gray-900 border border-brand-800 rounded-xl px-3 py-2">
                  <span className="text-xs text-gray-400">Main store</span>
                  <span className="text-sm font-bold text-brand-400">{stores.find((s) => s.isMain)?.name}</span>
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {stores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  onEdit={(s) => setModal(s)}
                  onDelete={handleDelete}
                  onSetMain={handleSetMain}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal !== null && (
        <StoreModal
          store={modal?.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={() => {
            setModal(null);
            showToast(`✅ Store ${modal?.id ? 'updated' : 'added'}`);
            load();
          }}
        />
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
