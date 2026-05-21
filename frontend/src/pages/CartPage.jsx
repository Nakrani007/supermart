// CartPage.jsx
// The most business-critical page: converts browse to purchase.
// Key behaviors:
//   - Works for guests (shows auth modal before checkout)
//   - Offline: shows stale cart, blocks checkout with explanation
//   - Race condition: handles "only N left" error from backend gracefully
//   - Address and slot captured inline (no separate checkout page = fewer drop-offs)

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, useCartItems, useCartTotals } from '../store/cartStore.js';
import { useAuthStore } from '../store/authStore.js';
import { ordersApi } from '../api/orders.api.js';
import AuthModal from '../components/common/AuthModal.jsx';
import BachatTracker from '../components/cart/BachatTracker.jsx';
import CheckoutSelector from '../components/cart/CheckoutSelector.jsx';
import { formatPrice } from '../utils/currency.js';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

// Address form state shape
const EMPTY_ADDRESS = {
  line1: '', line2: '', city: 'Surat', pincode: '', landmark: '',
};

export default function CartPage() {
  const navigate = useNavigate();
  const items = useCartItems();
  const { subtotal, totalMRP, savings } = useCartTotals();
  const { updateQuantity, removeItem, clearCart } = useCartStore();
  const { token, user } = useAuthStore();

  const [showAuth, setShowAuth] = useState(false);
  const [fulfillment, setFulfillment] = useState({
    fulfillmentType: 'HOME_DELIVERY',
    deliverySlotId: null,
    deliveryFee: 40,
  });
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [stockConflict, setStockConflict] = useState(null); // { productId, available }
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [successOrder, setSuccessOrder] = useState(null);

  // Listen for network status changes
  useState(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  });

  const total = subtotal + fulfillment.deliveryFee;
  const isDelivery = fulfillment.fulfillmentType === 'HOME_DELIVERY';

  // Validates address form — only for home delivery
  const isAddressValid = useCallback(() => {
    if (!isDelivery) return true;
    return (
      address.line1.trim().length >= 5 &&
      address.city.trim().length >= 2 &&
      /^\d{6}$/.test(address.pincode)
    );
  }, [isDelivery, address]);

  const isReadyToCheckout = useCallback(() => {
    if (items.length === 0) return false;
    if (!isAddressValid()) return false;
    if (isDelivery && !fulfillment.deliverySlotId) return false;
    return true;
  }, [items, isAddressValid, isDelivery, fulfillment.deliverySlotId]);

  // ── Checkout trigger ─────────────────────────────────────────────────────────
  const handleCheckout = () => {
    if (!token) {
      setShowAuth(true); // Guest — trigger auth modal
      return;
    }
    placeOrder();
  };

  const placeOrder = async () => {
    if (!isReadyToCheckout()) return;

    setPlacing(true);
    setOrderError(null);
    setStockConflict(null);

    const payload = {
      cartItems: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      fulfillmentType: fulfillment.fulfillmentType,
      deliverySlotId: fulfillment.deliverySlotId || undefined,
      address: isDelivery ? address : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await ordersApi.create(payload);
      clearCart();
      setSuccessOrder(res.order);
    } catch (err) {
      if (err.offline) {
        setOrderError('You are offline. Please check your connection and try again.');
        return;
      }

      if (err.status === 409 && err.productId) {
        // Stock conflict — backend told us exactly how much is left
        setStockConflict({ productId: err.productId, available: err.available });
        // Adjust quantity in cart to match available stock
        if (err.available === 0) {
          removeItem(err.productId);
        } else {
          updateQuantity(err.productId, err.available);
        }
        setOrderError(
          err.available === 0
            ? `One item went out of stock. It has been removed from your cart.`
            : `Stock updated: only ${err.available} unit(s) available. Cart adjusted.`
        );
        return;
      }

      setOrderError(err.message || 'Order failed. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────────
  if (successOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Order Placed!</h2>
          <p className="text-gray-500 text-sm mb-4">
            Order #{successOrder.orderNumber}
          </p>
          <div className="bg-brand-50 rounded-xl px-4 py-3 mb-6 text-left space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-gray-900">{formatPrice(successOrder.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fulfillment</span>
              <span className="font-medium text-gray-700">
                {successOrder.fulfillmentType === 'STORE_PICKUP' ? 'Store Pickup' : 'Home Delivery'}
              </span>
            </div>
            {successOrder.deliverySlot && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Slot</span>
                <span className="font-medium text-gray-700">
                  {successOrder.deliverySlot.startTime}–{successOrder.deliverySlot.endTime}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 active:scale-95 transition-all"
          >
            Continue Shopping
          </button>
        </div>
      </div>
      <Footer />
    </div>
    );
  }

  // ── Empty cart ───────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 text-sm mb-6">Add items from the store to get started</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 active:scale-95 transition-all"
        >
          Shop Now
        </button>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Main cart layout ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        {/* Sub-header */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-600 p-1 -ml-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900 flex-1">My Cart</h1>
          <span className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Offline banner */}
        {isOffline && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
            <span>⚠️</span>
            <span>You are offline. Checkout unavailable until reconnected.</span>
          </div>
        )}

        <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-40">
          {/* Bachat tracker */}
          {savings > 0 && <BachatTracker savings={savings} subtotal={subtotal} />}

          {/* Cart items */}
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 overflow-hidden">
            {items.map(({ product, quantity }) => (
              <CartItem
                key={product.id}
                product={product}
                quantity={quantity}
                onUpdate={(qty) => updateQuantity(product.id, qty)}
                onRemove={() => removeItem(product.id)}
                hasConflict={stockConflict?.productId === product.id}
              />
            ))}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Delivery instructions (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Leave at door, call before delivery..."
              rows={2}
              maxLength={300}
              className="w-full text-sm text-gray-700 outline-none resize-none placeholder-gray-400"
            />
          </div>

          {/* Fulfillment selector */}
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Delivery Option</h3>
            <CheckoutSelector
              subtotal={subtotal}
              value={fulfillment.fulfillmentType}
              onChange={setFulfillment}
            />
          </div>

          {/* Address form — only for home delivery */}
          {isDelivery && (
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-800">Delivery Address</h3>
              <AddressForm address={address} onChange={setAddress} />
            </div>
          )}

          {/* Order error */}
          {orderError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {orderError}
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom bar — checkout summary + CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 px-4 py-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-lg mx-auto">
          {/* Price breakdown */}
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
          </div>
          {fulfillment.deliveryFee > 0 && (
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Delivery fee</span>
              <span className="font-medium text-gray-900">{formatPrice(fulfillment.deliveryFee)}</span>
            </div>
          )}
          {savings > 0 && (
            <div className="flex justify-between text-sm mb-2">
              <span className="text-amber-600 font-medium">You save</span>
              <span className="text-amber-600 font-bold">{formatPrice(savings)}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div>
              <div className="text-lg font-bold text-gray-900">{formatPrice(total)}</div>
              <div className="text-xs text-gray-400">Total payable</div>
            </div>
            <button
              onClick={handleCheckout}
              disabled={placing || isOffline || !isReadyToCheckout()}
              className="flex-1 py-3.5 bg-brand-600 text-white rounded-xl font-bold text-base
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:bg-brand-700 active:scale-95 transition-all"
            >
              {placing ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> Placing order...
                </span>
              ) : !token ? (
                'Login & Checkout'
              ) : (
                'Place Order →'
              )}
            </button>
          </div>
        </div>
        <Footer />
      </div>

      {/* Auth modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
            placeOrder(); // auto-proceed after login
          }}
        />
      )}
    </>
  );
}

// ── CartItem sub-component ────────────────────────────────────────────────────

function CartItem({ product, quantity, onUpdate, onRemove, hasConflict }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${hasConflict ? 'bg-amber-50' : ''}`}>
      {/* Product image */}
      <div className="w-14 h-14 flex-shrink-0 rounded-xl bg-gray-50 overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🛒</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.name}</p>
        <p className="text-xs text-gray-400">{product.unit}</p>
        {hasConflict && (
          <p className="text-xs text-amber-600 font-medium mt-0.5">
            Only {product.stockQty} available
          </p>
        )}
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-sm font-bold text-gray-900">{formatPrice(product.discountPrice)}</span>
          {Number(product.mrp) > Number(product.discountPrice) && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(product.mrp)}</span>
          )}
        </div>
      </div>

      {/* Quantity stepper */}
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center bg-brand-50 rounded-xl overflow-hidden border border-brand-100">
          <button
            onClick={() => onUpdate(quantity - 1)}
            className="w-8 h-8 flex items-center justify-center text-brand-600 hover:bg-brand-100 font-bold text-lg transition-colors"
          >
            −
          </button>
          <span className="w-7 text-center text-sm font-bold text-gray-900">{quantity}</span>
          <button
            onClick={() => onUpdate(quantity + 1)}
            disabled={quantity >= product.stockQty}
            className="w-8 h-8 flex items-center justify-center text-brand-600 hover:bg-brand-100
                       font-bold text-lg disabled:opacity-30 transition-colors"
          >
            +
          </button>
        </div>
        <button
          onClick={onRemove}
          className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ── Address form ──────────────────────────────────────────────────────────────

function AddressForm({ address, onChange }) {
  const field = (key) => ({
    value: address[key],
    onChange: (e) => onChange((prev) => ({ ...prev, [key]: e.target.value })),
    className:
      'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-500 transition-colors',
  });

  return (
    <div className="space-y-2.5">
      <input placeholder="Flat/Building, Street *" {...field('line1')} />
      <input placeholder="Area / Locality (optional)" {...field('line2')} />
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="City *" {...field('city')} />
        <input
          placeholder="Pincode *"
          inputMode="numeric"
          maxLength={6}
          {...field('pincode')}
          onChange={(e) =>
            onChange((prev) => ({ ...prev, pincode: e.target.value.replace(/\D/g, '') }))
          }
        />
      </div>
      <input placeholder="Landmark (optional)" {...field('landmark')} />
    </div>
  );
}

// ── Inline spinner ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}
