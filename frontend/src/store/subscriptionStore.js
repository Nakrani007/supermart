import { create } from 'zustand';
import { lsGet, lsSet } from '../utils/localStorage.js';

const KEY = 'sm_subscriptions';

const FREQ_DAYS = { daily: 1, weekly: 7, monthly: 30 };

function nextDate(frequency) {
  const d = new Date();
  d.setDate(d.getDate() + (FREQ_DAYS[frequency] || 7));
  return d.toISOString();
}

export const useSubscriptionStore = create((set, get) => ({
  subscriptions: lsGet(KEY, []),

  subscribe: (product, frequency = 'weekly', qty = 1) => {
    if (get().isSubscribed(product.id)) return;
    const sub = {
      id: `sub_${Date.now()}`,
      product: { id: product.id, name: product.name, discountPrice: product.discountPrice, mrp: product.mrp, unit: product.unit, imageUrl: product.imageUrl, stockQty: product.stockQty, category: product.category },
      frequency,
      qty,
      nextDelivery: nextDate(frequency),
      active: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...get().subscriptions, sub];
    lsSet(KEY, updated);
    set({ subscriptions: updated });
  },

  unsubscribe: (subId) => {
    const updated = get().subscriptions.filter((s) => s.id !== subId);
    lsSet(KEY, updated);
    set({ subscriptions: updated });
  },

  updateFrequency: (subId, frequency) => {
    const updated = get().subscriptions.map((s) =>
      s.id === subId ? { ...s, frequency, nextDelivery: nextDate(frequency) } : s
    );
    lsSet(KEY, updated);
    set({ subscriptions: updated });
  },

  updateQty: (subId, qty) => {
    if (qty < 1) { get().unsubscribe(subId); return; }
    const updated = get().subscriptions.map((s) => s.id === subId ? { ...s, qty } : s);
    lsSet(KEY, updated);
    set({ subscriptions: updated });
  },

  isSubscribed: (productId) => get().subscriptions.some((s) => s.product.id === productId),
}));

export const useSubscriptionCount = () => useSubscriptionStore((s) => s.subscriptions.length);
