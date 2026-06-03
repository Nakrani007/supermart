// DMart-style product card — used on homepage sections and product listing.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart.js';
import { useSavedStore } from '../../store/savedStore.js';
import { useIsAuthenticated } from '../../store/authStore.js';

const CAT_EMOJI = {
  vegetables: '🥦', dairy: '🥛', staples: '🌾', snacks: '🍪',
  beverages: '☕', personal: '🧴', oils: '🫙', fruits: '🍎',
};

const LABEL_META = {
  isBestSeller: { text: 'Best Seller', cls: 'bg-amber-400 text-amber-900' },
  isClearance:  { text: 'Clearance',   cls: 'bg-red-500   text-white'     },
  isWeeklySaver:{ text: 'Saver',       cls: 'bg-green-500 text-white'     },
};

export default function ProductCard({ product, lang = 'en', compact = false }) {
  const navigate   = useNavigate();
  const isAuthed   = useIsAuthenticated();
  const { addItem, updateQuantity, getItemQuantity } = useCart();
  const toggleSave = useSavedStore((s) => s.toggleSave);
  const isSaved    = useSavedStore((s) => s.isSaved(product.id));
  const qty        = getItemQuantity(product.id);
  const outOfStock = product.stockQty === 0;

  const [adding, setAdding] = useState(false);

  const displayName = (lang === 'hi' && product.nameHi) || (lang === 'gu' && product.nameGu) || product.name;
  const savings     = product.mrp > product.discountPrice ? Math.round(product.mrp - product.discountPrice) : 0;
  const discPct     = savings > 0 ? Math.round((savings / product.mrp) * 100) : 0;
  const emoji       = CAT_EMOJI[product.category?.slug] || '🛒';

  // Which label to show (priority: clearance > bestSeller > weeklySaver)
  const labelKey = ['isClearance','isBestSeller','isWeeklySaver'].find(k => product[k]);
  const label    = labelKey ? LABEL_META[labelKey] : null;

  const handleAdd = async () => {
    setAdding(true);
    addItem(product);
    setTimeout(() => setAdding(false), 400);
  };

  return (
    <div className={`group bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col
      hover:shadow-lg hover:border-gray-300 transition-all duration-200
      ${outOfStock ? 'opacity-75' : ''} ${compact ? 'w-36 flex-shrink-0' : ''}`}>

      {/* ── Image area ──────────────────────────────────────────────────── */}
      <div className="relative bg-gray-50 overflow-hidden" style={{ paddingTop: compact ? '80%' : '100%' }}>
        <button onClick={() => navigate(`/products/${product.id}`)}
          className="absolute inset-0 flex items-center justify-center p-3">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={displayName}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              loading="lazy" decoding="async" />
          ) : (
            <span className={`${compact ? 'text-4xl' : 'text-5xl'} select-none`}>{emoji}</span>
          )}
        </button>

        {/* Top-left: label badge */}
        {label && (
          <span className={`absolute top-1.5 left-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm
                            leading-none z-10 uppercase tracking-wide ${label.cls}`}>
            {label.text}
          </span>
        )}

        {/* Top-right: discount % badge */}
        {discPct >= 5 && !label && (
          <span className="absolute top-1.5 left-1.5 text-[9px] font-extrabold bg-green-600 text-white
                           px-1.5 py-0.5 rounded-sm leading-none z-10">
            {discPct}% OFF
          </span>
        )}

        {/* Wishlist heart */}
        {isAuthed && (
          <button onClick={(e) => { e.stopPropagation(); toggleSave(product); }}
            className="absolute top-1.5 right-1.5 w-7 h-7 bg-white/90 rounded-full shadow-sm
                       flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10">
            <svg className="w-4 h-4" fill={isSaved ? '#ef4444' : 'none'} stroke={isSaved ? '#ef4444' : '#9ca3af'}
              viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        )}

        {/* Out-of-stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Out of Stock</span>
          </div>
        )}
      </div>

      {/* ── Product info ────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 px-2.5 pt-2 pb-2.5">

        {/* Name */}
        <p className={`font-medium text-gray-800 leading-snug line-clamp-2 mb-2 flex-1
                       ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {displayName}
        </p>

        {/* Price block — MRP | SuperMart | ₹XX OFF */}
        <div className="flex items-start justify-between gap-1 mb-0.5">
          <div>
            {/* Labels row */}
            <div className={`flex gap-2 ${compact ? 'text-[8px]' : 'text-[9px]'} text-gray-400 font-medium mb-0.5`}>
              <span>MRP</span>
              <span className="text-brand-700 font-semibold">Price</span>
            </div>
            {/* Values row */}
            <div className="flex items-baseline gap-1.5">
              {savings > 0 && (
                <span className={`text-gray-400 line-through ${compact ? 'text-[10px]' : 'text-xs'}`}>₹{product.mrp}</span>
              )}
              <span className={`font-bold text-gray-900 ${compact ? 'text-sm' : 'text-sm'}`}>₹{product.discountPrice}</span>
            </div>
          </div>

          {/* OFF badge */}
          {savings > 0 && (
            <div className="bg-green-50 border border-green-200 rounded text-center px-1.5 py-0.5 flex-shrink-0">
              <p className="text-[9px] font-extrabold text-green-700 leading-none">₹{savings}</p>
              <p className="text-[8px] font-bold text-green-600 leading-none">OFF</p>
            </div>
          )}
        </div>

        {/* Taxes note */}
        {!compact && (
          <p className="text-[9px] text-gray-400 mb-2">incl. of all taxes</p>
        )}

        {/* Unit */}
        <p className={`text-gray-400 mb-2 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{product.unit}</p>

        {/* ── Cart control — fixed height so card never grows ─────────── */}
        {outOfStock ? (
          <button disabled
            className={`w-full flex items-center justify-center text-xs font-semibold border
                        border-gray-200 rounded-lg text-gray-400 cursor-not-allowed
                        ${compact ? 'h-8' : 'h-9'}`}>
            Out of Stock
          </button>
        ) : qty === 0 ? (
          <button onClick={handleAdd}
            className={`w-full font-bold rounded-lg flex items-center justify-center gap-1.5
                        bg-brand-600 text-white hover:bg-brand-700 active:scale-95 transition-all
                        ${adding ? 'scale-95' : ''} ${compact ? 'h-8 text-[10px]' : 'h-9 text-xs'}`}>
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            ADD TO CART
          </button>
        ) : (
          <div className={`flex items-stretch border-2 border-brand-600 rounded-lg overflow-hidden
                           ${compact ? 'h-8' : 'h-9'}`}>
            <button onClick={() => updateQuantity(product.id, qty - 1)}
              className="flex-1 flex items-center justify-center text-brand-600 text-base font-bold
                         hover:bg-brand-50 active:bg-brand-100 transition-colors">
              −
            </button>
            <span className="flex items-center justify-center px-2 text-sm font-bold text-brand-600
                             min-w-[2rem] border-x border-brand-200">
              {qty}
            </span>
            <button onClick={handleAdd} disabled={qty >= product.stockQty}
              className="flex-1 flex items-center justify-center text-brand-600 text-base font-bold
                         hover:bg-brand-50 disabled:opacity-30 active:bg-brand-100 transition-colors">
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
