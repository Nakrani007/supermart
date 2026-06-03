// storeSelectionStore — global persisted store for selected shop location.
// Used by Header (store pill + picker) and CartPage (delivery/pickup origin + cart validation).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStoreSelectionStore = create(
  persist(
    (set) => ({
      // Currently selected store object (full store record from backend)
      selectedStore: null,

      // Product IDs that are unavailable at the currently selected store.
      // Populated by CartPage after calling POST /validate-cart.
      unavailableProductIds: [],

      // ── Actions ─────────────────────────────────────────────────────────────

      // Set a store without any warning (used on initial auto-selection)
      setSelectedStore: (store) =>
        set({ selectedStore: store, unavailableProductIds: [] }),

      // Update unavailable product list (called after cart validation)
      setUnavailableProducts: (ids) =>
        set({ unavailableProductIds: ids }),

      // Clear unavailable list (e.g. when cart is emptied)
      clearUnavailable: () =>
        set({ unavailableProductIds: [] }),
    }),
    { name: 'supermart-store-selection' }
  )
);
