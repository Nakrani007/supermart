// SuperMart header — DMart/Blinkit inspired sticky two-row layout.
// Mobile  : Row 1 (logo + location + icons)  +  Row 2 (search)  +  Row 3 (category nav)
// Desktop : Single combined bar with logo | location | search | icons

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCartCount, useCartTotals } from '../../store/cartStore.js';
import { useAuthStore, useIsAuthenticated } from '../../store/authStore.js';
import { useLocationStore } from '../../store/locationStore.js';
import { useSavedCount } from '../../store/savedStore.js';
import VoiceSearch from '../VoiceSearch.jsx';
import AuthModal from '../common/AuthModal.jsx';
import AccountDropdown from './AccountDropdown.jsx';
import { phoneticToEnglish } from '../../utils/phoneticMatch.js';

const NAV_LINKS = [
  { label: 'All Categories', href: '/products',                    icon: '☰', dark: true },
  { label: 'Vegetables',     href: '/products?category=vegetables'              },
  { label: 'Dairy',          href: '/products?category=dairy'                   },
  { label: 'Grocery',        href: '/products?category=staples'                 },
  { label: 'Beverages',      href: '/products?category=beverages'               },
  { label: 'Snacks',         href: '/products?category=snacks'                  },
  { label: 'Personal Care',  href: '/products?category=personal'                },
  { label: 'Oils & Ghee',    href: '/products?category=oils'                    },
  { label: 'Fruits',         href: '/products?category=fruits'                  },
];

export default function Header({ showSearch = true, onSearch }) {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const cartCount      = useCartCount();
  const { subtotal: cartTotal } = useCartTotals();
  const savedCount     = useSavedCount();
  const isAuthed       = useIsAuthenticated();
  const user           = useAuthStore((s) => s.user);
  const { city, area, areas, setLocation } = useLocationStore();

  const [query, setQuery]           = useState(searchParams.get('search') || '');
  const [showLocation, setShowLoc]  = useState(false);
  const [showAuth, setShowAuth]     = useState(false);
  const [showDropdown, setDropdown] = useState(false);
  const [partialSpeech, setPartial] = useState('');
  const inputRef   = useRef(null);
  const accountRef = useRef(null);

  useEffect(() => { setQuery(searchParams.get('search') || ''); }, [searchParams]);

  // Close account dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  const handleSearch = (e) => {
    e.preventDefault();
    const processed = phoneticToEnglish(query.trim());
    if (processed) navigate(`/products?search=${encodeURIComponent(processed)}`);
    else navigate('/products');
    onSearch?.(processed);
  };

  const handleVoiceResult = (text) => {
    setQuery(text);
    setPartial('');
    navigate(`/products?search=${encodeURIComponent(text)}`);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">

        {/* ══════════════════════════════════════════════════════════
            Row 1 — Logo  ·  Location  ·  Search (md+)  ·  Icons
            ══════════════════════════════════════════════════════════ */}
        <div className="flex items-center gap-2 px-3 md:px-6 h-14 max-w-[1400px] mx-auto w-full">

          {/* Logo */}
          <button onClick={() => navigate('/')}
            className="flex-shrink-0 flex flex-col leading-none mr-1 hover:opacity-80 transition-opacity">
            <div className="flex items-baseline gap-0.5">
              <span className="text-[22px] font-black text-brand-600 tracking-tighter">Super</span>
              <span className="text-[22px] font-black text-gray-900 tracking-tighter">Mart</span>
            </div>
            <span className="text-[8px] text-brand-500 font-bold tracking-widest uppercase -mt-0.5 ml-0.5">
              ready in 2 hrs
            </span>
          </button>

          {/* Location selector */}
          <button onClick={() => setShowLoc(true)}
            className="flex items-center gap-1.5 min-w-0 px-2.5 py-1.5 rounded-lg border border-gray-200
                       hover:border-brand-400 hover:bg-brand-50 transition-all max-w-[140px] md:max-w-[180px]
                       flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd" />
            </svg>
            <div className="min-w-0 text-left">
              <div className="text-[11px] font-bold text-gray-800 truncate leading-tight">{area}</div>
              <div className="text-[9px] text-gray-400 leading-none truncate">{city}</div>
            </div>
            <svg className="w-3 h-3 text-gray-400 flex-shrink-0 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Search bar — only visible on md+ in Row 1 */}
          {showSearch && (
            <form onSubmit={handleSearch}
              className="hidden md:flex flex-1 items-center bg-gray-50 border-2 border-gray-200
                         rounded-xl overflow-hidden h-10 focus-within:border-brand-400
                         focus-within:bg-white transition-all shadow-sm">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-3.5"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                value={partialSpeech || query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for atta, doodh, sabzi, chips..."
                className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 text-gray-800 px-2.5"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  className="text-gray-300 hover:text-gray-500 px-2 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd" />
                  </svg>
                </button>
              )}
              <button type="submit"
                className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold
                           px-4 h-full transition-colors flex-shrink-0 tracking-wide">
                SEARCH
              </button>
            </form>
          )}

          {/* ── Right icons ── */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">

            {/* Wishlist — authenticated only */}
            {isAuthed && (
              <button onClick={() => navigate('/saved')}
                className="relative w-10 h-10 flex flex-col items-center justify-center
                           hover:bg-gray-100 rounded-xl transition-colors group">
                <div className="relative">
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-red-500 transition-colors"
                    fill={savedCount > 0 ? '#ef4444' : 'none'} stroke={savedCount > 0 ? '#ef4444' : 'currentColor'}
                    viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {savedCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white
                                     text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {savedCount}
                    </span>
                  )}
                </div>
                <span className="text-[8px] text-gray-500 font-medium mt-0.5 leading-none hidden sm:block">Saved</span>
              </button>
            )}

            {/* Account / Login */}
            {isAuthed ? (
              <div ref={accountRef} className="relative flex-shrink-0">
                <button onClick={() => setDropdown((v) => !v)}
                  className="flex flex-col items-center w-10 h-10 sm:w-auto sm:px-2 justify-center
                             hover:bg-gray-100 rounded-xl transition-colors">
                  <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center">
                    <span className="text-brand-700 text-xs font-black">
                      {user?.name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-center leading-none mt-0.5">
                    <p className="text-[8px] text-brand-600 font-semibold">
                      Hi, {user?.name?.split(' ')[0]}
                    </p>
                    <p className="text-[9px] font-bold text-gray-800 flex items-center gap-0.5 justify-center">
                      Account
                      <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </p>
                  </div>
                </button>
                {showDropdown && <AccountDropdown onClose={() => setDropdown(false)} />}
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)}
                className="flex flex-col items-center w-10 h-10 sm:w-auto sm:px-2 justify-center
                           hover:bg-gray-100 rounded-xl transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[9px] font-bold text-gray-800 mt-0.5 hidden sm:block">Sign In</span>
              </button>
            )}

            {/* Cart */}
            <button onClick={() => navigate('/cart')}
              className="relative flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700
                         text-white rounded-xl px-2.5 h-10 transition-colors flex-shrink-0 group">
              <div className="relative">
                <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[16px] h-4 bg-white text-brand-700
                                   text-[9px] font-black rounded-full flex items-center justify-center px-0.5">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
              <div className="hidden sm:block">
                <div className="text-[8px] text-brand-100 leading-none font-medium">My Cart</div>
                <div className="text-[11px] font-bold leading-tight">
                  {cartCount === 0 ? '₹0' : `₹${Math.round(cartTotal)}`}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            Row 2 — Search bar (mobile only)
            ══════════════════════════════════════════════════════════ */}
        {showSearch && (
          <div className="flex items-center gap-2 px-3 pb-2 md:hidden max-w-[1400px] mx-auto w-full">
            <form onSubmit={handleSearch}
              className="flex-1 flex items-center bg-gray-50 border-2 border-gray-200 rounded-xl
                         overflow-hidden h-10 focus-within:border-brand-400 focus-within:bg-white transition-all">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-3"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                value={partialSpeech || query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for atta, doodh, sabzi..."
                className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 text-gray-800 px-2.5"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  className="text-gray-300 hover:text-gray-500 px-2 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd" />
                  </svg>
                </button>
              )}
              <button type="submit"
                className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold
                           px-3.5 h-full transition-colors flex-shrink-0 tracking-wide">
                SEARCH
              </button>
            </form>
            <VoiceSearch onResult={handleVoiceResult} onPartial={setPartial}
              className="w-10 h-10 flex-shrink-0" />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            Row 3 — Category nav strip
            ══════════════════════════════════════════════════════════ */}
        <div className="border-t border-gray-100">
          <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center overflow-x-auto no-scrollbar">
            {NAV_LINKS.map((item, i) => (
              <button key={i} onClick={() => navigate(item.href)}
                className={`flex-shrink-0 px-3 py-1.5 text-[11px] font-medium whitespace-nowrap
                            border-r border-gray-100 transition-colors
                            ${item.dark
                              ? 'bg-gray-900 text-white font-semibold flex items-center gap-1.5 hover:bg-gray-700'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-brand-600'}`}>
                {item.icon && <span className="text-xs">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════
          Location sheet (bottom-sheet on mobile, centered modal on desktop)
          ══════════════════════════════════════════════════════════ */}
      {showLocation && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLoc(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-2xl z-10 p-5 shadow-2xl">
            {/* Drag handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-brand-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd" />
              </svg>
              <h3 className="font-bold text-gray-800 text-base">Delivering to</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {areas.map((a) => (
                <button key={a} onClick={() => { setLocation('Surat', a); setShowLoc(false); }}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all text-left
                    ${area === a
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-brand-300 hover:bg-brand-50'}`}>
                  {area === a && <span className="mr-1">✓</span>}
                  {a}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-gray-400 text-center mt-3">
              Serving {city}, Gujarat
            </p>
          </div>
        </div>
      )}

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
    </>
  );
}
