// DealsSection — horizontal-scrolling product carousels for each labeled row.
// Uses the shared ProductCard (compact variant) for visual consistency.

import { useNavigate } from 'react-router-dom';
import ProductCard from '../common/ProductCard.jsx';

// ── Skeleton for a compact card while loading ─────────────────────────────────
function CompactCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-36 bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="pt-[80%] bg-gray-100 animate-pulse relative"><div className="absolute inset-0" /></div>
      <div className="p-2 space-y-2">
        <div className="h-2.5 bg-gray-100 rounded animate-pulse" />
        <div className="h-2.5 bg-gray-100 rounded w-3/4 animate-pulse" />
        <div className="h-6 bg-gray-100 rounded animate-pulse mt-1" />
      </div>
    </div>
  );
}

// ── A single horizontal row with title + "View All" + scrolling cards ─────────
function ProductRow({ title, titleEmoji, products, seeAllLink, bgColor = 'bg-white', loading = false }) {
  const navigate = useNavigate();

  // Hide row if no data and not loading
  if (!loading && (!products || products.length === 0)) return null;

  return (
    <section className={`${bgColor} py-4`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-[15px] font-bold text-gray-800 flex items-center gap-1.5">
          {titleEmoji && <span className="text-lg">{titleEmoji}</span>}
          {title}
        </h2>
        <button onClick={() => navigate(seeAllLink)}
          className="flex items-center gap-1 text-[11px] font-bold text-brand-600
                     border border-brand-200 bg-brand-50 hover:bg-brand-100 px-2.5 py-1
                     rounded-lg transition-colors active:scale-95">
          View All
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar snap-x snap-mandatory">
        {loading
          ? [...Array(4)].map((_, i) => <CompactCardSkeleton key={i} />)
          : products.map((p) => (
              <div key={p.id} className="snap-start flex-shrink-0">
                <ProductCard product={p} compact />
              </div>
            ))}
      </div>
    </section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function DealsSection({
  clearanceProducts   = [],
  weeklySaverProducts = [],
  bestSellerProducts  = [],
  dailyEssentials     = [],
  loading             = false,
  // Legacy prop (ignored — kept for call-site compatibility)
  topDeals,
}) {
  // If everything is empty and not loading, render nothing
  const hasData = loading || clearanceProducts.length > 0 || weeklySaverProducts.length > 0
    || bestSellerProducts.length > 0 || dailyEssentials.length > 0;

  if (!hasData) return null;

  return (
    <div className="space-y-2">
      <ProductRow
        title="Clearance Carnival"
        titleEmoji="🔥"
        products={clearanceProducts}
        seeAllLink="/products?label=clearance"
        bgColor="bg-orange-50"
        loading={loading}
      />
      <ProductRow
        title="This Week's Savers"
        titleEmoji="💚"
        products={weeklySaverProducts}
        seeAllLink="/products?label=weeklySaver"
        bgColor="bg-green-50"
        loading={loading}
      />
      <ProductRow
        title="Best Sellers"
        titleEmoji="⭐"
        products={bestSellerProducts}
        seeAllLink="/products?label=bestSeller"
        bgColor="bg-amber-50"
        loading={loading}
      />
      <ProductRow
        title="Daily Essentials"
        titleEmoji="🛒"
        products={dailyEssentials}
        seeAllLink="/products?category=staples"
        bgColor="bg-blue-50"
        loading={loading}
      />
    </div>
  );
}
