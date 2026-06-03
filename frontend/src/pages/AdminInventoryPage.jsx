// Admin Inventory Page — per-store stock management.
// Select a store from the top-level AdminLayout store selector,
// then view/edit each product's availability and stock quantity for that store.
// URL: /admin/inventory

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate }        from 'react-router-dom';
import AdminLayout            from './AdminLayout.jsx';
import { adminApi }           from '../api/admin.api.js';
import { useAdminStoreStore } from '../store/adminStoreStore.js';
import Tooltip                from '../components/common/Tooltip.jsx';

// ─── Stock Editor (inline) ────────────────────────────────────────────────────

function StockEditor({ item, storeId, onSaved }) {
  const [qty,      setQty]      = useState(String(item.storeStock ?? item.globalStock ?? 0));
  const [active,   setActive]   = useState(item.storeActive ?? true);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const inputRef = useRef(null);

  // Keep in sync if parent data changes
  useEffect(() => {
    setQty(String(item.storeStock ?? item.globalStock ?? 0));
    setActive(item.storeActive ?? true);
  }, [item.id, item.storeStock, item.storeActive]); // eslint-disable-line

  const save = async () => {
    const qtyNum = parseInt(qty, 10);
    if (isNaN(qtyNum) || qtyNum < 0) { setMsg('Invalid qty'); return; }
    setSaving(true); setMsg('');
    try {
      await adminApi.upsertStoreProduct(item.id, { storeId, stockQty: qtyNum, isActive: active });
      setMsg('✓ Saved');
      onSaved(item.id, { storeStock: qtyNum, storeActive: active, configured: true });
      setTimeout(() => setMsg(''), 1500);
    } catch (e) {
      setMsg('✗ ' + (e.message || 'Failed'));
    } finally {
      setSaving(false);
    }
  };

  const dirty = parseInt(qty, 10) !== (item.storeStock ?? item.globalStock ?? 0)
             || active !== (item.storeActive ?? true);

  return (
    <div className="flex items-center gap-2">
      {/* Active toggle */}
      <Tooltip text={active ? 'Active — click to deactivate' : 'Inactive — click to activate'} position="top">
        <button
          onClick={() => setActive((v) => !v)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 transition-colors
            ${active ? 'bg-green-900/60 text-green-400 hover:bg-green-900' : 'bg-red-900/30 text-red-400/60 hover:bg-red-900/50'}`}>
          {active ? '✓' : '✗'}
        </button>
      </Tooltip>

      {/* Qty input */}
      <div className="flex items-center bg-gray-800 rounded-xl overflow-hidden border border-gray-700 focus-within:border-brand-600 transition-colors">
        <Tooltip text="Decrease stock by 1" position="bottom">
          <button
            onClick={() => setQty((v) => String(Math.max(0, parseInt(v || '0', 10) - 1)))}
            className="px-2 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 text-sm font-bold transition-colors">
            −
          </button>
        </Tooltip>
        <input
          ref={inputRef}
          type="number" min="0" value={qty}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="w-12 text-center text-sm font-semibold text-white bg-transparent outline-none py-1"
        />
        <Tooltip text="Increase stock by 1" position="bottom">
          <button
            onClick={() => setQty((v) => String(parseInt(v || '0', 10) + 1))}
            className="px-2 py-1.5 text-gray-400 hover:text-white hover:bg-gray-700 text-sm font-bold transition-colors">
            +
          </button>
        </Tooltip>
      </div>

      {/* Save button (only when changed) */}
      {dirty && (
        <Tooltip text="Save stock changes (or press Enter)" position="top">
          <button
            onClick={save} disabled={saving}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white
                       disabled:opacity-60 transition-colors active:scale-95 flex-shrink-0">
            {saving ? '…' : 'Save'}
          </button>
        </Tooltip>
      )}

      {/* Feedback */}
      {msg && (
        <span className={`text-xs font-semibold flex-shrink-0 ${msg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
          {msg}
        </span>
      )}
    </div>
  );
}

// ─── Product Row ──────────────────────────────────────────────────────────────

function ProductRow({ item, storeId, onSaved }) {
  const stockQty = item.storeStock ?? item.globalStock ?? 0;
  const lowStock = stockQty > 0 && stockQty < 5;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-800 transition-colors
      ${!(item.storeActive ?? true) ? 'opacity-50' : ''}`}>

      {/* Image */}
      <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
        {item.imageUrl
          ? <img src={item.imageUrl} alt="" className="w-full h-full object-contain p-0.5" />
          : <span className="text-xl">📦</span>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-white truncate">{item.name}</p>
          {!item.configured && (
            <Tooltip text="No stock record exists for this store yet. Set a quantity to configure it." position="top">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-900/60 text-yellow-400 whitespace-nowrap cursor-help">
                Not Configured
              </span>
            </Tooltip>
          )}
          {lowStock && (
            <Tooltip text={`Only ${stockQty} units left — restock soon`} position="top">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-900/60 text-orange-400 whitespace-nowrap cursor-help">
                Low Stock
              </span>
            </Tooltip>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {item.unit}
          {item.category?.name && ` · ${item.category.name}`}
          {item.configured && (
            <span className="ml-1 text-gray-600">
              · Global: {item.globalStock ?? 0}
            </span>
          )}
        </p>
      </div>

      {/* Stock Editor */}
      {storeId ? (
        <StockEditor item={item} storeId={storeId} onSaved={onSaved} />
      ) : (
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-white">{item.globalStock ?? 0}</p>
          <p className="text-[10px] text-gray-500">Global stock</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminInventoryPage() {
  const navigate = useNavigate();
  const { selectedStore } = useAdminStoreStore();

  const [items,      setItems]      = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [categories, setCategories] = useState([]);
  const [catFilter,  setCatFilter]  = useState('');

  // Load categories once
  useEffect(() => {
    adminApi.getCategories()
      .then((r) => setCategories(r.categories || r || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async (pg, q, cat) => {
    if (!selectedStore) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const params = { page: pg, limit: 30, storeId: selectedStore.id };
      if (q)   params.search   = q;
      if (cat) params.category = cat;
      const r = await adminApi.getStoreInventory(params);
      setItems(r.products || r.items || []);
      setTotal(r.total || 0);
      setTotalPages(r.totalPages || 1);
    } catch (e) {
      setError(e.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [selectedStore]);

  useEffect(() => {
    setPage(1);
    load(1, search, catFilter);
  }, [selectedStore?.id, load]); // eslint-disable-line

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, search, catFilter);
  };

  const handleCat = (slug) => {
    setCatFilter(slug);
    setPage(1);
    load(1, search, slug);
  };

  const handleSaved = (productId, updates) => {
    setItems((prev) =>
      prev.map((item) => item.id === productId ? { ...item, ...updates } : item)
    );
  };

  const unconfigured = items.filter((i) => !i.configured).length;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-950">

        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 pt-4 pb-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 mb-3">
            <div>
              <h1 className="text-lg font-bold text-white">Inventory</h1>
              <p className="text-xs text-gray-400">
                {selectedStore
                  ? `Stock levels for ${selectedStore.name}`
                  : 'Select a store to manage per-store inventory'}
              </p>
            </div>
            <Tooltip text="Refresh inventory list" position="left" className="ml-auto">
              <button onClick={() => load(page, search, catFilter)}
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
                placeholder="Search products..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none" />
            </div>
            <button type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-colors">
              Search
            </button>
          </form>
        </div>

        {/* No store selected — call to action */}
        {!selectedStore && (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="text-5xl mb-4">🏪</div>
            <p className="text-white font-bold text-lg mb-2">No Store Selected</p>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">
              Use the store selector at the top of the sidebar to choose a store, then manage its inventory here.
            </p>
            <button onClick={() => navigate('/admin/stores')}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">
              Manage Stores →
            </button>
          </div>
        )}

        {selectedStore && (
          <>
            {/* Category filter chips */}
            {categories.length > 0 && (
              <div className="bg-gray-900/50 border-b border-gray-800/50 px-4 py-2 overflow-x-auto no-scrollbar">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCat('')}
                    className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors
                      ${!catFilter ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                    All Categories
                  </button>
                  {categories.map((c) => (
                    <button key={c.id} onClick={() => handleCat(c.slug)}
                      className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap
                        ${catFilter === c.slug ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stats bar */}
            {!loading && items.length > 0 && (
              <div className="px-4 py-2 bg-gray-900/30 flex items-center gap-4 text-xs text-gray-500 border-b border-gray-800/50 flex-wrap">
                <span>Showing {items.length} of {total}</span>
                {unconfigured > 0 && (
                  <Tooltip text="These products have no stock record for this store. Add a quantity to activate them." position="right">
                    <span className="text-yellow-500 font-semibold cursor-help">⚠ {unconfigured} not configured for this store</span>
                  </Tooltip>
                )}
                <span className="ml-auto text-gray-600">
                  Editing: <span className="text-brand-400 font-semibold">{selectedStore.name}</span>
                </span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mx-4 mt-4 bg-red-950/50 border border-red-800 rounded-xl p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Column headers (desktop) */}
            <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-gray-800/50">
              <div className="w-10 flex-shrink-0" />
              <div className="flex-1 text-[10px] font-bold text-gray-600 uppercase tracking-wider">Product</div>
              <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider pr-4">
                Active · Stock Qty
              </div>
            </div>

            {/* Product list */}
            <div>
              {loading ? (
                [...Array(12)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
                    <div className="w-10 h-10 bg-gray-800 rounded-lg animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-800 rounded animate-pulse w-2/5" />
                      <div className="h-3 bg-gray-800/50 rounded animate-pulse w-1/3" />
                    </div>
                    <div className="h-8 w-36 bg-gray-800 rounded-xl animate-pulse flex-shrink-0" />
                  </div>
                ))
              ) : items.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-4xl mb-3">📦</p>
                  <p className="text-gray-400 font-medium">No products found</p>
                  {search && (
                    <button onClick={() => { setSearch(''); load(1, '', catFilter); }}
                      className="mt-2 text-brand-500 text-sm font-semibold">
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                items.map((item) => (
                  <ProductRow
                    key={item.id}
                    item={item}
                    storeId={selectedStore?.id}
                    onSaved={handleSaved}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 py-6">
                <button onClick={() => { const p = page - 1; setPage(p); load(p, search, catFilter); }}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-700 text-gray-300
                             disabled:opacity-40 hover:bg-gray-800 transition-colors">
                  ← Prev
                </button>
                <span className="text-sm text-gray-500 font-medium">Page {page} of {totalPages}</span>
                <button onClick={() => { const p = page + 1; setPage(p); load(p, search, catFilter); }}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-700 text-gray-300
                             disabled:opacity-40 hover:bg-gray-800 transition-colors">
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
