// Admin Layout — dark sidebar + mobile bottom nav for all admin pages.

import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuthStore } from '../store/adminAuthStore.js';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin/dashboard', icon: '📊', label: 'Dashboard'  },
      { to: '/admin/orders',    icon: '📦', label: 'Orders'     },
      { to: '/admin/users',     icon: '👥', label: 'Users'      },
    ],
  },
  {
    label: 'Store',
    items: [
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
    ],
  },
];

const MOBILE_NAV = [
  { to: '/admin/dashboard', icon: '📊', label: 'Home'       },
  { to: '/admin/orders',    icon: '📦', label: 'Orders'     },
  { to: '/admin/products',  icon: '🛍️', label: 'Products'   },
  { to: '/admin/users',     icon: '👥', label: 'Users'      },
  { to: '/admin/sections',  icon: '⚙️', label: 'Settings'   },
];

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuthStore();

  const handleLogout = () => { logout(); navigate('/admin/login', { replace: true }); };

  return (
    <div className="flex min-h-screen bg-gray-950">

      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 bg-gray-900 border-r border-gray-800 fixed inset-y-0 left-0 overflow-y-auto">

        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800 flex-shrink-0">
          <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-lg">🛒</div>
          <div>
            <p className="text-white text-sm font-bold leading-tight">SuperMart</p>
            <p className="text-gray-500 text-xs">Admin Panel</p>
          </div>
        </div>

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
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-950 hover:text-red-400 transition-colors">
            <span className="w-5 text-center">🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:ml-56 min-h-screen">

        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center text-sm">🛒</div>
            <span className="text-white font-bold text-sm">SuperMart Admin</span>
          </div>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1">Logout</button>
        </header>

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
