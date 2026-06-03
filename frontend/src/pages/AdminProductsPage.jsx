// Admin Products Page — full CRUD for product catalog with label management.

import { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout            from './AdminLayout.jsx';
import { adminApi }           from '../api/admin.api.js';
import { useAdminStoreStore } from '../store/adminStoreStore.js';
import Tooltip                from '../components/common/Tooltip.jsx';

// ─── Image Picker (3 modes: URL / Upload / AI Generate) ──────────────────────

const IMG_TABS = [
  { key: 'url',    icon: '🔗', label: 'Live URL'   },
  { key: 'upload', icon: '📁', label: 'Upload'      },
  { key: 'ai',     icon: '✨', label: 'AI Generate' },
];

// src  = blob URL when available (for <img> display)
// href = always the original remote URL (for "Open in Tab" link + footer)
function ImageLightbox({ src, href, onClose }) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
      <div className="relative z-10 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <p className="text-sm font-semibold text-white">Image Preview</p>
            <div className="flex items-center gap-2">
              <a href={href} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in Tab
              </a>
              <button onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          {/* Image */}
          <div className="bg-[#111] flex items-center justify-center min-h-64 max-h-[70vh] p-4">
            <img src={src} alt="Full preview"
              className="max-w-full max-h-[65vh] object-contain rounded-lg"
              onError={(e) => { e.target.src = ''; e.target.alt = 'Image failed to load'; }} />
          </div>
          {/* URL footer — always shows the real remote URL */}
          <div className="px-4 py-2.5 border-t border-gray-800 bg-gray-950">
            <p className="text-[11px] text-gray-500 truncate font-mono">{href}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Convert a Pollinations URL to go through the Vite dev proxy — fixes CORS/Referer blocking.
// The original URL is always kept in form state (saved to DB); this is display-only.
const toImgSrc = (url) => {
  if (!url || !url.includes('image.pollinations.ai')) return url;
  return url.replace('https://image.pollinations.ai', '/pollinations-img');
};

function ImagePicker({ value, onChange }) {
  const [tab, setTab]         = useState('url');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt]   = useState('');
  const [dragOver, setDragOver]   = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [lightbox, setLightbox]   = useState(false);
  const fileRef = useRef(null);

  // ── URL tab ────────────────────────────────────────────────────────────────
  const UrlTab = () => (
    <input
      type="url"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="https://example.com/image.jpg"
      className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
    />
  );

  // ── Upload tab ─────────────────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return;
    setUploadErr('');
    if (!file.type.startsWith('image/')) { setUploadErr('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024)     { setUploadErr('File is too large (max 5 MB).'); return; }
    setUploading(true);
    try {
      const r = await adminApi.uploadImage(file);
      onChange(r.imageUrl);
    } catch (e) {
      setUploadErr(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const UploadTab = () => (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-brand-500 bg-brand-950/20' : 'border-gray-700 hover:border-gray-500'}`}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => handleFile(e.target.files[0])} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm">Uploading…</span>
          </div>
        ) : (
          <>
            <div className="text-3xl mb-1">📤</div>
            <p className="text-sm text-gray-300 font-medium">Click or drag & drop an image</p>
            <p className="text-xs text-gray-500 mt-0.5">JPG, PNG, WebP — max 5 MB</p>
          </>
        )}
      </div>
      {uploadErr && <p className="text-xs text-red-400 mt-1.5">{uploadErr}</p>}
    </div>
  );

  // ── AI Generate tab ────────────────────────────────────────────────────────
  // Uses Pollinations.ai — free, no API key required
  const handleGenerate = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) return;
    setGenerating(true);
    const encoded = encodeURIComponent(`${prompt}, product photography, white background, high quality, professional`);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&seed=${Date.now()}`;
    try {
      // Preload via Vite proxy — waits for generation, caches response for the <img> render
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload  = resolve;
        img.onerror = reject;
        img.src = toImgSrc(url);
      });
    } catch { /* generation failed — still set the URL so the user can see the error */ }
    finally {
      onChange(url);
      setGenerating(false);
    }
  };

  const AITab = () => (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="e.g. Amul butter 100g pack"
          className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                     rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-colors"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !aiPrompt.trim()}
          className="flex-shrink-0 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50
                     text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5"
        >
          {generating ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : '✨'}
          {generating ? 'Generating…' : 'Generate'}
        </button>
      </div>
      <p className="text-[11px] text-gray-500">Powered by Pollinations AI · Free · No API key needed</p>
    </div>
  );

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Image</label>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-2 bg-gray-800 p-1 rounded-xl w-fit">
        {IMG_TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${tab === t.key ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {tab === 'url'    && <UrlTab    />}
      {tab === 'upload' && <UploadTab />}
      {tab === 'ai'     && <AITab     />}

      {/* Preview */}
      {value && (
        <>
          <div className="mt-2 flex items-center gap-3 bg-gray-800/60 border border-gray-700 rounded-xl p-2">
            {/* Thumbnail — click to open lightbox */}
            <button type="button" onClick={() => setLightbox(true)}
              className="w-16 h-16 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0 border border-gray-700
                         hover:border-brand-500 transition-colors group relative">
              <img src={toImgSrc(value)} alt="preview"
                className="w-full h-full object-contain p-1"
                onError={(e) => { e.target.style.display = 'none'; }} />
              {/* hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity
                              flex items-center justify-center rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400 truncate font-mono">{value}</p>
              <div className="flex items-center gap-3 mt-1.5">
                {/* View button */}
                <button type="button" onClick={() => setLightbox(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-brand-500 hover:text-brand-600 transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View
                </button>
                <span className="text-gray-700 text-xs">·</span>
                {/* Remove button */}
                <button type="button" onClick={() => onChange('')}
                  className="flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Remove
                </button>
              </div>
            </div>
          </div>

          {/* Lightbox portal */}
          {lightbox && <ImageLightbox src={toImgSrc(value)} href={value} onClose={() => setLightbox(false)} />}
        </>
      )}
    </div>
  );
}

// ─── Label pills ──────────────────────────────────────────────────────────────
const LABELS = [
  { key: 'isBestSeller',  text: '⭐ Best Seller', cls: 'bg-yellow-900/50 text-yellow-400 border-yellow-700' },
  { key: 'isClearance',   text: '🔥 Clearance',   cls: 'bg-orange-900/50 text-orange-400 border-orange-700' },
  { key: 'isWeeklySaver', text: '💚 Weekly Saver', cls: 'bg-green-900/50 text-green-400 border-green-700'   },
];

function LabelPills({ product }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {LABELS.filter((l) => product[l.key]).map((l) => (
        <span key={l.key} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${l.cls}`}>{l.text}</span>
      ))}
    </div>
  );
}

// ─── Product Form Modal ───────────────────────────────────────────────────────

const BLANK = { name: '', sku: '', barcode: '', categoryId: '', mrp: '', discountPrice: '', stockQty: '', unit: 'piece', imageUrl: '', description: '', isActive: true, isBestSeller: false, isClearance: false, isWeeklySaver: false };

function ProductModal({ product, categories, storeId, onClose, onSave }) {
  const isEdit = !!product?.id;
  const [form, setForm]     = useState(() => {
    if (!product) return BLANK;
    const base = { ...product, categoryId: product.category?.id || product.categoryId || '' };
    // When editing within a store context, pre-fill pricing with store-specific values if available
    if (storeId) {
      if (product.storeMrp           != null) base.mrp           = product.storeMrp;
      if (product.storeDiscountPrice != null) base.discountPrice = product.storeDiscountPrice;
    }
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (isEdit) await adminApi.updateProduct(product.id, { ...form, storeId: storeId || undefined });
      else        await adminApi.createProduct(form);
      onSave();
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, type = 'text', extra = {}) => (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">{label}</label>
      <input type={type} value={form[key] ?? ''} onChange={(e) => set(key, e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 transition-colors"
        {...extra} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl z-10 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-base font-bold text-white">{isEdit ? 'Edit Product' : 'Add Product'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {field('Product Name *', 'name', 'text', { required: true, className: 'col-span-2 w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500' })}
            {field('SKU *', 'sku', 'text', { required: true })}
            {field('Barcode *', 'barcode', 'text', { required: true })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Category *</label>
            <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500">
              <option value="">Select category…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {storeId && isEdit && (
            <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl px-3 py-2 text-xs text-blue-300">
              Pricing changes will apply to this store only. Other stores keep their own prices.
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {field(storeId && isEdit ? 'MRP (₹) — Store' : 'MRP (₹) *', 'mrp', 'number', { min: 0, step: '0.01', required: true })}
            {field(storeId && isEdit ? 'Sale Price (₹) — Store' : 'Sale Price (₹) *', 'discountPrice', 'number', { min: 0, step: '0.01', required: true })}
            {field('Stock Qty', 'stockQty', 'number', { min: 0 })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Unit</label>
            <select value={form.unit} onChange={(e) => set('unit', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500">
              {['piece', 'kg', 'pack', 'litre', 'dozen', 'gram'].map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>

          <ImagePicker value={form.imageUrl || ''} onChange={(url) => set('imageUrl', url)} />

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Description</label>
            <textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} rows={2}
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-none" />
          </div>

          {/* Toggles row */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'isActive',     label: '✅ Visible on frontend' },
              { key: 'isBestSeller', label: '⭐ Best Seller'         },
              { key: 'isClearance',  label: '🔥 Clearance Item'      },
              { key: 'isWeeklySaver',label: '💚 Weekly Saver'        },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => set(key, !form[key])}
                  className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${form[key] ? 'bg-brand-600' : 'bg-gray-700'}`}>
                  <div className={`w-4 h-4 mt-0.5 mx-0.5 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm text-gray-300">{label}</span>
              </label>
            ))}
          </div>

          {error && <p className="bg-red-950/50 border border-red-800 rounded-xl px-3 py-2 text-red-400 text-sm">{error}</p>}
        </form>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-800 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm font-semibold hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold transition-colors">
            {saving ? 'Saving…' : isEdit ? 'Update Product' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const { selectedStore }         = useAdminStoreStore();
  const [products, setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal]         = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [error, setError]         = useState('');
  const [toast, setToast]         = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async (pg = 1) => {
    setLoading(true); setError('');
    try {
      const r = await adminApi.getProducts({
        page: pg, limit: 20,
        search:   search      || undefined,
        category: catFilter   || undefined,
        label:    labelFilter || undefined,
        status:   statusFilter || undefined,
        // Pass storeId so the API returns StoreProduct data (storeActive/storeStock)
        // for this specific store alongside the global product fields.
        storeId:  selectedStore?.id || undefined,
      });
      setProducts(r.products || []); setTotal(r.total || 0); setTotalPages(r.totalPages || 1);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [search, catFilter, labelFilter, statusFilter, selectedStore?.id]);

  useEffect(() => {
    adminApi.getCategories().then((r) => setCategories(r.categories || [])).catch(() => {});
  }, []);

  useEffect(() => { setPage(1); load(1); }, [load]);

  const handleDelete = async (id) => {
    try {
      const r = await adminApi.deleteProduct(id);
      showToast(r.deleted ? '🗑️ Product deleted' : '⚠️ Product disabled (has order history)');
      setDelConfirm(null);
      load(page);
    } catch (e) { showToast(`❌ ${e.message}`); }
  };

  const handleSave = () => { setModal(null); showToast('✅ Product saved'); load(page); };

  // ── Visibility toggle ─────────────────────────────────────────────────────
  // When a store is selected  → toggle StoreProduct.isActive for THAT STORE ONLY.
  //   This creates a StoreProduct record if one doesn't exist yet.
  // When global view (no store) → toggle the global Product.isActive field.
  const handleToggle = async (product) => {
    try {
      if (selectedStore) {
        // Store-scoped: use StoreProduct upsert so only this store is affected
        const currentActive = product.storeActive ?? true; // treat un-configured as active
        const currentStock  = product.storeStock  ?? product.stockQty ?? 0;
        await adminApi.upsertStoreProduct(product.id, {
          storeId:  selectedStore.id,
          isActive: !currentActive,
          stockQty: currentStock,
        });
        setProducts((prev) => prev.map((p) =>
          p.id === product.id ? { ...p, storeActive: !currentActive, configured: true } : p
        ));
        showToast(!currentActive ? '✅ Visible in this store' : '🔕 Hidden from this store only');
      } else {
        // Global: toggle Product.isActive (removes from ALL stores — warn in UI)
        await adminApi.updateProduct(product.id, { isActive: !product.isActive });
        setProducts((prev) => prev.map((p) =>
          p.id === product.id ? { ...p, isActive: !product.isActive } : p
        ));
      }
    } catch (e) { showToast(`❌ ${e.message}`); }
  };

  // Column headers change based on whether a store is selected
  const TABLE_HEADERS = ['Product', 'Category', 'MRP / Price',
    selectedStore ? 'Store Stock' : 'Stock',
    'Labels',
    selectedStore ? `Visible (${selectedStore.name.split(' ')[0]})` : 'Visible',
    'Actions',
  ];

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Products</h1>
            <p className="text-gray-400 text-sm">{total} total products</p>
          </div>
          <button onClick={() => setModal({})}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            <span className="text-base">+</span> Add Product
          </button>
        </div>

        {/* Store visibility scope banner */}
        {selectedStore && (
          <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl px-4 py-2.5 flex items-start gap-2.5">
            <span className="text-blue-400 text-base mt-0.5 flex-shrink-0">ℹ️</span>
            <div>
              <p className="text-blue-300 text-xs font-semibold">Store-scoped visibility active</p>
              <p className="text-blue-400/70 text-xs mt-0.5">
                The <span className="font-bold">Visible</span> toggle below only affects <span className="font-bold">{selectedStore.name}</span>.
                Toggling it will NOT change product visibility in other stores.
                Use <span className="font-bold">Global view</span> (All Stores) to remove a product from the entire catalog.
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, SKU, barcode…"
            className="flex-1 min-w-40 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
          <select value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500">
            <option value="">All Labels</option>
            <option value="bestSeller">⭐ Best Seller</option>
            <option value="clearance">🔥 Clearance</option>
            <option value="weeklySaver">💚 Weekly Saver</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {error && <div className="bg-red-950/50 border border-red-800 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  {TABLE_HEADERS.map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>)}
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-500">No products found</td></tr>
                ) : products.map((p) => {
                  // Determine which stock and visibility values to display
                  const displayStock   = selectedStore && p.storeStock  != null ? p.storeStock  : p.stockQty;
                  const displayVisible = selectedStore
                    ? (p.storeActive != null ? p.storeActive : true)  // null = not yet configured → treat as active
                    : p.isActive;
                  const isUnconfigured = selectedStore && !p.configured;

                  return (
                    <tr key={p.id} className={`border-b border-gray-800 hover:bg-gray-800/30 transition-colors ${!p.isActive ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {p.imageUrl ? <img src={toImgSrc(p.imageUrl)} alt="" className="w-full h-full object-contain p-0.5" /> : <span className="text-lg">📦</span>}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white truncate max-w-[140px]">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{p.category?.name}</td>
                      <td className="px-4 py-3">
                        {selectedStore && (p.storeMrp != null || p.storeDiscountPrice != null) ? (
                          <>
                            <p className="text-xs text-gray-500 line-through">₹{p.storeMrp ?? p.mrp}</p>
                            <p className="text-sm font-bold text-green-400">₹{p.storeDiscountPrice ?? p.discountPrice}</p>
                            <p className="text-[10px] text-blue-400 mt-0.5">store price</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500 line-through">₹{p.mrp}</p>
                            <p className="text-sm font-bold text-green-400">₹{p.discountPrice}</p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className={`text-sm font-bold ${displayStock === 0 ? 'text-red-400' : displayStock < 10 ? 'text-yellow-400' : 'text-gray-300'}`}>
                            {displayStock ?? '—'}
                          </span>
                          {selectedStore && p.storeStock == null && (
                            <p className="text-[9px] text-gray-600 mt-0.5">global</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3"><LabelPills product={p} /></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Tooltip
                            text={selectedStore
                              ? `Toggle visibility for ${selectedStore.name} only`
                              : 'Toggle global visibility (affects ALL stores)'}
                            position="left">
                            <button onClick={() => handleToggle(p)}
                              className={`w-10 h-5 rounded-full transition-colors
                                ${selectedStore
                                  ? (displayVisible ? 'bg-brand-600' : 'bg-gray-700')
                                  : (p.isActive    ? 'bg-brand-600' : 'bg-gray-700')
                                }`}>
                              <div className={`w-4 h-4 mt-0.5 mx-0.5 bg-white rounded-full shadow transition-transform ${displayVisible ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </Tooltip>
                          {isUnconfigured && (
                            <Tooltip text="No inventory record for this store — go to Inventory to configure" position="left">
                              <span className="text-[9px] text-yellow-500 leading-tight cursor-help">not set</span>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Tooltip text="Edit product details" position="top">
                            <button onClick={() => setModal(p)}
                              className="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold rounded-lg transition-colors">Edit</button>
                          </Tooltip>
                          <Tooltip text="Delete this product permanently" position="top">
                            <button onClick={() => setDelConfirm(p)}
                              className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-400 text-xs font-semibold rounded-lg transition-colors">Del</button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => { const p = page - 1; setPage(p); load(p); }} disabled={page === 1}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-800 transition-colors">← Prev</button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => { const p = page + 1; setPage(p); load(p); }} disabled={page === totalPages}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-800 transition-colors">Next →</button>
          </div>
        )}
      </div>

      {/* Product modal */}
      {modal !== null && (
        <ProductModal product={modal?.id ? modal : null} categories={categories} storeId={selectedStore?.id || null} onClose={() => setModal(null)} onSave={handleSave} />
      )}

      {/* Delete confirm */}
      {delConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDelConfirm(null)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 z-10">
            <p className="text-white font-bold text-base mb-2">Delete "{delConfirm.name}"?</p>
            <p className="text-gray-400 text-sm mb-5">This action cannot be undone. Products with order history will be disabled instead.</p>
            <div className="flex gap-3">
              <button onClick={() => setDelConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm font-semibold hover:bg-gray-800 transition-colors">Cancel</button>
              <button onClick={() => handleDelete(delConfirm.id)} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 bg-gray-800 border border-gray-700 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl z-50">{toast}</div>
      )}
    </AdminLayout>
  );
}
