// Hero banner carousel — fetches from admin API with static fallback.
// Features: auto-play (4 s), swipe, dot nav, prev/next arrows, gradient overlay.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../../api/products.api.js';

const FALLBACK_BANNERS = [
  {
    id: 'f1',
    title: 'Fresh Vegetables',
    subtitle: 'Farm-fresh, direct from mandi',
    ctaText: 'SHOP NOW',
    ctaLink: '/products?category=vegetables',
    badge: 'Up to 30% OFF',
    bgColor: '#15803d',
    bgColor2: '#166534',
    emoji: '🥦',
  },
  {
    id: 'f2',
    title: 'Amul Dairy Products',
    subtitle: 'Milk, Curd, Paneer & more',
    ctaText: 'SHOP NOW',
    ctaLink: '/products?category=dairy',
    badge: 'Starting ₹42',
    bgColor: '#1d4ed8',
    bgColor2: '#1e3a8a',
    emoji: '🥛',
  },
  {
    id: 'f3',
    title: 'Free Delivery above ₹500',
    subtitle: 'Order now for delivery in 2 hrs',
    ctaText: 'SHOP NOW',
    ctaLink: '/products',
    badge: 'Zero Delivery Fee',
    bgColor: '#b45309',
    bgColor2: '#92400e',
    emoji: '🛵',
  },
  {
    id: 'f4',
    title: 'Clearance Carnival',
    subtitle: 'Stock clearing prices — grab before it ends',
    ctaText: 'GRAB DEALS',
    ctaLink: '/products?label=clearance',
    badge: 'Limited Stock',
    bgColor: '#be123c',
    bgColor2: '#9f1239',
    emoji: '🏷️',
  },
];

const AUTO_PLAY_MS = 4200;

function normalizeBanner(b) {
  return {
    id:       b.id,
    title:    b.title,
    subtitle: b.subtitle || '',
    ctaText:  b.ctaText  || 'Shop Now',
    ctaLink:  b.ctaLink  || '/products',
    badge:    b.badge    || null,
    bgColor:  b.bgColor  || '#15803d',
    bgColor2: b.bgColor2 || b.bgColor || '#166534',
    imageUrl: b.imageUrl || null,
    emoji:    b.emoji    || null,
  };
}

export default function HeroCarousel() {
  const navigate              = useNavigate();
  const [banners, setBanners] = useState(FALLBACK_BANNERS);
  const [idx, setIdx]         = useState(0);
  const [animDir, setAnimDir] = useState('');   // 'left' | 'right' | ''
  const touchStart            = useRef(null);
  const timerRef              = useRef(null);

  useEffect(() => {
    productsApi.getBanners()
      .then((r) => {
        const list = (r.banners || []).map(normalizeBanner);
        if (list.length > 0) { setBanners(list); setIdx(0); }
      })
      .catch(() => {});
  }, []);

  const goTo = useCallback((newIdx, dir = '') => {
    setAnimDir(dir);
    setIdx(newIdx);
    setTimeout(() => setAnimDir(''), 350);
  }, []);

  const next = useCallback(() => goTo((idx + 1) % banners.length, 'left'),  [idx, banners.length, goTo]);
  const prev = useCallback(() => goTo((idx - 1 + banners.length) % banners.length, 'right'), [idx, banners.length, goTo]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, AUTO_PLAY_MS);
  }, [next]);

  useEffect(() => { resetTimer(); return () => clearInterval(timerRef.current); }, [resetTimer]);

  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { diff > 0 ? next() : prev(); resetTimer(); }
    touchStart.current = null;
  };

  const banner = banners[idx] || FALLBACK_BANNERS[0];

  return (
    <div className="relative overflow-hidden select-none"
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* ── Slide ── */}
      <div
        className="relative flex items-center justify-between px-5 sm:px-10 py-6 sm:py-10 min-h-[180px] sm:min-h-[240px] transition-colors duration-500 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${banner.bgColor} 0%, ${banner.bgColor2} 100%)` }}>

        {/* Decorative circles for depth */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-14 -right-6 w-36 h-36 rounded-full opacity-10 bg-white" />
        <div className="absolute top-4 right-32 w-6 h-6 rounded-full opacity-20 bg-white hidden sm:block" />

        {/* Left — text */}
        <div className="flex-1 min-w-0 pr-4 z-10">
          {banner.badge && (
            <span className="inline-block text-[10px] font-extrabold bg-white/20 text-white
                             border border-white/30 rounded px-2 py-0.5 mb-2 tracking-wide uppercase">
              {banner.badge}
            </span>
          )}
          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-1.5">
            {banner.title}
          </h2>
          {banner.subtitle && (
            <p className="text-sm text-white/80 mb-4 max-w-xs">{banner.subtitle}</p>
          )}
          <button onClick={() => navigate(banner.ctaLink)}
            className="inline-flex items-center gap-2 bg-white text-gray-900 text-xs font-extrabold
                       px-5 py-2.5 rounded-lg hover:bg-gray-100 active:scale-95 transition-all
                       shadow-lg tracking-wide">
            {banner.ctaText}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Right — image or emoji */}
        <div className="flex-shrink-0 z-10 relative">
          {banner.imageUrl ? (
            <img src={banner.imageUrl} alt={banner.title}
              className="w-28 h-28 sm:w-40 sm:h-40 object-contain drop-shadow-2xl
                         transition-transform duration-300 hover:scale-105"
              loading="eager" />
          ) : (
            <span className="text-[6.5rem] sm:text-[8rem] leading-none drop-shadow-2xl
                             block transition-transform duration-300 hover:scale-105">
              {banner.emoji || '🛒'}
            </span>
          )}
        </div>
      </div>

      {/* ── Prev / Next arrows — hidden on xs, shown on sm+ ── */}
      {banners.length > 1 && (
        <>
          <button onClick={() => { prev(); resetTimer(); }}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20
                       w-8 h-8 bg-white/80 hover:bg-white rounded-full shadow-md
                       items-center justify-center transition-all hover:scale-110 active:scale-95">
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => { next(); resetTimer(); }}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20
                       w-8 h-8 bg-white/80 hover:bg-white rounded-full shadow-md
                       items-center justify-center transition-all hover:scale-110 active:scale-95">
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* ── Dot indicators ── */}
      {banners.length > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {banners.map((_, i) => (
            <button key={i} onClick={() => { goTo(i); resetTimer(); }}
              className={`rounded-full transition-all duration-300
                ${i === idx ? 'w-6 h-2 bg-white shadow-sm' : 'w-2 h-2 bg-white/50 hover:bg-white/70'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
