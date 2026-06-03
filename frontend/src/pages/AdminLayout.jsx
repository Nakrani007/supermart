// Admin Layout — dark sidebar + mobile bottom nav for all admin pages.

import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuthStore }  from '../store/adminAuthStore.js';
import { useAdminStoreStore } from '../store/adminStoreStore.js';
import { adminApi }           from '../api/admin.api.js';
import Tooltip                from '../components/common/Tooltip.jsx';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin/dashboard', icon: '📊', label: 'Dashboard'  },
      { to: '/admin/orders',    icon: '🧾', label: 'Orders'     },
      { to: '/admin/users',     icon: '👥', label: 'Users'      },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/admin/inventory',  icon: '📦', label: 'Inventory'  },
      { to: '/admin/products',   icon: '🛍️', label: 'Products'   },
      { to: '/admin/categories', icon: '📂', label: 'Categories' },
      { to: '/admin/banners',    icon: '🎯', label: 'Banners'    },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/admin/sections', icon: '🏠', label: 'Homepage'     },
      { to: '/admin/slots',    icon: '🚚', label: 'Delivery'     },
      { to: '/admin/stores',   icon: '🏪', label: 'Stores'       },
    ],
  },
];

const MOBILE_NAV = [
  { to: '/admin/dashboard', icon: '📊', label: 'Home'       },
  { to: '/admin/orders',    icon: '🧾', label: 'Orders'     },
  { to: '/admin/inventory', icon: '📦', label: 'Inventory'  },
  { to: '/admin/products',  icon: '🛍️', label: 'Products'   },
  { to: '/admin/users',     icon: '👥', label: 'Users'      },
];

// ─── Store Selector ───────────────────────────────────────────────────────────

function StoreSelector({ compact = false }) {
  const { selectedStore, setSelectedStore } = useAdminStoreStore();
  const [stores,  setStores]  = useState([]);
  const [open,    setOpen]    = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    adminApi.getStores()
      .then((r) => setStores(r.stores || r || []))
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (store) => { setSelectedStore(store); setOpen(false); };

  const label = selectedStore ? selectedStore.name : 'All Stores';

  if (compact) {
    // Mobile header compact version
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors max-w-[160px]">
          <span className="text-xs font-semibold text-white truncate">{label}</span>
          <svg className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute top-full right-0 mt-1.5 w-52 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-4 pt-3 pb-1">Select Store</p>
            <button
              onClick={() => select(null)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors
                ${!selectedStore ? 'text-brand-400 bg-brand-950/40' : 'text-gray-300 hover:bg-gray-800'}`}>
              <span className="text-base">🌐</span>
              <span>All Stores</span>
              {!selectedStore && <span className="ml-auto text-[10px] text-brand-500">✓</span>}
            </button>
            {stores.map((s) => (
              <button key={s.id} onClick={() => select(s)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors
                  ${selectedStore?.id === s.id ? 'text-brand-400 bg-brand-950/40' : 'text-gray-300 hover:bg-gray-800'}`}>
                <span className="text-base">🏪</span>
                <div className="min-w-0 text-left">
                  <p className="truncate">{s.name}</p>
                  {s.address && <p className="text-[10px] text-gray-500 truncate">{s.address.split(',')[0]}</p>}
                </div>
                {selectedStore?.id === s.id && <span className="ml-auto text-[10px] text-brand-500">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Sidebar full version
  return (
    <div ref={ref} className="relative px-3 py-3 border-b border-gray-800">
      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider px-1 mb-1.5">Active Store</p>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-gray-800 hover:bg-gray-750 rounded-xl transition-colors border border-gray-700">
        <span className="text-lg flex-shrink-0">{selectedStore ? '🏪' : '🌐'}</span>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-white truncate">{label}</p>
          {selectedStore?.address && (
            <p className="text-[10px] text-gray-500 truncate">{selectedStore.address.split(',')[0]}</p>
          )}
          {!selectedStore && (
            <p className="text-[10px] text-gray-500">Showing global data</p>
          )}
        </div>
        <svg className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <button
            onClick={() => select(null)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
              ${!selectedStore ? 'text-brand-400 bg-brand-950/40' : 'text-gray-300 hover:bg-gray-800'}`}>
            <span className="text-base">🌐</span>
            <div className="flex-1 text-left">
              <p>All Stores</p>
              <p className="text-[10px] text-gray-500">Global view</p>
            </div>
            {!selectedStore && <span className="text-brand-500 text-xs">✓</span>}
          </button>
          {stores.map((s) => (
            <button key={s.id} onClick={() => select(s)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-t border-gray-800
                ${selectedStore?.id === s.id ? 'text-brand-400 bg-brand-950/40' : 'text-gray-300 hover:bg-gray-800'}`}>
              <span className="text-base">🏪</span>
              <div className="flex-1 min-w-0 text-left">
                <p className="truncate">{s.name}</p>
                {s.address && <p className="text-[10px] text-gray-500 truncate">{s.address.split(',')[0]}</p>}
              </div>
              {selectedStore?.id === s.id && <span className="text-brand-500 text-xs flex-shrink-0">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const { admin, logout }       = useAdminAuthStore();
  const { selectedStore }       = useAdminStoreStore();

  const handleLogout = () => { logout(); navigate('/admin/login', { replace: true }); };

  return (
    <div className="flex min-h-screen bg-gray-950">

      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 bg-gray-900 border-r border-gray-800 fixed inset-y-0 left-0 overflow-y-auto">

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800 flex-shrink-0">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-lg">🛒</div>
          <div>
            <p className="text-white text-sm font-bold leading-tight">SuperMart</p>
            <p className="text-gray-500 text-xs">Admin Panel</p>
          </div>
        </div>

        {/* Store Selector */}
        <StoreSelector />

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider px-3 mb-1">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(({ to, icon, label }) => (
                  <NavLink key={to} to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors
                       ${isActive ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`
                    }>
                    <span className="text-base w-5 text-center">{icon}</span>{label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User / Logout */}
        <div className="px-3 py-4 border-t border-gray-800 space-y-1 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 bg-brand-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {admin?.username?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{admin?.name || 'Admin'}</p>
              <p className="text-xs text-gray-500 truncate">@{admin?.username}</p>
            </div>
          </div>
          <Tooltip text="Sign out of admin panel" position="right">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-950 hover:text-red-400 transition-colors">
              <span className="w-5 text-center">🚪</span> Logout
            </button>
          </Tooltip>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:ml-56 min-h-screen">

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-sm">🛒</div>
            <span className="text-white font-bold text-sm">SuperMart Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <StoreSelector compact />
            <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1">Logout</button>
          </div>
        </header>

        {/* Store context banner — shown when a specific store is selected */}
        {selectedStore && (
          <div className="bg-brand-950/40 border-b border-brand-800/40 px-4 py-2 flex items-center gap-2 flex-shrink-0">
            <span className="text-brand-400 text-sm">🏪</span>
            <span className="text-brand-300 text-xs font-semibold">Viewing: {selectedStore.name}</span>
            {selectedStore.address && (
              <span className="text-brand-500/60 text-xs hidden sm:block">· {selectedStore.address.split(',')[0]}</span>
            )}
          </div>
        )}

        <main className="flex-1 bg-gray-950">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex items-center bg-gray-900 border-t border-gray-800 sticky bottom-0 z-20">
          {MOBILE_NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors
                 ${isActive ? 'text-brand-500' : 'text-gray-500 hover:text-gray-300'}`
              }>
              <span className="text-lg leading-none">{icon}</span>{label}
            </NavLink>
          ))}
          <button onClick={handleLogout}
            className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-gray-500">
            <span className="text-lg leading-none">🚪</span>Logout
          </button>
        </nav>
      </div>
    </div>
  );
}
