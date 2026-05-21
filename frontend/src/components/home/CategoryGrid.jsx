// CategoryGrid — horizontal scroll of category chips.
// Fetches from the public categories API with emoji + color fallbacks.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi } from '../../api/products.api.js';

const SLUG_EMOJI = {
  vegetables: '🥦', dairy: '🥛', staples: '🌾',   snacks: '🍪',
  beverages:  '☕', personal: '🧴', oils: '🫙',    fruits: '🍎',
  frozen:     '🧊', bakery: '🍞',  cleaning: '🧹', baby: '👶',
};

// Warm + cool palette cycling through categories
const BG_PAIRS = [
  { bg: 'bg-green-100',  ring: 'group-hover:ring-green-400'  },
  { bg: 'bg-blue-100',   ring: 'group-hover:ring-blue-400'   },
  { bg: 'bg-amber-100',  ring: 'group-hover:ring-amber-400'  },
  { bg: 'bg-orange-100', ring: 'group-hover:ring-orange-400' },
  { bg: 'bg-red-100',    ring: 'group-hover:ring-red-400'    },
  { bg: 'bg-purple-100', ring: 'group-hover:ring-purple-400' },
  { bg: 'bg-yellow-100', ring: 'group-hover:ring-yellow-400' },
  { bg: 'bg-pink-100',   ring: 'group-hover:ring-pink-400'   },
  { bg: 'bg-teal-100',   ring: 'group-hover:ring-teal-400'   },
  { bg: 'bg-indigo-100', ring: 'group-hover:ring-indigo-400' },
  { bg: 'bg-lime-100',   ring: 'group-hover:ring-lime-400'   },
  { bg: 'bg-rose-100',   ring: 'group-hover:ring-rose-400'   },
];

export default function CategoryGrid() {
  const navigate                    = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    productsApi.getCategories()
      .then((r) => setCategories(r.categories || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="bg-white py-4">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-[15px] font-bold text-gray-800">Popular Categories</h2>
        <button onClick={() => navigate('/products')}
          className="text-[11px] font-bold text-brand-600 hover:underline">
          View All
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
        {loading ? (
          // Skeleton placeholders
          [...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gray-100 animate-pulse" />
              <div className="w-12 h-2.5 bg-gray-100 rounded-full animate-pulse" />
            </div>
          ))
        ) : (
          <>
            {categories.map((cat, idx) => {
              const emoji = cat.icon || SLUG_EMOJI[cat.slug] || '🛒';
              const pair  = BG_PAIRS[idx % BG_PAIRS.length];
              return (
                <button key={cat.id}
                  onClick={() => navigate(`/products?category=${cat.slug}`)}
                  className="group flex-shrink-0 flex flex-col items-center gap-1.5
                             active:scale-90 transition-transform">
                  <div className={`w-16 h-16 ${pair.bg} rounded-full flex items-center justify-center
                                   ring-2 ring-transparent ${pair.ring} transition-all duration-200
                                   group-hover:shadow-md group-hover:scale-105`}>
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.name}
                        className="w-10 h-10 object-contain" loading="lazy" />
                    ) : (
                      <span className="text-3xl leading-none">{emoji}</span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-gray-700 text-center
                                   leading-tight w-16 group-hover:text-brand-600 transition-colors">
                    {cat.name}
                  </span>
                </button>
              );
            })}

            {/* All Items catch-all */}
            <button onClick={() => navigate('/products')}
              className="group flex-shrink-0 flex flex-col items-center gap-1.5
                         active:scale-90 transition-transform">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center
                              ring-2 ring-transparent group-hover:ring-gray-400 transition-all
                              group-hover:shadow-md group-hover:scale-105">
                <span className="text-3xl leading-none">🛒</span>
              </div>
              <span className="text-[11px] font-medium text-gray-700 text-center
                               leading-tight w-16 group-hover:text-brand-600 transition-colors">
                All Items
              </span>
            </button>
          </>
        )}
      </div>
    </section>
  );
}
