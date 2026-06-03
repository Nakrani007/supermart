// CartPage.jsx
// The most business-critical page: converts browse to purchase.
// Key behaviors:
//   - Works for guests (shows auth modal before checkout)
//   - Offline: shows stale cart, blocks checkout with explanation
//   - Race condition: handles "only N left" error from backend gracefully
//   - Address and slot captured inline (no separate checkout page = fewer drop-offs)

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, useCartItems, useCartTotals } from '../store/cartStore.js';
import { useAuthStore } from '../store/authStore.js';
import { useStoreSelectionStore } from '../store/storeSelectionStore.js';
import { ordersApi } from '../api/orders.api.js';
import { authApi } from '../api/auth.api.js';
import { publicApi } from '../api/admin.api.js';
import { productsApi } from '../api/products.api.js';
import AuthModal from '../components/common/AuthModal.jsx';
import BachatTracker from '../components/cart/BachatTracker.jsx';
import CheckoutSelector from '../components/cart/CheckoutSelector.jsx';
import DeliveryZoneCheck from '../components/cart/DeliveryZoneCheck.jsx';
import { formatPrice } from '../utils/currency.js';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';

// ── Constants (fallback — overridden by live zone settings from backend) ─────
const DEFAULT_STORE_LAT   = 21.2094;
const DEFAULT_STORE_LNG   = 72.8261;
const DEFAULT_DELIVERY_KM = 5;

function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const LABEL_ICON = { Home: '🏠', Office: '🏢', Other: '📍' };

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
  // { eligible: true|false|null, coords: {lat,lng}|null, distanceKm?: number }
  const [locationResult, setLocationResult] = useState({ eligible: null, coords: null });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [successOrder, setSuccessOrder] = useState(null);

  // Saved address state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [showAddrPicker, setShowAddrPicker] = useState(false);
  const [addrLoading,    setAddrLoading]    = useState(false);
  const [useManualAddr,  setUseManualAddr]  = useState(false);

  // Live delivery zone settings from backend
  const [zoneSettings, setZoneSettings] = useState({
    radiusKm:        DEFAULT_DELIVERY_KM,
    allowedPincodes: [],
    storeLat:        DEFAULT_STORE_LAT,
    storeLng:        DEFAULT_STORE_LNG,
  });

  useEffect(() => {
    publicApi.getDeliveryZone()
      .then((r) => { if (r?.zone) setZoneSettings(r.zone); })
      .catch(() => {});
  }, []);

  // ── Global store selection (persisted across pages) ──────────────────────────
  const {
    selectedStore,
    setSelectedStore,
    unavailableProductIds,
    setUnavailableProducts,
    clearUnavailable,
  } = useStoreSelectionStore();

  const [activeStores,    setActiveStores]    = useState([]);
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [userGps,         setUserGps]         = useState(null);
  const [storeWarning,    setStoreWarning]    = useState(null); // { store } when confirming change
  const [validating,      setValidating]      = useState(false);

  // Auto-select nearest store — only if nothing is selected yet
  const autoSelectNearest = useCallback((stores, coords) => {
    if (!stores.length) return;
    if (!coords) {
      const main = stores.find((s) => s.isMain) || stores[0];
      setSelectedStore(main);
      return;
    }
    let nearest = stores[0];
    let minDist = Infinity;
    stores.forEach((s) => {
      if (s.lat == null || s.lng == null) return;
      const d = haversineKm(coords.lat, coords.lng, s.lat, s.lng);
      if (d < minDist) { minDist = d; nearest = s; }
    });
    setSelectedStore(nearest);
  }, [setSelectedStore]);

  useEffect(() => {
    publicApi.getStores()
      .then((r) => {
        const stores = r.stores || [];
        setActiveStores(stores);
        // Only auto-select if no store is currently selected globally
        if (!selectedStore) {
          navigator.geolocation?.getCurrentPosition(
            ({ coords }) => {
              const gps = { lat: coords.latitude, lng: coords.longitude };
              setUserGps(gps);
              autoSelectNearest(stores, gps);
            },
            () => autoSelectNearest(stores, null),
            { timeout: 6000, maximumAge: 120000 }
          );
          if (!navigator.geolocation) autoSelectNearest(stores, null);
        }
      })
      .catch(() => {});
  }, [autoSelectNearest]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Validate cart whenever selected store changes ─────────────────────────────
  useEffect(() => {
    if (!selectedStore || items.length === 0) {
      clearUnavailable();
      return;
    }
    setValidating(true);
    const cartItems = items.map((i) => ({ productId: i.product.id, quantity: i.quantity }));
    productsApi.validateCart(selectedStore.id, cartItems)
      .then((r) => setUnavailableProducts((r.unavailableItems || []).map((u) => u.productId)))
      .catch(() => clearUnavailable())
      .finally(() => setValidating(false));
  }, [selectedStore?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (unavailableProductIds.length > 0) return false; // block until resolved
    if (!isAddressValid()) return false;
    if (isDelivery && locationResult.eligible === false) return false;
    return true;
  }, [items, unavailableProductIds, isAddressValid, isDelivery, locationResult.eligible]);

  // ── Saved-address helpers ─────────────────────────────────────────────────────
  const selectSavedAddress = useCallback((addr) => {
    setSelectedAddrId(addr.id);
    setAddress({
      line1:    addr.line1,
      line2:    addr.line2    || '',
      city:     addr.city,
      pincode:  addr.pincode,
      landmark: addr.landmark || '',
    });
    // Zone check: GPS distance from selected store OR pincode whitelist
    const pincodeOk  = zoneSettings.allowedPincodes.includes((addr.pincode || '').trim());
    const originLat  = selectedStore?.lat  ?? zoneSettings.storeLat;
    const originLng  = selectedStore?.lng  ?? zoneSettings.storeLng;
    if (addr.lat != null && addr.lng != null) {
      const dist = haversineKm(addr.lat, addr.lng, originLat, originLng);
      const eligible = dist <= zoneSettings.radiusKm || pincodeOk;
      setLocationResult({ eligible, coords: { lat: addr.lat, lng: addr.lng }, distanceKm: dist });
    } else if (pincodeOk) {
      setLocationResult({ eligible: true, coords: null, pincodeMatch: true });
    } else {
      setLocationResult({ eligible: null, coords: null });
    }
    setShowAddrPicker(false);
    setUseManualAddr(false);
  }, [zoneSettings, selectedStore]);

  // Fetch user's saved addresses on mount (when logged in)
  useEffect(() => {
    if (!token) return;
    setAddrLoading(true);
    authApi.getProfile()
      .then((r) => {
        const addrs = r.user?.addresses || [];
        setSavedAddresses(addrs);
        if (addrs.length > 0) {
          const def = addrs.find((a) => a.isDefault) || addrs[0];
          selectSavedAddress(def);
        }
      })
      .catch(() => {})
      .finally(() => setAddrLoading(false));
  }, [token, selectSavedAddress]);

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
      // Send GPS coords so backend can double-check the delivery zone
      deliveryLocation: isDelivery && locationResult.coords ? locationResult.coords : undefined,
      storeId: selectedStore?.id || undefined,
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

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">

        {/* Bachat tracker */}
        {savings > 0 && <BachatTracker savings={savings} subtotal={subtotal} />}

        {/* Unavailable items warning banner */}
        {unavailableProductIds.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <div className="flex items-start gap-2.5 mb-2.5">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-bold text-red-700">
                  {unavailableProductIds.length} item{unavailableProductIds.length !== 1 ? 's' : ''} not available at {selectedStore?.name || 'this store'}
                </p>
                <p className="text-xs text-red-500 mt-0.5">
                  Remove or replace them before placing your order.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                unavailableProductIds.forEach((id) => removeItem(id));
                clearUnavailable();
              }}
              className="w-full py-2 border border-red-300 rounded-xl text-xs font-bold text-red-600
                         hover:bg-red-100 active:scale-95 transition-all">
              Remove All Unavailable Items
            </button>
          </div>
        )}

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
              isUnavailable={unavailableProductIds.includes(product.id)}
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
            onChange={(f) => {
              setFulfillment(f);
              if (f.fulfillmentType !== 'HOME_DELIVERY') {
                setLocationResult({ eligible: null, coords: null });
              }
            }}
          />
        </div>

        {/* Store selector — shows for both delivery and pickup */}
        {activeStores.length > 0 && (
          <StoreSelector
            stores={activeStores}
            selected={selectedStore}
            userGps={userGps}
            isPickup={!isDelivery}
            validating={validating}
            unavailableCount={unavailableProductIds.length}
            onChangeStore={() => setShowStorePicker(true)}
          />
        )}

        {/* Delivery address section — only for home delivery */}
        {isDelivery && (
          addrLoading ? (
            /* Loading addresses */
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-6 flex items-center justify-center gap-3">
              <Spinner />
              <span className="text-sm text-gray-500">Loading your addresses…</span>
            </div>
          ) : savedAddresses.length > 0 && !useManualAddr ? (
            /* Show selected saved address */
            <SavedAddressCard
              address={savedAddresses.find((a) => a.id === selectedAddrId) || savedAddresses[0]}
              locationResult={locationResult}
              zoneSettings={zoneSettings}
              onChangeAddress={() => setShowAddrPicker(true)}
            />
          ) : (
            /* Manual address entry */
            <div className="space-y-4">
              {savedAddresses.length > 0 && (
                <button
                  onClick={() => {
                    const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
                    selectSavedAddress(def);
                  }}
                  className="text-sm text-brand-600 font-semibold flex items-center gap-1 hover:text-brand-700 transition-colors"
                >
                  ← Use saved address
                </button>
              )}
              <DeliveryZoneCheck onResult={setLocationResult} />
              <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-800">Delivery Address</h3>
                <AddressForm address={address} onChange={setAddress} />
              </div>
            </div>
          )
        )}

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 space-y-2.5">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Order Summary</h3>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
          </div>
          {fulfillment.deliveryFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery fee</span>
              <span className="font-medium text-gray-900">{formatPrice(fulfillment.deliveryFee)}</span>
            </div>
          )}
          {savings > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-amber-600 font-medium">You save</span>
              <span className="text-amber-600 font-bold">− {formatPrice(savings)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900 pt-2.5 border-t border-gray-100">
            <span>Total payable</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>

        {/* Order error */}
        {orderError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {orderError}
          </div>
        )}

        {/* Place Order button */}
        <button
          onClick={handleCheckout}
          disabled={placing || isOffline || !isReadyToCheckout()}
          className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold text-base
                     disabled:opacity-50 disabled:cursor-not-allowed
                     hover:bg-brand-700 active:scale-95 transition-all"
        >
          {placing ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> Placing order...
            </span>
          ) : !token ? (
            'Login & Checkout'
          ) : unavailableProductIds.length > 0 ? (
            `⚠️ Resolve ${unavailableProductIds.length} Unavailable Item${unavailableProductIds.length !== 1 ? 's' : ''}`
          ) : isDelivery && locationResult.eligible === false ? (
            '❌ Outside Delivery Zone'
          ) : (
            'Place Order →'
          )}
        </button>

        <div className="pb-4" />
      </div>

      <Footer />

      {/* Auth modal */}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
            placeOrder();
          }}
        />
      )}

      {/* Store change warning modal */}
      {storeWarning && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 z-10">
            <div className="text-3xl text-center mb-3">🏪</div>
            <h3 className="text-base font-bold text-gray-900 text-center mb-1">Changing Store?</h3>
            <p className="text-sm text-gray-500 text-center mb-4 leading-relaxed">
              You are changing your store to{' '}
              <span className="font-semibold text-gray-800">{storeWarning.store.name}</span>.
              Some products in your cart may not be available at the selected store.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setStoreWarning(null)}
                className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600
                           hover:border-gray-300 hover:bg-gray-50 active:scale-95 transition-all">
                Keep Current
              </button>
              <button
                onClick={() => {
                  setSelectedStore(storeWarning.store);
                  setStoreWarning(null);
                  setShowStorePicker(false);
                }}
                className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold
                           hover:bg-brand-700 active:scale-95 transition-all">
                Change Store
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store picker bottom sheet */}
      {showStorePicker && (
        <div className="fixed inset-0 z-[700] flex flex-col justify-end" onClick={() => setShowStorePicker(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-t-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Select Store</h3>
              <button onClick={() => setShowStorePicker(false)} className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
              {activeStores.map((store) => {
                const isSelected = store.id === selectedStore?.id;
                const dist = (userGps && store.lat && store.lng)
                  ? haversineKm(userGps.lat, userGps.lng, store.lat, store.lng)
                  : null;
                return (
                  <button key={store.id} onClick={() => {
                    if (isSelected) { setShowStorePicker(false); return; }
                    if (items.length > 0) {
                      setStoreWarning({ store }); // show confirmation
                    } else {
                      setSelectedStore(store);
                      setShowStorePicker(false);
                    }
                  }}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex gap-3
                      ${isSelected ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-gray-50 hover:border-gray-300'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${isSelected ? 'bg-brand-100' : 'bg-white'}`}>
                      🏪
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">{store.name}</p>
                        {store.isMain && <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full">Main</span>}
                        {dist != null && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${dist <= zoneSettings.radiusKm ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-100'}`}>
                            {dist.toFixed(1)} km away
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{store.address}, {store.city} – {store.pincode}</p>
                      {store.openTime && <p className="text-xs text-gray-400 mt-0.5">🕐 {store.openTime} – {store.closeTime}</p>}
                    </div>
                    {isSelected && <span className="text-brand-600 text-lg font-bold flex-shrink-0 self-center">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Address picker bottom sheet */}
      {showAddrPicker && (
        <div
          className="fixed inset-0 z-[700] flex flex-col justify-end"
          onClick={() => setShowAddrPicker(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-t-3xl max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Select Delivery Address</h3>
              <button
                onClick={() => setShowAddrPicker(false)}
                className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>
            {/* Address list */}
            <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2.5">
              {savedAddresses.map((addr) => {
                const icon = LABEL_ICON[addr.label] || '📍';
                const isSelected = addr.id === selectedAddrId;
                const hasCoords  = addr.lat != null && addr.lng != null;
                const pincodeOk  = zoneSettings.allowedPincodes.includes((addr.pincode || '').trim());
                const zoneOk     = hasCoords
                  ? haversineKm(addr.lat, addr.lng, zoneSettings.storeLat, zoneSettings.storeLng) <= zoneSettings.radiusKm || pincodeOk
                  : pincodeOk ? true : null;
                return (
                  <button
                    key={addr.id}
                    onClick={() => selectSavedAddress(addr)}
                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-start gap-3
                      ${isSelected
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-100 bg-gray-50 hover:border-gray-300'}`}
                  >
                    <span className="text-xl mt-0.5">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">{addr.label || 'Home'}</p>
                        {addr.isDefault && (
                          <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                        {zoneOk === true && (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                            ✓ In zone
                          </span>
                        )}
                        {zoneOk === false && (
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                            ✗ Out of zone
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{addr.line1}</p>
                      {addr.line2 && <p className="text-xs text-gray-400">{addr.line2}</p>}
                      <p className="text-xs text-gray-500">{addr.city} – {addr.pincode}</p>
                    </div>
                    {isSelected && (
                      <span className="text-brand-600 text-lg font-bold flex-shrink-0">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Enter different address */}
            <div className="px-4 py-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowAddrPicker(false);
                  setUseManualAddr(true);
                  setAddress(EMPTY_ADDRESS);
                  setLocationResult({ eligible: null, coords: null });
                  setSelectedAddrId(null);
                }}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-semibold
                           text-gray-600 hover:border-brand-500 hover:text-brand-600 transition-all
                           flex items-center justify-center gap-2"
              >
                <span className="text-lg leading-none">＋</span>
                Enter a different address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Store Map Preview ─────────────────────────────────────────────────────────
// Small read-only Leaflet map showing the store pin + user location

function StoreMapPreview({ store, userGps }) {
  const divRef    = useRef(null);
  const mapRef    = useRef(null);

  useEffect(() => {
    const L = window.L;
    if (!L || !store?.lat || !store?.lng) return;

    // Remove previous map instance
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = L.map(divRef.current, {
      zoomControl:       false,
      dragging:          false,
      touchZoom:         false,
      doubleClickZoom:   false,
      scrollWheelZoom:   false,
      keyboard:          false,
      attributionControl: false,
    }).setView([store.lat, store.lng], 15);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Store pin — green teardrop
    const storeIcon = L.divIcon({
      html: `<div style="width:22px;height:22px;background:#16a34a;border:3px solid #fff;
                          border-radius:50% 50% 50% 0;transform:rotate(-45deg);
                          box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
      iconSize: [22, 22], iconAnchor: [11, 22], className: '',
    });
    L.marker([store.lat, store.lng], { icon: storeIcon })
      .addTo(map)
      .bindTooltip(store.name, { permanent: true, direction: 'top', offset: [0, -20],
        className: 'bg-white text-gray-900 text-xs font-bold border-0 shadow-lg rounded-lg px-2 py-1' });

    // User location — blue dot
    if (userGps?.lat && userGps?.lng) {
      const userIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:#3b82f6;border:3px solid #fff;
                            border-radius:50%;box-shadow:0 2px 6px rgba(59,130,246,.5)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7], className: '',
      });
      L.marker([userGps.lat, userGps.lng], { icon: userIcon })
        .addTo(map)
        .bindTooltip('You', { permanent: false, direction: 'top' });

      // Fit map to show both store and user
      map.fitBounds(
        [[store.lat, store.lng], [userGps.lat, userGps.lng]],
        { padding: [30, 30], maxZoom: 15 }
      );
    }

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [store?.id, userGps?.lat, userGps?.lng]); // eslint-disable-line

  if (!store?.lat || !store?.lng) return null;
  return <div ref={divRef} className="h-44 w-full rounded-xl overflow-hidden" style={{ isolation: 'isolate' }} />;
}

// ── Store Selector card ────────────────────────────────────────────────────────

function StoreSelector({ stores, selected, userGps, isPickup, validating, unavailableCount, onChangeStore }) {
  const dist = (userGps && selected?.lat && selected?.lng)
    ? haversineKm(userGps.lat, userGps.lng, selected.lat, selected.lng)
    : null;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-colors
                     ${unavailableCount > 0 ? 'border-red-200' : 'border-gray-100'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-bold text-gray-800">
            {isPickup ? '🏪 Pickup From' : '🚚 Delivering From'}
          </h3>
          {validating && (
            <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
              <Spinner /> checking stock…
            </span>
          )}
          {!validating && unavailableCount > 0 && (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
              {unavailableCount} unavailable
            </span>
          )}
          {!validating && unavailableCount === 0 && selected && (
            <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
              All in stock ✓
            </span>
          )}
        </div>
        {stores.length > 1 && (
          <button onClick={onChangeStore}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0 ml-2">
            Change
          </button>
        )}
      </div>

      {selected ? (
        <>
          {/* Store info row */}
          <div className="flex items-start gap-3 px-4 pb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-lg flex-shrink-0">
              🏪
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-gray-900">{selected.name}</p>
                {dist != null && (
                  <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                    {dist.toFixed(1)} km away
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {selected.address}, {selected.city} – {selected.pincode}
              </p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {selected.openTime && (
                  <span className="text-xs text-gray-400">
                    🕐 {selected.openTime} – {selected.closeTime}
                  </span>
                )}
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    📞 {selected.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Inline map */}
          <div className="px-4 pb-4">
            <StoreMapPreview store={selected} userGps={userGps} />
            {selected.lat && selected.lng && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                target="_blank" rel="noreferrer"
                className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                🗺 Get Directions on Google Maps ↗
              </a>
            )}
          </div>
        </>
      ) : (
        <div className="px-4 pb-4 text-sm text-gray-400">Detecting nearest store…</div>
      )}
    </div>
  );
}

// ── CartItem sub-component ────────────────────────────────────────────────────

function CartItem({ product, quantity, onUpdate, onRemove, hasConflict, isUnavailable }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3
      ${isUnavailable ? 'bg-red-50' : hasConflict ? 'bg-amber-50' : ''}`}>
      {/* Product image */}
      <div className={`w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden
                       ${isUnavailable ? 'bg-red-50 opacity-50' : 'bg-gray-50'}`}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🛒</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium line-clamp-1 ${isUnavailable ? 'text-gray-400' : 'text-gray-900'}`}>
          {product.name}
        </p>
        <p className="text-xs text-gray-400">{product.unit}</p>
        {isUnavailable ? (
          <p className="text-xs text-red-500 font-semibold mt-0.5">
            ✗ Not available at this store
          </p>
        ) : hasConflict ? (
          <p className="text-xs text-amber-600 font-medium mt-0.5">
            Only {product.stockQty} available
          </p>
        ) : null}
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className={`text-sm font-bold ${isUnavailable ? 'text-gray-400' : 'text-gray-900'}`}>
            {formatPrice(product.discountPrice)}
          </span>
          {Number(product.mrp) > Number(product.discountPrice) && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(product.mrp)}</span>
          )}
        </div>
      </div>

      {/* Quantity stepper / remove */}
      <div className="flex flex-col items-end gap-1">
        {isUnavailable ? (
          // Unavailable: show only remove button prominently
          <button
            onClick={onRemove}
            className="px-3 py-1.5 bg-red-100 border border-red-200 rounded-xl text-xs font-bold
                       text-red-600 hover:bg-red-200 active:scale-95 transition-all">
            Remove
          </button>
        ) : (
          <>
            <div className="flex items-center bg-brand-50 rounded-xl overflow-hidden border border-brand-100">
              <button
                onClick={() => onUpdate(quantity - 1)}
                className="w-8 h-8 flex items-center justify-center text-brand-600 hover:bg-brand-100 font-bold text-lg transition-colors">
                −
              </button>
              <span className="w-7 text-center text-sm font-bold text-gray-900">{quantity}</span>
              <button
                onClick={() => onUpdate(quantity + 1)}
                disabled={quantity >= product.stockQty}
                className="w-8 h-8 flex items-center justify-center text-brand-600 hover:bg-brand-100
                           font-bold text-lg disabled:opacity-30 transition-colors">
                +
              </button>
            </div>
            <button
              onClick={onRemove}
              className="text-[10px] text-red-400 hover:text-red-600 transition-colors">
              Remove
            </button>
          </>
        )}
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

// ── Saved address card ────────────────────────────────────────────────────────

function SavedAddressCard({ address, locationResult, zoneSettings, onChangeAddress }) {
  if (!address) return null;
  const icon      = LABEL_ICON[address.label] || '📍';
  const hasCoords = address.lat != null && address.lng != null;
  const zone      = zoneSettings || { radiusKm: DEFAULT_DELIVERY_KM, allowedPincodes: [] };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">Delivery Address</h3>
        <button
          onClick={onChangeAddress}
          className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors
                     flex items-center gap-1 bg-brand-50 px-2.5 py-1.5 rounded-lg"
        >
          Change
        </button>
      </div>

      {/* Address detail */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-xl flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-semibold text-gray-800">{address.label || 'Home'}</p>
            {address.isDefault && (
              <span className="text-[10px] font-bold text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full">
                Default
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700">{address.line1}</p>
          {address.line2 && <p className="text-xs text-gray-400">{address.line2}</p>}
          <p className="text-xs text-gray-500">
            {address.city}
            {address.pincode ? ` – ${address.pincode}` : ''}
          </p>
          {address.landmark && (
            <p className="text-xs text-gray-400">Near {address.landmark}</p>
          )}
        </div>
      </div>

      {/* Soft GPS tip — only when address has no GPS saved */}
      {!hasCoords && (
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
          <p className="text-xs text-gray-400">
            📍 GPS not set on this address
          </p>
          <a
            href="/profile"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            Set in Profile →
          </a>
        </div>
      )}

      {/* Zone badge row */}
      <div className="flex items-center gap-2">
        {locationResult.eligible === true && (
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            <span className="text-xs font-bold text-green-700">✓ Within delivery zone</span>
            {locationResult.distanceKm != null && (
              <span className="text-xs text-green-500">
                ({locationResult.distanceKm.toFixed(1)} km from store)
              </span>
            )}
          </div>
        )}
        {locationResult.eligible === false && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
            <span className="text-xs font-bold text-red-600">✗ Outside delivery zone</span>
            {locationResult.distanceKm != null && (
              <span className="text-xs text-red-400">
                ({locationResult.distanceKm.toFixed(1)} km from store)
              </span>
            )}
          </div>
        )}
        {locationResult.eligible === null && (() => {
          const pincodeOk = zone.allowedPincodes.includes((address.pincode || '').trim());
          return pincodeOk ? (
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              <span className="text-xs font-bold text-green-700">✓ Pincode in delivery area</span>
            </div>
          ) : hasCoords ? (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
              <span className="text-xs text-gray-500">⏳ Checking zone…</span>
            </div>
          ) : null;
        })()}
      </div>
    </div>
  );
}
