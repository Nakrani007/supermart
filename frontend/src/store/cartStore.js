// Cart store — the most frequently written store in the app.
// Uses Zustand with localStorage persistence so cart survives page refresh.
// This is why guests can shop freely and only hit auth at checkout.

import { create } from 'zustand';
import { lsGet, lsSet } from '../utils/localStorage.js';

const CART_KEY = 'sm_cart';

function loadCart() {
  return lsGet(CART_KEY, []);
}

function saveCart(items) {
  lsSet(CART_KEY, items);
}

export const useCartStore = create((set, get) => ({
  items: loadCart(), // [{ product, quantity }]

  addItem: (product, quantity = 1) => {
    const items = get().items;
    const existing = items.find((i) => i.product.id === product.id);

    let updated;
    if (existing) {
      const maxQty = product.stockQty ?? Infinity;
      const newQty = Math.min(existing.quantity + quantity, maxQty);
      updated = items.map((i) =>
        i.product.id === product.id ? { ...i, quantity: newQty } : i
      );
    } else {
      const maxQty = product.stockQty ?? Infinity;
      updated = [...items, { product, quantity: Math.min(quantity, maxQty) }];
    }

    saveCart(updated);
    set({ items: updated });
  },

  removeItem: (productId) => {
    const updated = get().items.filter((i) => i.product.id !== productId);
    saveCart(updated);
    set({ items: updated });
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    const updated = get().items.map((i) =>
      i.product.id === productId ? { ...i, quantity } : i
    );
    saveCart(updated);
    set({ items: updated });
  },

  clearCart: () => {
    saveCart([]);
    set({ items: [] });
  },

  // Derived values computed on demand — not stored (avoids stale state)
  get totalItems() {
    return get().items.reduce((sum, i) => sum + i.quantity, 0);
  },

  get subtotal() {
    return get().items.reduce(
      (sum, i) => sum + Number(i.product.discountPrice) * i.quantity,
      0
    );
  },

  get totalMRP() {
    return get().items.reduce(
      (sum, i) => sum + Number(i.product.mrp) * i.quantity,
      0
    );
  },

  get totalSavings() {
    return get().totalMRP - get().subtotal;
  },
}));

// Fine-grained selectors to minimize re-renders
export const useCartItems = () => useCartStore((s) => s.items);
export const useCartCount = () =>
  useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
export const useCartTotals = () =>
  useCartStore((s) => {
    const subtotal = s.items.reduce(
      (sum, i) => sum + Number(i.product.discountPrice) * i.quantity, 0
    );
    const totalMRP = s.items.reduce(
      (sum, i) => sum + Number(i.product.mrp) * i.quantity, 0
    );
    return { subtotal, totalMRP, savings: totalMRP - subtotal };
  });
