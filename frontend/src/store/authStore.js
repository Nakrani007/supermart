// Auth store — persists token and user to localStorage.
// Zustand is used over Context because it doesn't cause full-tree re-renders
// when only one component cares about auth state.

import { create } from 'zustand';
import { lsGet, lsSet, lsRemove } from '../utils/localStorage.js';

export const useAuthStore = create((set) => ({
  token: lsGet('sm_token'),
  user: lsGet('sm_user'),

  setAuth: (token, user) => {
    lsSet('sm_token', token);
    lsSet('sm_user', user);
    set({ token, user });
  },

  clearAuth: () => {
    lsRemove('sm_token');
    lsRemove('sm_user');
    set({ token: null, user: null });
  },

  updateUser: (partial) =>
    set((state) => {
      const updated = { ...state.user, ...partial };
      lsSet('sm_user', updated);
      return { user: updated };
    }),
}));

// Derived selector — avoids inlining boolean check in every component
export const useIsAuthenticated = () => useAuthStore((s) => !!s.token);
