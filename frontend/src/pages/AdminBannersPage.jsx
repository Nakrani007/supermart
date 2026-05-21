// Admin Banners Page — manage hero carousel banners with preview, scheduling, CTA links.

import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout.jsx';
import { adminApi } from '../api/admin.api.js';

const BLANK = { title: '', subtitle: '', imageUrl: '', bgColor: '#16a34a', ctaText: 'Shop Now', ctaLink: '', isActive: true, startDate: '', endDate: '', sortOrder: 0 };

function BannerModal({ banner, onClose, onSave }) {
  const isEdit = !!banner?.id;
  const [form, setForm]     = useState(banner ? { ...banner, startDate: banner.startDate ? banner.startDate.slice(0, 10) : '', endDate: banner.endDate ? banner.endDate.slice(0, 10) : '' } : BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (isEdit) await adminApi.updateBanner(banner.id, form);
      else        await adminApi.createBanner(form);
      onSave();
    } catch (err) { setError(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl z-10 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-base font-bold text-white">{isEdit ? 'Edit Banner' : 'Add Banner'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Live preview */}
          <div className="rounded-xl p-4 text-white text-sm" style={{ backgroundColor: form.bgColor || '#16a34a' }}>
            <p className="font-bold text-base">{form.title || 'Banner Title'}</p>
            <p className="opacity-80 text-xs mt-0.5">{form.subtitle || 'Subtitle text'}</p>
            <button type="button" className="mt-2 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-lg">{form.ctaText || 'Shop Now'}</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Title *</label>
              <input value={form.title} onChange={(e) => set('title', e.target.value)} required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Subtitle</label>
              <input value={form.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Background Color</label>
              <div className="flex gap-2">
                <input type="color" value={form.bgColor} onChange={(e) => set('bgColor', e.target.value)}
                  className="w-10 h-9 rounded-lg cursor-pointer bg-transparent border border-gray-700" />
                <input value={form.bgColor} onChange={(e) => set('bgColor', e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">CTA Button Text</label>
              <input value={form.ctaText} onChange={(e) => set('ctaText', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">CTA Link</label>
              <input value={form.ctaLink || ''} onChange={(e) => set('ctaLink', e.target.value)} placeholder="/products?category=vegetables"
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Image URL (optional)</label>
              <input value={form.imageUrl || ''} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://..."
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Start Date</label>
              <input type="date" value={form.startDate || ''} onChange={(e) => set('startDate', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">End Date</label>
              <input type="date" value={form.endDate || ''} onChange={(e) => set('endDate', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} min={0}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => set('isActive', !form.isActive)}
              className={`w-10 h-5 rounded-full transition-colors ${form.isActive ? 'bg-brand-600' : 'bg-gray-700'}`}>
              <div className={`w-4 h-4 mt-0.5 mx-0.5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-gray-300">Active (visible to customers)</span>
          </label>

          {error && <p className="bg-red-950/50 border border-red-800 rounded-xl px-3 py-2 text-red-400 text-sm">{error}</p>}
        </form>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-800 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm font-semibold hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold transition-colors">
            {saving ? 'Saving…' : isEdit ? 'Update Banner' : 'Add Banner'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [toast, setToast]     = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try { const r = await adminApi.getBanners(); setBanners(r.banners || []); }
    catch (e) { showToast(`❌ ${e.message}`); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (banner) => {
    try {
      await adminApi.updateBanner(banner.id, { isActive: !banner.isActive });
      setBanners((prev) => prev.map((b) => b.id === banner.id ? { ...b, isActive: !banner.isActive } : b));
    } catch (e) { showToast(`❌ ${e.message}`); }
  };

  const handleDelete = async (id) => {
    try { await adminApi.deleteBanner(id); setDelConfirm(null); showToast('🗑️ Banner deleted'); load(); }
    catch (e) { showToast(`❌ ${e.message}`); setDelConfirm(null); }
  };

  const isLive = (b) => {
    if (!b.isActive) return false;
    const now = new Date();
    if (b.startDate && new Date(b.startDate) > now) return false;
    if (b.endDate   && new Date(b.endDate)   < now) return false;
    return true;
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Banners</h1>
            <p className="text-gray-400 text-sm">Manage hero carousel banners</p>
          </div>
          <button onClick={() => setModal({})} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            <span>+</span> Add Banner
          </button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-36 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />)}</div>
        ) : banners.length === 0 ? (
          <div className="text-center py-16"><p className="text-4xl mb-3">🎯</p><p className="text-gray-400">No banners yet. Add your first banner!</p></div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {banners.map((b) => (
              <div key={b.id} className={`bg-gray-900 border rounded-2xl overflow-hidden transition-colors ${isLive(b) ? 'border-brand-700' : 'border-gray-800'}`}>
                {/* Preview */}
                <div className="p-4 min-h-[80px] flex flex-col justify-between" style={{ backgroundColor: b.bgColor || '#16a34a' }}>
                  <div>
                    <p className="text-white font-bold text-sm">{b.title}</p>
                    {b.subtitle && <p className="text-white/70 text-xs mt-0.5">{b.subtitle}</p>}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-lg">{b.ctaText}</span>
                    {b.ctaLink && <span className="text-white/60 text-xs truncate max-w-[120px]">{b.ctaLink}</span>}
                  </div>
                </div>

                {/* Meta */}
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isLive(b) ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {isLive(b) ? '🟢 Live' : b.isActive ? '⏸ Scheduled' : '⚫ Inactive'}
                    </span>
                    <span className="text-xs text-gray-500">Order: {b.sortOrder}</span>
                    {b.startDate && <span className="text-xs text-gray-500">From {new Date(b.startDate).toLocaleDateString('en-IN')}</span>}
                    {b.endDate   && <span className="text-xs text-gray-500">Until {new Date(b.endDate).toLocaleDateString('en-IN')}</span>}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Active</span>
                      <button onClick={() => handleToggle(b)}
                        className={`w-9 h-4 rounded-full transition-colors ${b.isActive ? 'bg-brand-600' : 'bg-gray-700'}`}>
                        <div className={`w-3 h-3 mt-0.5 mx-0.5 bg-white rounded-full shadow transition-transform ${b.isActive ? 'translate-x-4' : ''}`} />
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setModal(b)} className="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold rounded-lg transition-colors">Edit</button>
                      <button onClick={() => setDelConfirm(b)} className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-400 text-xs font-semibold rounded-lg transition-colors">Del</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal !== null && <BannerModal banner={modal?.id ? modal : null} onClose={() => setModal(null)} onSave={() => { setModal(null); showToast('✅ Banner saved'); load(); }} />}

      {delConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDelConfirm(null)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 z-10">
            <p className="text-white font-bold mb-2">Delete "{delConfirm.title}"?</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setDelConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm font-semibold">Cancel</button>
              <button onClick={() => handleDelete(delConfirm.id)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-20 md:bottom-6 right-4 bg-gray-800 border border-gray-700 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl z-50">{toast}</div>}
    </AdminLayout>
  );
}
