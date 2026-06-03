import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../api/products.api.js';
import { useStoreSelectionStore } from '../store/storeSelectionStore.js';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';
import HeroCarousel from '../components/home/HeroCarousel.jsx';
import CategoryGrid from '../components/home/CategoryGrid.jsx';
import DealsSection from '../components/home/DealsSection.jsx';
import ProductCard from '../components/common/ProductCard.jsx';

// ── Product grid skeleton ─────────────────────────────────────────────────────

function ProductSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="pt-[100%] bg-gray-100 animate-pulse relative"><div className="absolute inset-0" /></div>
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
        <div className="h-8 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
    </div>
  );
}

// ── Promo banner strip ────────────────────────────────────────────────────────

function PromoBanner({ from, to, eyebrow, headline, cta, ctaLink, emoji }) {
  const navigate = useNavigate();
  return (
    <div className={`bg-gradient-to-r ${from} ${to}`}>
      <div className="px-5 py-6 flex items-center justify-between">
      <div className="flex-1 min-w-0 pr-4">
        {eyebrow && (
          <p className="text-[9px] font-extrabold text-white/60 uppercase tracking-widest mb-1">{eyebrow}</p>
        )}
        <p className="text-xl font-black text-white leading-tight whitespace-pre-line">{headline}</p>
        <button onClick={() => navigate(ctaLink)}
          className="mt-3 inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30
                     text-white text-xs font-extrabold px-5 py-2 rounded-lg tracking-wide
                     active:scale-95 transition-all">
          {cta}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <span className="text-[5rem] leading-none select-none drop-shadow-lg flex-shrink-0">{emoji}</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();
  const { selectedStore } = useStoreSelectionStore();

  // Section visibility whitelist from admin config (null = not yet resolved)
  const [visibleSections, setVisibleSections] = useState(null);
  const [sectionsReady,   setSectionsReady]   = useState(false);

  // Labeled product carousels
  const [clearanceProducts,   setClearanceProducts]   = useState([]);
  const [weeklySaverProducts, setWeeklySaverProducts] = useState([]);
  const [bestSellerProducts,  setBestSellerProducts]  = useState([]);
  const [essentials,          setEssentials]          = useState([]);
  const [dealsLoading,        setDealsLoading]        = useState(true);

  // Main product grid
  const [products,    setProducts]    = useState([]);
  const [gridLoading, setGridLoading] = useState(true);

  // Delivery config
  const [deliveryMsg, setDeliveryMsg] = useState('');

  // ── 1. Section visibility + delivery config ───────────────────────────────
  useEffect(() => {
    productsApi.getSections()
      .then((r) => {
        const keys = (r.sections || []).map((s) => s.key);
        setVisibleSections(keys.length > 0 ? new Set(keys) : null);
      })
      .catch(() => {})
      .finally(() => setSectionsReady(true));

    productsApi.getDeliveryConfig()
      .then((r) => {
        const cfg = r.config || r;
        if (cfg?.earliestMsg) setDeliveryMsg(cfg.earliestMsg);
      })
      .catch(() => {});
  }, []);

  // ── 2. Labeled + essential products ──────────────────────────────────────
  useEffect(() => {
    const sid = selectedStore?.id;
    setDealsLoading(true);
    Promise.all([
      productsApi.getLabeledProducts('clearance',   10, sid).catch(() => ({ products: [] })),
      productsApi.getLabeledProducts('weeklySaver', 10, sid).catch(() => ({ products: [] })),
      productsApi.getLabeledProducts('bestSeller',  10, sid).catch(() => ({ products: [] })),
      productsApi.getDailyEssentials(sid).catch(() => ({ products: [] })),
    ]).then(([c, w, b, e]) => {
      setClearanceProducts(c.products   || []);
      setWeeklySaverProducts(w.products || []);
      setBestSellerProducts(b.products  || []);
      setEssentials(e.products          || []);
      setDealsLoading(false);
    });
  }, [selectedStore?.id]); // eslint-disable-line

  // ── 3. Product grid ───────────────────────────────────────────────────────
  useEffect(() => {
    setGridLoading(true);
    productsApi.getAll({ limit: 12, ...(selectedStore && { storeId: selectedStore.id }) })
      .then((r) => setProducts(r.products || []))
      .catch(() => {})
      .finally(() => setGridLoading(false));
  }, [selectedStore?.id]); // eslint-disable-line

  // showSection: visible if sections not yet configured, or key is in the set
  const showSection = (key) =>
    !sectionsReady || visibleSections === null || visibleSections.has(key);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      {/* ── Delivery info bar — full-width strip ── */}
      <div className="bg-green-600">
        <div className="max-w-[1280px] mx-auto px-4 py-1.5 flex items-center gap-2">
          <span className="text-[11px] font-bold text-white">⚡ Earliest Delivery:</span>
          <span className="text-[11px] text-green-100 ml-auto font-medium">
            🕐 {deliveryMsg || 'Delivery in 2–4 hours'}
          </span>
          <span className="text-[11px] text-green-100">· Free above ₹500</span>
        </div>
      </div>

      {/* ── All page content constrained to max-w-[1280px] ── */}
      <div className="max-w-[1280px] mx-auto w-full px-3 pb-4">

        {/* ── Hero Carousel ── */}
        {showSection('hero-banners') && (
          <div className="mt-3 rounded-2xl overflow-hidden shadow-sm">
            <HeroCarousel />
          </div>
        )}

        {/* ── Category grid ── */}
        {showSection('popular-categories') && (
          <div className="mt-3 rounded-2xl overflow-hidden">
            <CategoryGrid />
          </div>
        )}

        {/* ── Deal rows ── */}
        <div className="mt-3">
          <DealsSection
            loading={dealsLoading}
            clearanceProducts={showSection('clearance')        ? clearanceProducts   : []}
            weeklySaverProducts={showSection('weekly-savers')  ? weeklySaverProducts : []}
            bestSellerProducts={showSection('best-sellers')    ? bestSellerProducts  : []}
            dailyEssentials={showSection('daily-essentials')   ? essentials          : []}
          />
        </div>

        {/* ── Promo banner 1 ── */}
        <div className="mt-3 rounded-2xl overflow-hidden shadow-sm">
          <PromoBanner
            from="from-teal-500" to="to-cyan-500"
            eyebrow="The Summer Store"
            headline={"Stay Cool\nThis Season"}
            cta="SHOP NOW"
            ctaLink="/products?category=beverages"
            emoji="🌞"
          />
        </div>

        {/* ── Promo banner 2 ── */}
        <div className="mt-3 rounded-2xl overflow-hidden shadow-sm">
          <PromoBanner
            from="from-yellow-400" to="to-amber-500"
            eyebrow="Super Saver"
            headline={"The Half\nPrice Store"}
            cta="SHOP DEALS"
            ctaLink="/products?sort=discount"
            emoji="🏷️"
          />
        </div>

        {/* ── All Products grid ── */}
        {showSection('product-grid') && (
          <section className="bg-white mt-3 py-4 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between px-4 mb-3">
              <h2 className="text-[15px] font-bold text-gray-800">All Products</h2>
              <button onClick={() => navigate('/products')}
                className="flex items-center gap-1 text-[11px] font-bold text-brand-600
                           border border-brand-200 bg-brand-50 hover:bg-brand-100 px-2.5 py-1
                           rounded-lg transition-colors active:scale-95">
                View All
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-3">
              {gridLoading
                ? [...Array(8)].map((_, i) => <ProductSkeleton key={i} />)
                : products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>

            {!gridLoading && (
              <div className="px-4 mt-5">
                <button onClick={() => navigate('/products')}
                  className="w-full py-3 border-2 border-brand-600 text-brand-600 font-bold text-sm
                             rounded-xl hover:bg-brand-50 active:scale-95 transition-all tracking-wide">
                  VIEW ALL PRODUCTS →
                </button>
              </div>
            )}
          </section>
        )}

      </div>

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}
