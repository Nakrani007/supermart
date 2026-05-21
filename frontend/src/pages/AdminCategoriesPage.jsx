// Admin Categories Page — CRUD, visibility toggle, icon/image, sort order, AI content generation.

import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout.jsx';
import { adminApi } from '../api/admin.api.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(name) {
  return name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseTags(rawTags) {
  if (!rawTags) return [];
  try { return JSON.parse(rawTags); } catch { return []; }
}

// ── CategoryModal ─────────────────────────────────────────────────────────────

const BLANK = {
  name: '', nameHi: '', nameGu: '', slug: '', icon: '', imageUrl: '',
  isVisible: true, description: '', tags: '', metaTitle: '',
};

function CategoryModal({ category, onClose, onSave }) {
  const isEdit = !!category?.id;

  const [form, setForm]         = useState(category || BLANK);
  const [autoGen, setAutoGen]   = useState(false);
  const [preview, setPreview]   = useState(null);   // AI preview content
  const [previewing, setPrev]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleNameChange = (v) => {
    set('name', v);
    if (!isEdit) set('slug', toSlug(v));
  };

  // Show AI preview without saving
  const handlePreview = async () => {
    if (!form.name) { setError('Enter a category name first'); return; }
    setPrev(true); setError('');
    try {
      const r = await adminApi.previewCategoryAI({ name: form.name, slug: form.slug });
      setPreview(r.content);
    } catch (err) { setError(err.message || 'Preview failed'); }
    finally { setPrev(false); }
  };

  // Apply preview content into the form fields
  const applyPreview = () => {
    if (!preview) return;
    setForm((f) => ({
      ...f,
      slug:        preview.slug        || f.slug,
      description: preview.description || f.description,
      tags:        parseTags(preview.tags).join(', '),
      metaTitle:   preview.metaTitle   || f.metaTitle,
    }));
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      // Convert comma-separated tags string to JSON array before sending
      const tagsArray = form.tags
        ? JSON.stringify(form.tags.split(',').map((t) => t.trim()).filter(Boolean))
        : null;

      const payload = {
        ...form,
        tags:        tagsArray,
        autoGenerate: autoGen,
      };

      if (isEdit) await adminApi.updateCategory(category.id, payload);
      else        await adminApi.createCategory(payload);
      onSave();
    } catch (err) { setError(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl z-10
                      overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <h2 className="text-base font-bold text-white">{isEdit ? 'Edit Category' : 'Add Category'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">

          {/* ── Basic fields ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Name *</label>
              <input type="text" value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                           rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Slug *</label>
              <input type="text" value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                           rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
              <p className="text-[10px] text-gray-600 mt-0.5">URL-friendly key</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Icon (emoji)</label>
              <input type="text" value={form.icon} placeholder="🥦"
                onChange={(e) => set('icon', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                           rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Image URL</label>
              <input type="text" value={form.imageUrl}
                onChange={(e) => set('imageUrl', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                           rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Hindi Name</label>
              <input type="text" value={form.nameHi}
                onChange={(e) => set('nameHi', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                           rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Gujarati Name</label>
              <input type="text" value={form.nameGu}
                onChange={(e) => set('nameGu', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                           rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          {/* ── Visibility toggle ── */}
          <label className="flex items-center gap-3 cursor-pointer pt-1">
            <div onClick={() => set('isVisible', !form.isVisible)}
              className={`w-10 h-5 rounded-full transition-colors flex-shrink-0
                ${form.isVisible ? 'bg-brand-600' : 'bg-gray-700'}`}>
              <div className={`w-4 h-4 mt-0.5 mx-0.5 bg-white rounded-full shadow transition-transform
                ${form.isVisible ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-gray-300">Visible in navbar & category grid</span>
          </label>

          {/* ── SEO / AI section ── */}
          <div className="border-t border-gray-800 pt-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>✨</span> SEO Content
              </h3>

              {/* AI toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setAutoGen((v) => !v)}
                  className={`w-9 h-4.5 h-[18px] rounded-full transition-colors flex-shrink-0
                    ${autoGen ? 'bg-purple-600' : 'bg-gray-700'}`}>
                  <div className={`w-3.5 h-3.5 mt-[1px] mx-[1px] bg-white rounded-full shadow transition-transform
                    ${autoGen ? 'translate-x-[18px]' : ''}`} />
                </div>
                <span className="text-xs font-semibold text-purple-400">Auto-generate</span>
              </label>
            </div>

            {autoGen && (
              <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl p-3 mb-3 text-xs">
                <p className="text-purple-300 font-medium mb-2">
                  AI will generate description, tags & meta title when you save.
                  Preview first to review the content.
                </p>
                <button type="button" onClick={handlePreview} disabled={previewing}
                  className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50
                             text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                  {previewing
                    ? <><span className="animate-spin">⟳</span> Generating…</>
                    : <><span>✨</span> Preview AI Content</>}
                </button>

                {/* Preview result */}
                {preview && (
                  <div className="mt-3 space-y-2 bg-gray-900/60 rounded-xl p-3 border border-gray-700">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Slug</span>
                      <p className="text-gray-300 text-xs mt-0.5">{preview.slug}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Description</span>
                      <p className="text-gray-300 text-xs mt-0.5 leading-relaxed">{preview.description}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Tags</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parseTags(preview.tags).map((tag) => (
                          <span key={tag}
                            className="text-[10px] bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">Meta Title</span>
                      <p className="text-gray-300 text-xs mt-0.5">{preview.metaTitle}</p>
                    </div>
                    <button type="button" onClick={applyPreview}
                      className="w-full mt-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs
                                 font-bold rounded-lg transition-colors">
                      Apply to Form Fields
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Manual SEO fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">
                  Description
                </label>
                <textarea value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={3}
                  placeholder={autoGen ? 'Leave blank to auto-generate on save' : 'Category description for SEO...'}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                             rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">
                  Tags
                </label>
                <input type="text" value={form.tags}
                  onChange={(e) => set('tags', e.target.value)}
                  placeholder={autoGen ? 'Auto-generated' : 'fresh, organic, daily — comma separated'}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                             rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
                <p className="text-[10px] text-gray-600 mt-0.5">Comma-separated tags</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">
                  Meta Title
                </label>
                <input type="text" value={form.metaTitle}
                  onChange={(e) => set('metaTitle', e.target.value)}
                  placeholder={autoGen ? 'Auto-generated' : 'Fresh Vegetables — SuperMart'}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500
                             rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
              </div>
            </div>
          </div>

          {error && (
            <p className="bg-red-950/50 border border-red-800 rounded-xl px-3 py-2 text-red-400 text-sm">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-gray-900 pb-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm
                         font-semibold hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60
                         text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
              {saving ? <><span className="animate-spin">⟳</span> Saving…</> : isEdit ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [toast,      setToast]      = useState('');
  const [error,      setError]      = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.getCategories();
      // Normalise tags JSON string → comma-separated for display
      const cats = (r.categories || []).map((c) => ({
        ...c,
        tags: parseTags(c.tags).join(', '),
      }));
      setCategories(cats);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const move = async (index, dir) => {
    const arr = [...categories];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setCategories(arr);
    try { await adminApi.reorderCategories(arr.map((c) => c.id)); }
    catch { load(); }
  };

  const handleToggleVisible = async (cat) => {
    try {
      await adminApi.updateCategory(cat.id, { isVisible: !cat.isVisible });
      setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, isVisible: !c.isVisible } : c));
    } catch (e) { showToast(`❌ ${e.message}`); }
  };

  const handleDelete = async (id) => {
    try {
      await adminApi.deleteCategory(id);
      setDelConfirm(null);
      showToast('🗑️ Category deleted');
      load();
    } catch (e) { showToast(`❌ ${e.message}`); setDelConfirm(null); }
  };

  function parseTags(rawTags) {
    if (!rawTags) return [];
    try { return JSON.parse(rawTags); } catch { return []; }
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Categories</h1>
            <p className="text-gray-400 text-sm">{categories.length} categories · use ↑↓ to reorder</p>
          </div>
          <button onClick={() => setModal({})}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white
                       text-sm font-bold px-4 py-2.5 rounded-xl transition-colors">
            <span className="text-lg leading-none">+</span> Add Category
          </button>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Category list */}
        <div className="space-y-2">
          {loading
            ? [...Array(5)].map((_, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl h-16 animate-pulse" />
              ))
            : categories.map((cat, idx) => (
                <div key={cat.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3
                             flex items-center gap-3 group hover:border-gray-700 transition-colors">

                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button onClick={() => move(idx, -1)} disabled={idx === 0}
                      className="w-5 h-4 flex items-center justify-center text-gray-600
                                 hover:text-gray-300 disabled:opacity-20 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button onClick={() => move(idx, 1)} disabled={idx === categories.length - 1}
                      className="w-5 h-4 flex items-center justify-center text-gray-600
                                 hover:text-gray-300 disabled:opacity-20 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Icon/image */}
                  <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center
                                  flex-shrink-0 overflow-hidden">
                    {cat.imageUrl
                      ? <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                      : <span className="text-xl leading-none">{cat.icon || '📂'}</span>}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white truncate">{cat.name}</p>
                      {!cat.isVisible && (
                        <span className="text-[10px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">
                          Hidden
                        </span>
                      )}
                      {cat.description && (
                        <span className="text-[10px] bg-purple-950/50 text-purple-400 border border-purple-800/40
                                         px-1.5 py-0.5 rounded flex-shrink-0">
                          SEO ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {cat.slug} · {cat._count?.products || 0} products
                    </p>
                  </div>

                  {/* Visibility toggle */}
                  <button onClick={() => handleToggleVisible(cat)}
                    title={cat.isVisible ? 'Click to hide' : 'Click to show'}
                    className={`text-lg transition-colors flex-shrink-0
                      ${cat.isVisible ? 'text-green-400 hover:text-green-300' : 'text-gray-600 hover:text-gray-400'}`}>
                    {cat.isVisible ? '👁️' : '🙈'}
                  </button>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => setModal(cat)}
                      className="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200
                                 text-xs font-semibold rounded-lg transition-colors">
                      Edit
                    </button>
                    <button onClick={() => setDelConfirm(cat)}
                      className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-400
                                 text-xs font-semibold rounded-lg transition-colors">
                      Del
                    </button>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* Add / Edit modal */}
      {modal !== null && (
        <CategoryModal
          category={modal?.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); showToast('✅ Category saved'); load(); }}
        />
      )}

      {/* Delete confirmation */}
      {delConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setDelConfirm(null)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 z-10">
            <p className="text-white font-bold mb-2">Delete "{delConfirm.name}"?</p>
            <p className="text-gray-400 text-sm mb-5">Categories with products cannot be deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDelConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm font-semibold">
                Cancel
              </button>
              <button onClick={() => handleDelete(delConfirm.id)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold
                           transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 bg-gray-800 border border-gray-700 text-white
                        text-sm font-medium px-4 py-3 rounded-xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </AdminLayout>
  );
}
