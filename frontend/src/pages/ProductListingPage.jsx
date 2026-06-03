import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { productsApi }          from '../api/products.api.js';
import { useStoreSelectionStore } from '../store/storeSelectionStore.js';
import Header     from '../components/layout/Header.jsx';
import Footer     from '../components/layout/Footer.jsx';
import ProductCard from '../components/common/ProductCard.jsx';

const SORT_OPTIONS = [
  { value: '',           label: 'Relevance' },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'discount',   label: 'Best Discount' },
];

const PRICE_RANGES = [
  { label: 'Under ₹50',    min: 0,   max: 50 },
  { label: '₹50 – ₹150',  min: 50,  max: 150 },
  { label: '₹150 – ₹300', min: 150, max: 300 },
  { label: '₹300 – ₹500', min: 300, max: 500 },
  { label: 'Above ₹500',  min: 500, max: undefined },
];

function ProductSkeleton() {
  return (
    <div className="bg-white border border-gray-200 overflow-hidden">
      <div className="pt-[100%] bg-gray-100 animate-pulse relative"><div className="absolute inset-0" /></div>
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
        <div className="h-8 bg-gray-100 rounded animate-pulse mt-3" />
      </div>
    </div>
  );
}

export default function ProductListingPage() {
  const navigate          = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedStore } = useStoreSelectionStore();

  const categoryParam = searchParams.get('category') || '';
  const sortParam     = searchParams.get('sort') || '';
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');

  const [categories, setCategories]   = useState([]);
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(true);
  const [total, setTotal]             = useState(0);
  const [showFilter, setShowFilter]   = useState(false);

  // Local filter draft (only applied on "Apply")
  const [draftSort, setDraftSort]     = useState(sortParam);
  const [draftCat, setDraftCat]       = useState(categoryParam);
  const [draftMin, setDraftMin]       = useState(minPriceParam || '');
  const [draftMax, setDraftMax]       = useState(maxPriceParam || '');
  const [priceRangeIdx, setPriceRangeIdx] = useState(-1);

  const loadMoreRef = useRef(null);

  useEffect(() => {
    productsApi.getCategories().then((r) => setCategories(r.categories || [])).catch(() => {});
  }, []);

  const fetchProducts = useCallback(async (pageNum, params) => {
    setLoading(true);
    try {
      const q = {
        page: pageNum, limit: 20,
        ...(params.category  && { category:  params.category  }),
        ...(params.sort      && { sort:      params.sort      }),
        ...(params.minPrice  && { minPrice:  params.minPrice  }),
        ...(params.maxPrice  && { maxPrice:  params.maxPrice  }),
        ...(params.search    && { search:    params.search    }),
        // Pass storeId so the backend returns only products available at this
        // store. Falls back to global catalog if store has no inventory set up.
        ...(selectedStore    && { storeId:   selectedStore.id }),
      };
      const r = await productsApi.getAll(q);
      setProducts((prev) => pageNum === 1 ? (r.products || []) : [...prev, ...(r.products || [])]);
      setTotal(r.total || 0);
      setHasMore(pageNum < (r.totalPages || 1));
    } catch {}
    finally { setLoading(false); }
  }, [selectedStore?.id]); // eslint-disable-line

  // Re-fetch on URL param change OR when selected store changes
  useEffect(() => {
    setPage(1);
    setProducts([]);
    fetchProducts(1, {
      category: categoryParam,
      sort: sortParam,
      minPrice: minPriceParam,
      maxPrice: maxPriceParam,
      search: searchParams.get('search'),
    });
  }, [categoryParam, sortParam, minPriceParam, maxPriceParam, searchParams.get('search'), selectedStore?.id]); // eslint-disable-line

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setPage((p) => p + 1);
    }, { threshold: 0.1 });
    obs.observe(loadMoreRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading]);

  useEffect(() => {
    if (page > 1) fetchProducts(page, {
      category: categoryParam, sort: sortParam,
      minPrice: minPriceParam, maxPrice: maxPriceParam,
      search: searchParams.get('search'),
    });
  }, [page]); // eslint-disable-line

  const applyFilters = () => {
    const p = {};
    if (draftCat)  p.category = draftCat;
    if (draftSort) p.sort     = draftSort;
    if (draftMin)  p.minPrice = draftMin;
    if (draftMax)  p.maxPrice = draftMax;
    if (searchParams.get('search')) p.search = searchParams.get('search');
    setSearchParams(p);
    setShowFilter(false);
  };

  const clearFilters = () => {
    setDraftSort(''); setDraftCat(''); setDraftMin(''); setDraftMax(''); setPriceRangeIdx(-1);
    setSearchParams({});
    setShowFilter(false);
  };

  const activeFilterCount = [categoryParam, sortParam, minPriceParam, maxPriceParam].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />

      {/* Sticky filter bar */}
      <div className="bg-white border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {/* Filter button */}
        <button onClick={() => { setDraftSort(sortParam); setDraftCat(categoryParam); setDraftMin(minPriceParam || ''); setDraftMax(maxPriceParam || ''); setShowFilter(true); }}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
            ${activeFilterCount > 0 ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 text-gray-600 hover:border-brand-400'}`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>

        {/* Quick sort pills */}
        {SORT_OPTIONS.slice(1).map((opt) => (
          <button key={opt.value}
            onClick={() => { const p = new URLSearchParams(searchParams); p.set('sort', opt.value); setSearchParams(p); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
              ${sortParam === opt.value ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 text-gray-600 hover:border-brand-400'}`}>
            {opt.label}
          </button>
        ))}

        {/* Category pills */}
        {categories.slice(0, 5).map((c) => (
          <button key={c.slug}
            onClick={() => { const p = new URLSearchParams(searchParams); p.set('category', c.slug); setSearchParams(p); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
              ${categoryParam === c.slug ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-300 text-gray-600 hover:border-brand-400'}`}>
            {c.name}
          </button>
        ))}
      </div>
      </div>

      {/* Result count */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-3 pt-3 pb-1">
        {!loading && (
          <p className="text-xs text-gray-500">
            {total} product{total !== 1 ? 's' : ''}
            {categoryParam && ` in ${categories.find((c) => c.slug === categoryParam)?.name || categoryParam}`}
            {searchParams.get('search') && ` for "${searchParams.get('search')}"`}
          </p>
        )}
        </div>
      </div>

      {/* Product grid */}
      <div className="pb-4 max-w-[1400px] mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-px bg-gray-200 border border-gray-200">
          {loading && products.length === 0
            ? [...Array(8)].map((_, i) => <ProductSkeleton key={i} />)
            : products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        {!loading && products.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔍</div>
            <p className="text-gray-600 font-medium">No products found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            <button onClick={clearFilters} className="mt-3 text-brand-600 text-sm font-semibold">Clear filters</button>
          </div>
        )}

        {hasMore && <div ref={loadMoreRef} className="h-16" />}
        {loading && products.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <Footer />

      {/* Filter bottom sheet */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilter(false)} />
          <div className="relative w-full bg-white rounded-t-3xl z-10 max-h-[85vh] flex flex-col">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-4 flex-shrink-0" />
            <div className="flex items-center justify-between px-5 mb-4 flex-shrink-0">
              <h3 className="font-bold text-gray-800 text-base">Filters</h3>
              <button onClick={clearFilters} className="text-sm text-brand-600 font-semibold">Clear All</button>
            </div>

            <div className="overflow-y-auto px-5 pb-4 flex-1 space-y-5">
              {/* Sort */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Sort By</p>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button key={opt.value} onClick={() => setDraftSort(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                        ${draftSort === opt.value ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setDraftCat('')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                      ${!draftCat ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600'}`}>
                    All
                  </button>
                  {categories.map((c) => (
                    <button key={c.slug} onClick={() => setDraftCat(c.slug)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                        ${draftCat === c.slug ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600'}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Price Range</p>
                <div className="flex flex-wrap gap-2">
                  {PRICE_RANGES.map((r, i) => (
                    <button key={i} onClick={() => {
                      setPriceRangeIdx(i === priceRangeIdx ? -1 : i);
                      setDraftMin(i === priceRangeIdx ? '' : String(r.min));
                      setDraftMax(i === priceRangeIdx ? '' : (r.max !== undefined ? String(r.max) : ''));
                    }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                        ${priceRangeIdx === i ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600'}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <input type="number" placeholder="Min ₹" value={draftMin}
                    onChange={(e) => { setDraftMin(e.target.value); setPriceRangeIdx(-1); }}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400" />
                  <span className="text-gray-400 text-sm">–</span>
                  <input type="number" placeholder="Max ₹" value={draftMax}
                    onChange={(e) => { setDraftMax(e.target.value); setPriceRangeIdx(-1); }}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400" />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
              <button onClick={applyFilters}
                className="w-full py-3.5 bg-brand-600 text-white font-bold rounded-2xl text-sm active:scale-95 transition-all">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
