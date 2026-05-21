// Admin Slots Page — manage delivery time slots and delivery configuration.

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from './AdminLayout.jsx';
import { adminApi } from '../api/admin.api.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateInput = (d) => d.toISOString().slice(0, 10);
const today       = () => toDateInput(new Date());

function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h % 12) || 12).toString().padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ─── Slot Modal ───────────────────────────────────────────────────────────────

function SlotModal({ slot, defaultDate, onClose, onSave }) {
  const isEdit = !!slot?.id;
  const [form, setForm]   = useState(slot ? {
    date:      slot.date ? toDateInput(new Date(slot.date)) : defaultDate,
    startTime: slot.startTime || '',
    endTime:   slot.endTime   || '',
    capacity:  slot.capacity  ?? 20,
    isActive:  slot.isActive  !== false,
  } : {
    date: defaultDate, startTime: '', endTime: '', capacity: 20, isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startTime || !form.endTime) { setError('Start and end time are required'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) await adminApi.updateSlot(slot.id, form);
      else        await adminApi.createSlot(form);
      onSave();
    } catch (err) { setError(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl z-10 overflow-hidden mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-base font-bold text-white">{isEdit ? 'Edit Slot' : 'Add Delivery Slot'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Date *</label>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 [color-scheme:dark]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Start Time *</label>
              <input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">End Time *</label>
              <input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 [color-scheme:dark]" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Capacity (max orders)</label>
            <input type="number" value={form.capacity} min={1} max={500} onChange={(e) => set('capacity', Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => set('isActive', !form.isActive)}
              className={`w-10 h-5 rounded-full transition-colors ${form.isActive ? 'bg-brand-600' : 'bg-gray-700'}`}>
              <div className={`w-4 h-4 mt-0.5 mx-0.5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-gray-300">Slot available for booking</span>
          </label>

          {error && <p className="bg-red-950/50 border border-red-800 rounded-xl px-3 py-2 text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm font-semibold hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold transition-colors">
              {saving ? 'Saving…' : isEdit ? 'Update Slot' : 'Add Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Config Panel ─────────────────────────────────────────────────────────────

function DeliveryConfigPanel() {
  const [cfg, setCfg]       = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    adminApi.getDeliveryConfig().then((r) => setCfg(r.config || r)).catch(() => {});
  }, []);

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await adminApi.updateDeliveryConfig(cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (!cfg) return <div className="bg-gray-900 border border-gray-800 rounded-2xl h-40 animate-pulse" />;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">🚚 Delivery Configuration</h2>
        <button onClick={handleSave} disabled={saving}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${saved ? 'bg-green-700 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60'}`}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Config'}
        </button>
      </div>

      {/* Toggles */}
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { key: 'deliveryEnabled', label: 'Home Delivery', icon: '🏠', desc: 'Allow customers to choose home delivery' },
          { key: 'pickupEnabled',   label: 'Store Pickup',  icon: '🏪', desc: 'Allow customers to pick up in-store' },
        ].map(({ key, label, icon, desc }) => (
          <div key={key} className="flex items-start gap-3 bg-gray-800/50 rounded-xl p-3">
            <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-base flex-shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{label}</p>
                <button onClick={() => set(key, !cfg[key])}
                  className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${cfg[key] ? 'bg-brand-600' : 'bg-gray-700'}`}>
                  <div className={`w-4 h-4 mt-0.5 mx-0.5 bg-white rounded-full shadow transition-transform ${cfg[key] ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Text + number fields */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3">
          <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Earliest Delivery Message</label>
          <input value={cfg.earliestMsg} onChange={(e) => set('earliestMsg', e.target.value)}
            placeholder="Delivery in 2-4 hours"
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Delivery Fee (₹)</label>
          <input type="number" min={0} step={0.5} value={cfg.deliveryFee} onChange={(e) => set('deliveryFee', Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Free Delivery Above (₹)</label>
          <input type="number" min={0} step={1} value={cfg.freeDeliveryMin} onChange={(e) => set('freeDeliveryMin', Number(e.target.value))}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
          <p className="text-[10px] text-gray-600 mt-0.5">Set 0 to always charge delivery fee</p>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminSlotsPage() {
  const [selectedDate, setSelectedDate] = useState(today());
  const [slots, setSlots]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [modal, setModal]               = useState(null);      // null | {} | slot-object
  const [delConfirm, setDelConfirm]     = useState(null);
  const [toast, setToast]               = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async (date) => {
    setLoading(true);
    try {
      const r = await adminApi.getSlots({ from: date, to: date });
      setSlots(r.slots || []);
    } catch (e) { showToast(`❌ ${e.message}`); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(selectedDate); }, [selectedDate, load]);

  const handleDateChange = (d) => { setSelectedDate(d); };

  const shiftDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(toDateInput(d));
  };

  const handleDelete = async (id) => {
    try { await adminApi.deleteSlot(id); setDelConfirm(null); showToast('🗑️ Slot deleted'); load(selectedDate); }
    catch (e) { showToast(`❌ ${e.message}`); setDelConfirm(null); }
  };

  const handleToggleActive = async (slot) => {
    try {
      await adminApi.updateSlot(slot.id, { isActive: !slot.isActive });
      setSlots((prev) => prev.map((s) => s.id === slot.id ? { ...s, isActive: !slot.isActive } : s));
    } catch (e) { showToast(`❌ ${e.message}`); }
  };

  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const available = slots.filter((s) => s.isActive);
  const booked    = slots.reduce((acc, s) => acc + (s.booked || 0), 0);

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white">Delivery Slots</h1>
          <p className="text-gray-400 text-sm">Manage time slots and delivery configuration</p>
        </div>

        {/* Delivery Config Card */}
        <DeliveryConfigPanel />

        {/* Date Navigator */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-bold text-white">📅 Slot Calendar</h2>
            <button onClick={() => setModal({})}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
              <span>+</span> Add Slot
            </button>
          </div>

          {/* Date picker row */}
          <div className="flex items-center gap-2">
            <button onClick={() => shiftDate(-1)}
              className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors flex-shrink-0">
              ‹
            </button>
            <div className="flex-1">
              <input type="date" value={selectedDate} onChange={(e) => handleDateChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 [color-scheme:dark]" />
            </div>
            <button onClick={() => shiftDate(1)}
              className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors flex-shrink-0">
              ›
            </button>
            <button onClick={() => setSelectedDate(today())}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl transition-colors flex-shrink-0">
              Today
            </button>
          </div>

          {/* Date label + summary */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-gray-400 font-medium">{displayDate}</p>
            {!loading && slots.length > 0 && (
              <div className="flex gap-3 text-xs">
                <span className="text-green-400">{available.length} active slot{available.length !== 1 ? 's' : ''}</span>
                <span className="text-gray-500">{booked} orders booked</span>
              </div>
            )}
          </div>
        </div>

        {/* Slot List */}
        <div className="space-y-2">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl h-20 animate-pulse" />
            ))
          ) : slots.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
              <p className="text-3xl mb-2">🕐</p>
              <p className="text-gray-400 font-medium text-sm">No slots for this date</p>
              <button onClick={() => setModal({})}
                className="mt-3 text-brand-500 text-sm font-semibold hover:text-brand-600 transition-colors">
                + Add first slot
              </button>
            </div>
          ) : (
            slots
              .slice()
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((slot) => {
                const fill = slot.capacity > 0 ? Math.round((slot.booked / slot.capacity) * 100) : 0;
                const isFull = slot.booked >= slot.capacity;
                return (
                  <div key={slot.id}
                    className={`bg-gray-900 border rounded-2xl px-4 py-3 transition-colors ${slot.isActive ? 'border-gray-800' : 'border-gray-800/40 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      {/* Time */}
                      <div className="w-24 flex-shrink-0">
                        <p className="text-sm font-bold text-white">{fmt12(slot.startTime)}</p>
                        <p className="text-xs text-gray-500">– {fmt12(slot.endTime)}</p>
                      </div>

                      {/* Capacity bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400">{slot.booked} / {slot.capacity} orders</span>
                          {isFull && <span className="text-[10px] bg-red-900/50 text-red-400 px-1.5 py-0.5 rounded font-medium">Full</span>}
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${fill > 80 ? 'bg-red-500' : fill > 50 ? 'bg-yellow-500' : 'bg-brand-500'}`}
                            style={{ width: `${fill}%` }} />
                        </div>
                      </div>

                      {/* Toggle */}
                      <button onClick={() => handleToggleActive(slot)}
                        className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${slot.isActive ? 'bg-brand-600' : 'bg-gray-700'}`}>
                        <div className={`w-4 h-4 mt-0.5 mx-0.5 bg-white rounded-full shadow transition-transform ${slot.isActive ? 'translate-x-5' : ''}`} />
                      </button>

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setModal(slot)}
                          className="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold rounded-lg transition-colors">
                          Edit
                        </button>
                        <button onClick={() => setDelConfirm(slot)}
                          className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-400 text-xs font-semibold rounded-lg transition-colors">
                          Del
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Quick add for common slot patterns */}
        {!loading && slots.length === 0 && (
          <div className="bg-gray-900/50 border border-gray-800/50 border-dashed rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-3 text-center font-medium uppercase tracking-wide">Quick Add Common Slots</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Morning', start: '09:00', end: '11:00' },
                { label: 'Noon',    start: '11:00', end: '13:00' },
                { label: 'Evening', start: '17:00', end: '19:00' },
                { label: 'Night',   start: '19:00', end: '21:00' },
              ].map(({ label, start, end }) => (
                <button key={label}
                  onClick={async () => {
                    try {
                      await adminApi.createSlot({ date: selectedDate, startTime: start, endTime: end, capacity: 20, isActive: true });
                      load(selectedDate);
                      showToast(`✅ ${label} slot added`);
                    } catch (e) { showToast(`❌ ${e.message}`); }
                  }}
                  className="py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs text-gray-300 font-medium transition-colors">
                  {label}<br />
                  <span className="text-gray-500 font-normal">{fmt12(start)}–{fmt12(end)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Slot Modal */}
      {modal !== null && (
        <SlotModal
          slot={modal?.id ? modal : null}
          defaultDate={selectedDate}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); showToast('✅ Slot saved'); load(selectedDate); }}
        />
      )}

      {/* Delete confirm */}
      {delConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDelConfirm(null)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 z-10">
            <p className="text-white font-bold mb-1">Delete this slot?</p>
            <p className="text-gray-400 text-sm mb-1">
              {fmt12(delConfirm.startTime)} – {fmt12(delConfirm.endTime)}
            </p>
            {delConfirm.booked > 0 && (
              <p className="text-yellow-400 text-xs mb-3">⚠️ {delConfirm.booked} order{delConfirm.booked !== 1 ? 's' : ''} already booked in this slot</p>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setDelConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm font-semibold">Cancel</button>
              <button onClick={() => handleDelete(delConfirm.id)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 bg-gray-800 border border-gray-700 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </AdminLayout>
  );
}
