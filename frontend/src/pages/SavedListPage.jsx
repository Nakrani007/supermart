import { useNavigate } from 'react-router-dom';
import { useSavedStore } from '../store/savedStore.js';
import { useCart } from '../hooks/useCart.js';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

const CAT_EMOJI = {
  vegetables: '🥦', dairy: '🥛', staples: '🌾', snacks: '🍪',
  beverages: '☕', personal: '🧴', oils: '🫙',
};

function SavedCard({ item }) {
  const navigate   = useNavigate();
  const { removeItem: unsave } = useSavedStore();
  const { addItem, updateQuantity, getItemQuantity } = useCart();
  const qty        = getItemQuantity(item.id);
  const savings    = item.mrp > item.discountPrice ? Math.round(item.mrp - item.discountPrice) : 0;
  const emoji      = CAT_EMOJI[item.category?.slug] || '🛒';
  const outOfStock = item.stockQty === 0;

  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden flex">
      {/* Image */}
      <button onClick={() => navigate(`/products/${item.id}`)}
        className="w-28 flex-shrink-0 bg-gray-50 flex items-center justify-center p-3">
        {item.imageUrl
          ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain max-h-20" loading="lazy" />
          : <span className="text-4xl">{emoji}</span>}
      </button>

      {/* Info */}
      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <button onClick={() => navigate(`/products/${item.id}`)} className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{item.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.unit}</p>
          </button>
          <button onClick={() => unsave(item.id)}
            className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors p-1">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-base font-bold text-gray-900">₹{item.discountPrice}</span>
          {savings > 0 && (
            <>
              <span className="text-xs text-gray-400 line-through">₹{item.mrp}</span>
              <span className="text-[10px] font-bold text-white bg-brand-600 px-1.5 py-0.5 rounded-sm">₹{savings} OFF</span>
            </>
          )}
        </div>

        <div className="mt-2">
          {outOfStock ? (
            <span className="text-xs font-semibold text-red-500">Out of Stock</span>
          ) : qty === 0 ? (
            <button onClick={() => addItem(item)}
              className="px-4 py-1.5 text-xs font-bold rounded bg-brand-600 text-white
                         hover:bg-brand-700 active:scale-95 transition-all flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              ADD TO CART
            </button>
          ) : (
            <div className="inline-flex items-center border-2 border-brand-600 rounded overflow-hidden">
              <button onClick={() => updateQuantity(item.id, qty - 1)}
                className="px-2.5 py-1 text-brand-600 font-bold text-base">−</button>
              <span className="text-sm font-bold text-brand-600 px-2">{qty}</span>
              <button onClick={() => addItem(item)}
                disabled={qty >= item.stockQty}
                className="px-2.5 py-1 text-brand-600 font-bold text-base disabled:opacity-30">+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SavedListPage() {
  const navigate  = useNavigate();
  const items     = useSavedStore((s) => s.items);
  const removeItem = useSavedStore((s) => s.removeItem);
  const { addItem } = useCart();

  const clearAll  = () => [...items].forEach((i) => removeItem(i.id));
  const addAllToCart = () => items.forEach((item) => { if (item.stockQty > 0) addItem(item); });

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header showSearch={false} />

      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-800">My Saved List</h1>
          <p className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''} saved</p>
        </div>
        {items.length > 0 && (
          <button onClick={clearAll} className="text-xs text-red-500 font-semibold hover:text-red-700">
            Clear All
          </button>
        )}
      </div>

      <div className="p-3">
        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded border border-gray-200">
            <div className="text-6xl mb-4">❤️</div>
            <p className="text-base font-bold text-gray-700">Your saved list is empty</p>
            <p className="text-sm text-gray-400 mt-1">Save products you love to find them easily later</p>
            <button onClick={() => navigate('/products')}
              className="mt-5 px-6 py-2.5 bg-brand-600 text-white font-bold rounded text-sm
                         hover:bg-brand-700 active:scale-95 transition-all">
              Browse Products
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {items.map((item) => <SavedCard key={item.id} item={item} />)}
            </div>

            {/* Move all to cart */}
            <button onClick={addAllToCart}
              className="mt-4 w-full py-3 bg-brand-600 text-white font-bold rounded text-sm
                         hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Add All to Cart
            </button>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
