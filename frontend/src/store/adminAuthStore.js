import { create } from 'zustand';
import { lsGet, lsSet } from '../utils/localStorage.js';

const TOKEN_KEY = 'sm_admin_token';
const ADMIN_KEY = 'sm_admin_user';

export const useAdminAuthStore = create((set) => ({
  token: lsGet(TOKEN_KEY, null),
  admin: lsGet(ADMIN_KEY, null),

  login: (token, admin) => {
    lsSet(TOKEN_KEY, token);
    lsSet(ADMIN_KEY, admin);
    set({ token, admin });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    set({ token: null, admin: null });
  },
}));

export const useIsAdminAuthenticated = () => useAdminAuthStore((s) => !!s.token);
