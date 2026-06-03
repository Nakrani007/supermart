// adminStoreStore — persisted store selection for the admin panel.
// All admin pages (dashboard, orders, inventory) read from this context.
// null selectedStore = "All Stores" (global view).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAdminStoreStore = create(
  persist(
    (set) => ({
      selectedStore: null, // null = All Stores global view
      setSelectedStore: (store) => set({ selectedStore: store }),
    }),
    { name: 'supermart-admin-store' }
  )
);
