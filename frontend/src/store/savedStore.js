import { create } from 'zustand';
import { lsGet, lsSet } from '../utils/localStorage.js';

const KEY = 'sm_saved';

export const useSavedStore = create((set, get) => ({
  items: lsGet(KEY, []),

  toggleSave: (product) => {
    const items = get().items;
    const exists = items.find((i) => i.id === product.id);
    const updated = exists
      ? items.filter((i) => i.id !== product.id)
      : [...items, { id: product.id, name: product.name, discountPrice: product.discountPrice, mrp: product.mrp, unit: product.unit, imageUrl: product.imageUrl, stockQty: product.stockQty, category: product.category }];
    lsSet(KEY, updated);
    set({ items: updated });
  },

  isSaved: (productId) => get().items.some((i) => i.id === productId),

  removeItem: (productId) => {
    const updated = get().items.filter((i) => i.id !== productId);
    lsSet(KEY, updated);
    set({ items: updated });
  },
}));

export const useSavedCount = () => useSavedStore((s) => s.items.length);
