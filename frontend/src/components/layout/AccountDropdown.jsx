import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { useCartStore } from '../../store/cartStore.js';

const MENU = [
  { label: 'Account Details', type: 'section' },
  { label: 'My Profile',          href: '/profile',        icon: '👤' },
  { label: 'My Address',          href: '/profile?tab=addresses', icon: '📍' },
  { label: 'My Hisaab',           href: '/hisaab',         icon: '📊' },
  { type: 'divider' },
  { label: 'Ready List',          href: '/saved',           icon: '📋' },
  { label: 'My Orders',           href: '/orders',          icon: '🛍️' },
  { label: 'My Saved List',       href: '/saved',           icon: '❤️' },
  { label: 'My Subscribed List',  href: '/subscriptions',   icon: '🔄' },
  { type: 'divider' },
  { label: 'Logout', type: 'logout', icon: '🚪' },
];

export default function AccountDropdown({ onClose }) {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearCart = useCartStore((s) => s.clearCart);
  const user      = useAuthStore((s) => s.user);
  const ref       = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleLogout = () => {
    clearAuth();
    clearCart();
    onClose();
    navigate('/');
  };

  const handleNav = (href) => { navigate(href); onClose(); };

  return (
    <div ref={ref}
      className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded shadow-xl z-50 py-1 overflow-hidden">

      {/* Greeting */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-[11px] text-purple-600 font-semibold">
          Hello {user?.name || 'Guest'}
        </p>
        <p className="text-sm font-bold text-gray-800 leading-none mt-0.5">My Account</p>
      </div>

      {MENU.map((item, i) => {
        if (item.type === 'section') {
          return (
            <p key={i} className="px-4 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {item.label}
            </p>
          );
        }
        if (item.type === 'divider') {
          return <div key={i} className="border-t border-gray-100 my-1" />;
        }
        if (item.type === 'logout') {
          return (
            <button key={i} onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 font-medium
                         hover:bg-red-50 transition-colors text-left">
              <span>{item.icon}</span>
              {item.label}
            </button>
          );
        }
        return (
          <button key={i} onClick={() => handleNav(item.href)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 font-medium
                       hover:bg-brand-50 hover:text-brand-700 transition-colors text-left">
            <span>{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
