import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStore } from '../store/subscriptionStore.js';
import { useCart } from '../hooks/useCart.js';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

const CAT_EMOJI = {
  vegetables: '🥦', dairy: '🥛', staples: '🌾', snacks: '🍪',
  beverages: '☕', personal: '🧴', oils: '🫙',
};

const FREQ_LABELS = { daily: 'Every Day', weekly: 'Every Week', monthly: 'Every Month' };
const FREQ_OPTIONS = ['daily', 'weekly', 'monthly'];

function SubscriptionCard({ sub }) {
  const navigate     = useNavigate();
  const { unsubscribe, updateFrequency, updateQty } = useSubscriptionStore();
  const { addItem }  = useCart();
  const [editing, setEditing] = useState(false);

  const { product, frequency, qty, nextDelivery } = sub;
  const nextDate = new Date(nextDelivery).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  const emoji = CAT_EMOJI[product.category?.slug] || '🛒';
  const savings = product.mrp > product.discountPrice ? Math.round(product.mrp - product.discountPrice) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden">
      <div className="flex gap-3 p-3">
        {/* Image */}
        <button onClick={() => navigate(`/products/${product.id}`)}
          className="w-20 h-20 flex-shrink-0 bg-gray-50 rounded flex items-center justify-center overflow-hidden">
          {product.imageUrl
            ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-1" loading="lazy" />
            : <span className="text-3xl">{emoji}</span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <button onClick={() => navigate(`/products/${product.id}`)} className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{product.name}</p>
              <p className="text-xs text-gray-400">{product.unit}</p>
            </button>
            <span className="flex-shrink-0 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              Active
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm font-bold text-gray-900">₹{product.discountPrice}</span>
            {savings > 0 && (
              <>
                <span className="text-xs text-gray-400 line-through">₹{product.mrp}</span>
                <span className="text-[10px] font-bold text-white bg-brand-600 px-1.5 py-0.5 rounded-sm">₹{savings} OFF</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Subscription details */}
      <div className="border-t border-gray-100 px-3 py-2.5 bg-gray-50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          <span>🔄 {FREQ_LABELS[frequency]}</span>
          <span>📦 Qty: {qty}</span>
          <span>📅 Next: {nextDate}</span>
        </div>
        <button onClick={() => setEditing((v) => !v)}
          className="flex-shrink-0 text-[11px] font-semibold text-brand-600 hover:text-brand-700">
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="border-t border-gray-100 px-3 py-3 bg-white space-y-3">
          {/* Frequency */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">Delivery Frequency</p>
            <div className="flex gap-2">
              {FREQ_OPTIONS.map((f) => (
                <button key={f} onClick={() => updateFrequency(sub.id, f)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded border transition-colors
                    ${frequency === f ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-600 hover:border-brand-400'}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">Quantity per Delivery</p>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center border-2 border-brand-600 rounded overflow-hidden">
                <button onClick={() => updateQty(sub.id, qty - 1)}
                  className="px-3 py-1.5 text-brand-600 font-bold text-base hover:bg-brand-50">−</button>
                <span className="text-sm font-bold text-brand-600 px-3">{qty}</span>
                <button onClick={() => updateQty(sub.id, qty + 1)}
                  className="px-3 py-1.5 text-brand-600 font-bold text-base hover:bg-brand-50">+</button>
              </div>
              <span className="text-xs text-gray-400">per delivery</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={() => addItem(product)}
              className="flex-1 py-2 text-xs font-bold rounded bg-brand-600 text-white hover:bg-brand-700 transition-colors">
              Add to Cart Now
            </button>
            <button onClick={() => { if (window.confirm('Cancel this subscription?')) unsubscribe(sub.id); }}
              className="px-4 py-2 text-xs font-bold rounded border border-red-300 text-red-600 hover:bg-red-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubscribedListPage() {
  const navigate       = useNavigate();
  const subscriptions  = useSubscriptionStore((s) => s.subscriptions);
  const active         = subscriptions.filter((s) => s.active);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header showSearch={false} />

      {/* ── Constrained content area ─────────────────────────────────────── */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 pb-10">

        {/* Page title */}
        <div className="bg-white border border-gray-200 rounded-xl mt-5 px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-800">My Subscriptions</h1>
            <p className="text-xs text-gray-400">{active.length} active subscription{active.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="mt-3 bg-brand-50 border border-brand-200 rounded-xl p-3 flex items-start gap-2">
          <span className="text-xl flex-shrink-0">🔄</span>
          <div>
            <p className="text-xs font-bold text-brand-700">How subscriptions work</p>
            <p className="text-[11px] text-brand-600 mt-0.5 leading-relaxed">
              Subscribe to products you buy regularly. We'll remind you before each delivery cycle. Modify or cancel anytime.
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {active.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
              <div className="text-6xl mb-4">🔄</div>
              <p className="text-base font-bold text-gray-700">No active subscriptions</p>
              <p className="text-sm text-gray-400 mt-1">Subscribe to products you buy regularly and never run out</p>
              <button onClick={() => navigate('/products')}
                className="mt-5 px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl text-sm
                           hover:bg-brand-700 active:scale-95 transition-all">
                Browse Products
              </button>
            </div>
          ) : (
            <>
              {active.map((sub) => <SubscriptionCard key={sub.id} sub={sub} />)}

              <div className="bg-white border border-gray-200 rounded-xl p-4 mt-2">
                <p className="text-xs font-bold text-gray-700 mb-1">💡 Subscribe more products</p>
                <p className="text-xs text-gray-400">Visit any product page to subscribe for regular delivery</p>
                <button onClick={() => navigate('/products')}
                  className="mt-3 w-full py-2 border border-brand-600 text-brand-600 font-bold text-xs rounded-xl hover:bg-brand-50 transition-colors">
                  Browse & Subscribe
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
