// ProductDetailPage.jsx
// FIX: All hooks moved to top — React Rules of Hooks requires hooks never
//      be called after a conditional return. The old code called useState/
//      useStore hooks after `if (!product) return ...`, which crashed React.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsApi } from '../api/products.api.js';
import { useCartStore } from '../store/cartStore.js';
import { useSavedStore } from '../store/savedStore.js';
import { useSubscriptionStore } from '../store/subscriptionStore.js';
import { useIsAuthenticated } from '../store/authStore.js';
import { useStoreSelectionStore } from '../store/storeSelectionStore.js';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_EMOJI = {
  vegetables: '🥦', dairy: '🥛', staples: '🌾', snacks: '🍪',
  beverages: '☕', personal: '🧴', cleaning: '🧹', oils: '🫙',
};

const BULK_TIERS = [
  { minQty: 1,  maxQty: 5,    label: '1–5 units',  extraOff: 0    },
  { minQty: 6,  maxQty: 11,   label: '6–11 units',  extraOff: 0.05 },
  { minQty: 12, maxQty: 24,   label: '12–24 units', extraOff: 0.10 },
  { minQty: 25, maxQty: null, label: '25+ units',  extraOff: 0.15 },
];

// ─── Shared slider card ───────────────────────────────────────────────────────

function SliderCard({ product }) {
  const navigate  = useNavigate();
  const addItem   = useCartStore((s) => s.addItem);
  const items     = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQuantity);
  const inCart    = items.find((i) => i.product.id === product.id);
  const qty       = inCart?.quantity ?? 0;
  const emoji     = CAT_EMOJI[product.category?.slug] ?? '📦';
  const discPct   = product.mrp > product.discountPrice
    ? Math.round((1 - product.discountPrice / product.mrp) * 100) : 0;

  return (
    <div className="flex-shrink-0 w-36 bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-100 snap-start">
      {/* Image */}
      <button
        onClick={() => navigate(`/products/${product.id}`)}
        className="w-full h-24 bg-gray-50 flex items-center justify-center relative overflow-hidden"
      >
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} referrerPolicy="no-referrer"
              className="h-full w-full object-cover" loading="lazy" />
          : <span className="text-4xl">{emoji}</span>}
        {discPct > 0 && (
          <span className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {discPct}% OFF
          </span>
        )}
        {product.stockQty === 0 && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="text-[10px] font-bold text-gray-500">Out of Stock</span>
          </div>
        )}
      </button>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight min-h-[28px]">
          {product.name}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{product.unit}</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-sm font-black text-gray-900">₹{product.discountPrice}</span>
          {product.mrp > product.discountPrice && (
            <span className="text-[10px] text-gray-400 line-through">₹{product.mrp}</span>
          )}
        </div>

        {qty > 0 ? (
          <div className="flex items-center justify-between mt-2 bg-brand-600 rounded-xl px-1.5 py-1">
            <button
              onClick={() => updateQty(product.id, qty - 1)}
              className="text-white font-bold text-sm w-5 h-5 flex items-center justify-center"
            >−</button>
            <span className="text-xs text-white font-bold">{qty}</span>
            <button
              onClick={() => updateQty(product.id, qty + 1)}
              disabled={qty >= product.stockQty}
              className="text-white font-bold text-sm w-5 h-5 flex items-center justify-center disabled:opacity-40"
            >+</button>
          </div>
        ) : (
          <button
            onClick={() => addItem(product)}
            disabled={product.stockQty === 0}
            className="w-full mt-2 py-1.5 text-[11px] font-bold rounded-xl
                       bg-brand-600 text-white disabled:bg-gray-100 disabled:text-gray-400
                       active:scale-95 transition-all"
          >
            {product.stockQty === 0 ? 'OOS' : '+ Add'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Horizontal product slider ────────────────────────────────────────────────

function ProductSlider({ icon, title, products }) {
  if (!products.length) return null;
  return (
    <section className="mt-5">
      <div className="flex items-center gap-2 px-4 mb-3">
        <span className="text-lg">{icon}</span>
        <h2 className="text-base font-bold text-gray-900 flex-1">{title}</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {products.length}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-3 no-scrollbar snap-x snap-mandatory">
        {products.map((p) => <SliderCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  // ── ALL HOOKS HERE — never below a conditional return ──────────────────────
  const { selectedStore } = useStoreSelectionStore();
  const addItem    = useCartStore((s) => s.addItem);
  const items      = useCartStore((s) => s.items);
  const updateQty  = useCartStore((s) => s.updateQuantity);
  const isAuthed   = useIsAuthenticated();
  // Select functions from stores (not values) so they can be called after product loads
  const toggleSave   = useSavedStore((s) => s.toggleSave);
  const isSavedFn    = useSavedStore((s) => s.isSaved);
  const subscribeFn    = useSubscriptionStore((s) => s.subscribe);
  const unsubscribeFn  = useSubscriptionStore((s) => s.unsubscribe);
  const isSubscribedFn = useSubscriptionStore((s) => s.isSubscribed);
  const subscriptions  = useSubscriptionStore((s) => s.subscriptions);

  const [product,   setProduct]   = useState(null);
  const [related,   setRelated]   = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [qty,       setQty]       = useState(1);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subFreq,      setSubFreq]      = useState('weekly');

  // Derived cart state (safe — items is always an array)
  const inCart  = product ? items.find((i) => i.product.id === product.id) : null;
  const cartQty = inCart?.quantity ?? 0;

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setProduct(null);
    setQty(1);

    const storeId = selectedStore?.id;
    Promise.all([
      productsApi.getById(id, storeId),
      productsApi.getRelated(id, storeId),
      productsApi.getTopDeals(storeId),
    ])
      .then(([prodRes, relRes, dealsRes]) => {
        setProduct(prodRes.product);
        setRelated(relRes.products ?? []);
        setSuggested((dealsRes.products ?? []).filter((p) => p.id !== id).slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, selectedStore?.id]); // eslint-disable-line

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="animate-pulse px-4 py-4 space-y-4">
          <div className="h-64 bg-gray-200 rounded-3xl" />
          <div className="bg-white rounded-3xl p-5 space-y-3">
            <div className="h-3 bg-gray-200 rounded w-1/4" />
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-8 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="h-32 bg-gray-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="text-center py-24 px-6">
          <p className="text-6xl mb-4">😕</p>
          <p className="text-lg font-bold text-gray-800 mb-1">Product not found</p>
          <p className="text-gray-400 text-sm mb-6">This item may no longer be available.</p>
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-3 bg-brand-600 text-white rounded-2xl font-bold text-sm active:scale-95 transition-all"
          >
            Browse Products →
          </button>
        </div>
      </div>
    );
  }

  // ── Derived values (product is guaranteed non-null below this line) ─────────
  const isSaved      = isSavedFn(product.id);
  const isSubscribed = isSubscribedFn(product.id);
  const emoji        = CAT_EMOJI[product.category?.slug] ?? '📦';
  const discountPct  = product.mrp > product.discountPrice
    ? Math.round((1 - product.discountPrice / product.mrp) * 100) : 0;
  const savings      = product.mrp - product.discountPrice;
  const activeTier   = [...BULK_TIERS].reverse().find((t) => qty >= t.minQty) ?? BULK_TIERS[0];
  const effectivePrice = parseFloat((product.discountPrice * (1 - activeTier.extraOff)).toFixed(2));

  const handleAddToCart = () => addItem({ ...product, discountPrice: effectivePrice }, qty);

  const handleSubscribe = () => {
    if (isSubscribed) {
      const sub = subscriptions.find((s) => s.product.id === product.id);
      if (sub) unsubscribeFn(sub.id);
    } else {
      subscribeFn(product, subFreq, qty);
      setShowSubModal(false);
    }
  };

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <Header showSearch={false} />

      {/* Back nav */}
      <div className="max-w-6xl mx-auto px-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 py-3 text-sm text-gray-500 font-medium hover:text-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          TWO-COLUMN GRID
          Mobile  : stacked (image → info below)
          Desktop : left = image (sticky), right = all product details
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="md:grid md:grid-cols-2 md:gap-8 md:items-start">

          {/* ── LEFT: Product image ─────────────────────────────────────────── */}
          <div className="md:sticky md:top-6">
            <div className="h-64 md:h-[460px] bg-white rounded-3xl flex items-center justify-center overflow-hidden shadow-sm relative">
              {product.imageUrl
                ? <img src={product.imageUrl} alt={product.name} referrerPolicy="no-referrer"
                    className="h-full w-full object-contain p-6 md:p-10" />
                : <span className="text-8xl">{emoji}</span>}

              {/* Badges */}
              {discountPct > 0 && (
                <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                  {discountPct}% OFF
                </span>
              )}
              {product.isBestSeller && (
                <span className="absolute bottom-3 left-3 bg-amber-400 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow">
                  ⭐ Best Seller
                </span>
              )}

              {/* Wishlist (desktop: inside image, mobile: also inside image) */}
              {isAuthed && (
                <button
                  onClick={() => toggleSave(product)}
                  className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-md
                             flex items-center justify-center active:scale-90 transition-all hover:bg-white"
                >
                  <svg className="w-5 h-5" fill={isSaved ? '#ef4444' : 'none'} stroke={isSaved ? '#ef4444' : '#9ca3af'} viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ── RIGHT: Product details ──────────────────────────────────────── */}
          <div className="mt-4 md:mt-0 space-y-4">

            {/* Info card */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <p className="text-xs text-brand-600 font-bold uppercase tracking-widest">
                {product.category?.name}
              </p>
              <h1 className="text-2xl font-black text-gray-900 leading-tight mt-1">{product.name}</h1>
              {(product.nameHi || product.nameGu) && (
                <p className="text-sm text-gray-400 mt-0.5">
                  {[product.nameHi, product.nameGu].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="text-sm text-gray-400 mt-0.5">{product.unit}</p>

              {/* Price */}
              <div className="flex items-baseline gap-2.5 mt-4">
                <span className="text-4xl font-black text-gray-900">₹{effectivePrice}</span>
                {product.mrp > product.discountPrice && (
                  <span className="text-lg text-gray-400 line-through">₹{product.mrp}</span>
                )}
                {savings > 0 && (
                  <span className="text-sm text-green-700 font-bold bg-green-50 px-2.5 py-1 rounded-xl">
                    Save ₹{savings.toFixed(0)}
                  </span>
                )}
              </div>
              {activeTier.extraOff > 0 && (
                <p className="text-xs text-green-600 font-semibold mt-1.5">
                  🎉 Extra {activeTier.extraOff * 100}% bulk discount applied
                </p>
              )}

              {/* Stock */}
              <div className="mt-3">
                {product.stockQty === 0 ? (
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-full">Out of Stock</span>
                ) : product.stockQty < 10 ? (
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full">⚡ Only {product.stockQty} left</span>
                ) : (
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">✓ In Stock</span>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-sm text-gray-600 mt-4 leading-relaxed border-t border-gray-100 pt-4">
                  {product.description}
                </p>
              )}

              {/* Save + Subscribe (auth only) */}
              {isAuthed && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => toggleSave(product)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-bold transition-all active:scale-95
                      ${isSaved ? 'border-red-300 text-red-500 bg-red-50' : 'border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-400'}`}
                  >
                    <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {isSaved ? 'Saved' : 'Save'}
                  </button>
                  <button
                    onClick={() => isSubscribed ? handleSubscribe() : setShowSubModal(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-bold transition-all active:scale-95
                      ${isSubscribed ? 'border-brand-400 text-brand-600 bg-brand-50' : 'border-gray-200 text-gray-600 hover:border-brand-200 hover:text-brand-600'}`}
                  >
                    🔄 {isSubscribed ? 'Subscribed' : 'Subscribe'}
                  </button>
                </div>
              )}
            </div>

            {/* Bulk pricing */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-800 mb-3">💰 Bulk Pricing</h2>
              <div className="space-y-2">
                {BULK_TIERS.map((tier, i) => {
                  const tierPrice = parseFloat((product.discountPrice * (1 - tier.extraOff)).toFixed(2));
                  const isActive  = activeTier === tier;
                  return (
                    <div key={i} className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all
                      ${isActive ? 'bg-brand-50 ring-1 ring-brand-200' : 'bg-gray-50'}`}>
                      <div>
                        <span className={`text-sm font-semibold ${isActive ? 'text-brand-700' : 'text-gray-600'}`}>
                          {tier.label}
                        </span>
                        {isActive && <span className="ml-2 text-[10px] text-brand-500 font-bold">← current</span>}
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${isActive ? 'text-brand-700' : 'text-gray-800'}`}>
                          ₹{tierPrice}/unit
                        </span>
                        {tier.extraOff > 0 && (
                          <p className="text-[10px] text-green-600 font-medium">+{tier.extraOff * 100}% off</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>{/* end RIGHT column */}
        </div>{/* end grid */}
      </div>{/* end max-w container */}

      {/* ── Full-width sliders (below two-column grid) ──────────────────────── */}
      <div className="max-w-6xl mx-auto w-full mt-2">
        <ProductSlider icon="🛒" title="Similar Products"    products={related}    />
        <ProductSlider icon="🔥" title="Today's Best Deals"  products={suggested}  />
      </div>

      <div className="mt-8" />
      <Footer />

      {/* ── Subscribe modal ───────────────────────────────────────────────────── */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSubModal(false)} />
          <div className="relative w-full bg-white rounded-t-3xl z-10 p-5 pb-8">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="font-black text-gray-900 text-lg mb-1">Subscribe for Regular Delivery</h3>
            <p className="text-xs text-gray-400 mb-5">{product.name} · ₹{product.discountPrice}/{product.unit}</p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Delivery Frequency</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {['daily', 'weekly', 'monthly'].map((f) => (
                <button key={f} onClick={() => setSubFreq(f)}
                  className={`py-3 text-sm font-bold rounded-2xl border-2 transition-all active:scale-95
                    ${subFreq === f ? 'bg-brand-600 text-white border-brand-600 shadow-md' : 'border-gray-200 text-gray-600 hover:border-brand-300'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={handleSubscribe}
              className="w-full py-4 bg-brand-600 text-white font-black rounded-2xl text-sm active:scale-95 transition-all shadow-lg">
              🔄 Subscribe — {subFreq.charAt(0).toUpperCase() + subFreq.slice(1)} Delivery
            </button>
          </div>
        </div>
      )}

      {/* ── Sticky add-to-cart bar (all screen sizes) ───────────────────────── */}
      <div
        className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-3 z-30"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-3 max-w-md mx-auto">
          {/* Quantity stepper */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-2xl px-2 py-1.5">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-8 h-8 flex items-center justify-center text-gray-700 font-bold text-lg rounded-xl hover:bg-gray-200 transition-colors"
            >−</button>
            <span className="w-8 text-center text-sm font-bold text-gray-800">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(product.stockQty || 99, q + 1))}
              className="w-8 h-8 flex items-center justify-center text-gray-700 font-bold text-lg rounded-xl hover:bg-gray-200 transition-colors"
            >+</button>
          </div>

          {/* Cart control */}
          {cartQty > 0 ? (
            <div className="flex items-center justify-between flex-1 bg-brand-600 rounded-2xl px-4 py-3">
              <button onClick={() => updateQty(product.id, cartQty - 1)} className="text-white font-bold text-xl">−</button>
              <span className="text-white font-bold text-sm">{cartQty} in cart · ₹{(effectivePrice * cartQty).toFixed(0)}</span>
              <button onClick={() => updateQty(product.id, cartQty + 1)} className="text-white font-bold text-xl">+</button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={product.stockQty === 0}
              className="flex-1 py-3.5 bg-brand-600 text-white font-bold rounded-2xl text-sm
                         disabled:bg-gray-200 disabled:text-gray-400 active:scale-95 transition-all shadow-md shadow-brand-200"
            >
              {product.stockQty === 0
                ? 'Out of Stock'
                : `Add ${qty > 1 ? `${qty} units` : ''} · ₹${(effectivePrice * qty).toFixed(0)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
