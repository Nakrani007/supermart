import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsApi } from '../api/products.api.js';
import { useCartStore } from '../store/cartStore.js';
import { useSavedStore } from '../store/savedStore.js';
import { useSubscriptionStore } from '../store/subscriptionStore.js';
import { useIsAuthenticated } from '../store/authStore.js';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

const CAT_EMOJI = {
  vegetables: '🥦', dairy: '🥛', staples: '🌾', snacks: '🍪',
  beverages: '☕', personal: '🧴', oils: '🫙',
};

const BULK_TIERS = [
  { minQty: 1,  maxQty: 5,  label: '1–5 units',   extraOff: 0 },
  { minQty: 6,  maxQty: 11, label: '6–11 units',   extraOff: 0.05 },
  { minQty: 12, maxQty: 24, label: '12–24 units',  extraOff: 0.10 },
  { minQty: 25, maxQty: null, label: '25+ units',  extraOff: 0.15 },
];

function RelatedCard({ product }) {
  const navigate  = useNavigate();
  const addItem   = useCartStore((s) => s.addItem);
  const items     = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQuantity);
  const inCart    = items.find((i) => i.product.id === product.id);
  const qty       = inCart?.quantity || 0;
  const emoji     = CAT_EMOJI[product.category?.slug] || '📦';

  return (
    <div className="flex-shrink-0 w-32 bg-white rounded-2xl overflow-hidden shadow-sm ring-1 ring-gray-100">
      <button onClick={() => navigate(`/products/${product.id}`)}
        className="w-full h-20 bg-gray-50 flex items-center justify-center">
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
          : <span className="text-3xl">{emoji}</span>}
      </button>
      <div className="p-2">
        <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight">{product.name}</p>
        <p className="text-xs font-black text-gray-900 mt-1">₹{product.discountPrice}</p>
        {qty > 0 ? (
          <div className="flex items-center justify-between mt-1.5 bg-brand-600 rounded-lg px-1 py-0.5">
            <button onClick={() => updateQty(product.id, qty - 1)} className="text-white font-bold text-sm w-4">−</button>
            <span className="text-[10px] text-white font-bold">{qty}</span>
            <button onClick={() => updateQty(product.id, qty + 1)} className="text-white font-bold text-sm w-4">+</button>
          </div>
        ) : (
          <button onClick={() => addItem(product)}
            disabled={product.stockQty === 0}
            className="w-full mt-1.5 py-1 text-[10px] font-bold rounded-lg bg-brand-600 text-white disabled:bg-gray-200 disabled:text-gray-400">
            {product.stockQty === 0 ? 'OOS' : 'Add'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const addItem   = useCartStore((s) => s.addItem);
  const items     = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQuantity);

  const [product, setProduct]   = useState(null);
  const [related, setRelated]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [qty, setQty]           = useState(1);

  const inCart = product ? items.find((i) => i.product.id === product.id) : null;
  const cartQty = inCart?.quantity || 0;

  useEffect(() => {
    setLoading(true);
    productsApi.getById(id)
      .then((r) => {
        setProduct(r.product);
        return productsApi.getRelated(id);
      })
      .then((r) => setRelated(r.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="animate-pulse p-4 space-y-4">
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-6 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-12 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="text-center py-20">
          <p className="text-5xl mb-3">😕</p>
          <p className="text-gray-600 font-medium">Product not found</p>
          <button onClick={() => navigate('/products')} className="mt-4 text-brand-600 font-semibold text-sm">
            Browse products →
          </button>
        </div>
      </div>
    );
  }

  const isAuthed     = useIsAuthenticated();
  const toggleSave   = useSavedStore((s) => s.toggleSave);
  const isSaved      = useSavedStore((s) => s.isSaved(product?.id));
  const subscribe    = useSubscriptionStore((s) => s.subscribe);
  const unsubscribe  = useSubscriptionStore((s) => s.unsubscribe);
  const isSubscribed = useSubscriptionStore((s) => s.isSubscribed(product?.id));
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subFreq, setSubFreq] = useState('weekly');

  const emoji = CAT_EMOJI[product.category?.slug] || '📦';
  const discountPct = product.mrp > product.discountPrice
    ? Math.round((1 - product.discountPrice / product.mrp) * 100) : 0;
  const savings = product.mrp - product.discountPrice;

  const activeTier = BULK_TIERS.slice().reverse().find((t) => qty >= t.minQty) || BULK_TIERS[0];
  const effectivePrice = parseFloat((product.discountPrice * (1 - activeTier.extraOff)).toFixed(2));

  const handleAddToCart = () => {
    const productWithBulkPrice = { ...product, discountPrice: effectivePrice };
    addItem(productWithBulkPrice, qty);
  };

  const handleSubscribe = () => {
    if (isSubscribed) {
      const sub = subscriptions.find((s) => s.product.id === product.id);
      if (sub) unsubscribe(sub.id);
    } else {
      subscribe(product, subFreq, qty);
      setShowSubModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28 flex flex-col">
      <Header showSearch={false} />

      {/* Back nav */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 px-4 py-3 text-sm text-gray-600 font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Hero image */}
      <div className="mx-3 h-56 bg-white rounded-3xl flex items-center justify-center overflow-hidden shadow-sm relative">
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-4" />
          : <span className="text-8xl">{emoji}</span>}
        {/* Save to wishlist */}
        {isAuthed && (
          <button onClick={() => toggleSave(product)}
            className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center
                       hover:bg-red-50 active:scale-95 transition-all">
            <svg className="w-5 h-5" fill={isSaved ? '#ef4444' : 'none'} stroke={isSaved ? '#ef4444' : '#9ca3af'} viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Product info */}
      <div className="mx-3 mt-4 bg-white rounded-3xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs text-brand-600 font-semibold">{product.category?.name}</p>
            <h1 className="text-xl font-black text-gray-900 leading-tight mt-0.5">{product.name}</h1>
            {(product.nameHi || product.nameGu) && (
              <p className="text-sm text-gray-400 mt-0.5">{product.nameHi}{product.nameHi && product.nameGu ? ' · ' : ''}{product.nameGu}</p>
            )}
            <p className="text-sm text-gray-500 mt-0.5">{product.unit}</p>
          </div>
          {discountPct > 0 && (
            <span className="flex-shrink-0 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {discountPct}% OFF
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-3xl font-black text-gray-900">₹{effectivePrice}</span>
          {product.mrp > product.discountPrice && (
            <span className="text-base text-gray-400 line-through">₹{product.mrp}</span>
          )}
          {savings > 0 && (
            <span className="text-sm text-green-600 font-semibold">Save ₹{savings.toFixed(0)}</span>
          )}
        </div>
        {activeTier.extraOff > 0 && (
          <p className="text-xs text-green-600 font-semibold mt-1">
            Extra {activeTier.extraOff * 100}% bulk discount applied!
          </p>
        )}

        {/* Stock badge */}
        <div className="mt-3">
          {product.stockQty === 0 ? (
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">Out of Stock</span>
          ) : product.stockQty < 10 ? (
            <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">Only {product.stockQty} left</span>
          ) : (
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">In Stock</span>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-600 mt-4 leading-relaxed">{product.description}</p>
        )}

        {/* Save + Subscribe actions */}
        {isAuthed && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            <button onClick={() => toggleSave(product)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded border-2 text-xs font-bold transition-all active:scale-95
                ${isSaved ? 'border-red-400 text-red-500 bg-red-50' : 'border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-400'}`}>
              <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {isSaved ? 'Saved' : 'Save'}
            </button>
            <button onClick={() => isSubscribed ? handleSubscribe() : setShowSubModal(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded border-2 text-xs font-bold transition-all active:scale-95
                ${isSubscribed ? 'border-brand-500 text-brand-600 bg-brand-50' : 'border-gray-300 text-gray-600 hover:border-brand-300 hover:text-brand-600'}`}>
              <span>🔄</span>
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          </div>
        )}
      </div>

      {/* Subscribe modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSubModal(false)} />
          <div className="relative w-full bg-white rounded-t-3xl z-10 p-5">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-gray-800 mb-1">Subscribe for Regular Delivery</h3>
            <p className="text-xs text-gray-400 mb-4">{product.name} · ₹{product.discountPrice}/{product.unit}</p>

            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Delivery Frequency</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['daily', 'weekly', 'monthly'].map((f) => (
                <button key={f} onClick={() => setSubFreq(f)}
                  className={`py-2 text-xs font-semibold rounded border transition-colors
                    ${subFreq === f ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <button onClick={handleSubscribe}
              className="w-full py-3.5 bg-brand-600 text-white font-bold rounded text-sm active:scale-95 transition-all">
              🔄 Subscribe — {subFreq.charAt(0).toUpperCase() + subFreq.slice(1)} delivery
            </button>
          </div>
        </div>
      )}

      {/* Bulk pricing */}
      <div className="mx-3 mt-3 bg-white rounded-3xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800 mb-3">💰 Bulk Pricing</h2>
        <div className="space-y-2">
          {BULK_TIERS.map((tier, i) => {
            const tierPrice = parseFloat((product.discountPrice * (1 - tier.extraOff)).toFixed(2));
            const isActive = activeTier === tier;
            return (
              <div key={i} className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors
                ${isActive ? 'bg-brand-50 ring-1 ring-brand-200' : 'bg-gray-50'}`}>
                <span className={`text-sm font-medium ${isActive ? 'text-brand-700' : 'text-gray-600'}`}>
                  {tier.label}
                </span>
                <div className="text-right">
                  <span className={`text-sm font-bold ${isActive ? 'text-brand-700' : 'text-gray-800'}`}>
                    ₹{tierPrice}/unit
                  </span>
                  {tier.extraOff > 0 && (
                    <p className="text-[10px] text-green-600">+{tier.extraOff * 100}% extra off</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-4">
          <h2 className="text-base font-bold text-gray-800 px-3 mb-3">Similar Products</h2>
          <div className="flex gap-3 overflow-x-auto px-3 pb-2 no-scrollbar">
            {related.map((p) => <RelatedCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      <Footer />

      {/* Sticky add to cart bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 px-4 py-3 z-30">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          {/* Qty selector */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-2 py-1.5">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-7 h-7 flex items-center justify-center text-gray-700 font-bold text-lg">−</button>
            <span className="w-8 text-center text-sm font-bold text-gray-800">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(product.stockQty, q + 1))}
              className="w-7 h-7 flex items-center justify-center text-gray-700 font-bold text-lg">+</button>
          </div>

          {cartQty > 0 ? (
            <div className="flex items-center justify-between flex-1 bg-brand-600 rounded-2xl px-4 py-3">
              <button onClick={() => updateQty(product.id, cartQty - 1)} className="text-white font-bold text-xl">−</button>
              <span className="text-white font-bold">{cartQty} in cart</span>
              <button onClick={() => updateQty(product.id, cartQty + 1)} className="text-white font-bold text-xl">+</button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={product.stockQty === 0}
              className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-2xl text-sm
                         disabled:bg-gray-300 active:scale-95 transition-all">
              {product.stockQty === 0 ? 'Out of Stock' : `Add ${qty > 1 ? qty + ' units' : ''} · ₹${(effectivePrice * qty).toFixed(0)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
