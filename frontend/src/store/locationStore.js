// Stores the user's selected delivery area — used in Header and checkout.
import { create } from 'zustand';
import { lsGet, lsSet } from '../utils/localStorage.js';

const SURAT_AREAS = [
  'Ring Road', 'Adajan', 'Vesu', 'Pal', 'Katargam',
  'Varachha', 'Udhna', 'Althan', 'Piplod', 'City Light',
];

export const useLocationStore = create((set) => ({
  city: lsGet('sm_city', 'Surat'),
  area: lsGet('sm_area', 'Ring Road'),
  areas: SURAT_AREAS,

  setLocation: (city, area) => {
    lsSet('sm_city', city);
    lsSet('sm_area', area);
    set({ city, area });
  },
}));
