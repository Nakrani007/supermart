// SuperMart footer — multi-column layout inspired by BigBasket/Blinkit.
// Sections: Brand info | Shop | Help | Policies | Get App | Follow Us

import { useNavigate } from 'react-router-dom';

// ── Link columns ──────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    heading: 'Shop',
    links: [
      { label: 'All Products',   href: '/products'                      },
      { label: 'Vegetables',     href: '/products?category=vegetables'  },
      { label: 'Dairy',          href: '/products?category=dairy'       },
      { label: 'Grocery Staples',href: '/products?category=staples'     },
      { label: 'Beverages',      href: '/products?category=beverages'   },
      { label: 'Snacks',         href: '/products?category=snacks'      },
      { label: 'Oils & Ghee',    href: '/products?category=oils'        },
    ],
  },
  {
    heading: 'Quick Links',
    links: [
      { label: 'My Orders',      href: '/orders'  },
      { label: 'My Wishlist',    href: '/saved'   },
      { label: 'My Account',     href: '/profile' },
      { label: 'Track Order',    href: '/orders'  },
      { label: 'My Hisaab',      href: '/hisaab'  },
    ],
  },
  {
    heading: 'Help & Policies',
    links: [
      { label: 'Contact Us',         href: '/contact'        },
      { label: 'FAQs',               href: '/faq'            },
      { label: 'Return Policy',      href: '/return-policy'  },
      { label: 'Privacy Policy',     href: '/privacy-policy' },
      { label: 'Terms & Conditions', href: '/terms'          },
    ],
  },
];

// ── Payment icons (text-based for demo; swap with <img> when available) ───────

const PAYMENT_LABELS = ['UPI', 'Visa', 'Mastercard', 'RuPay', 'Net Banking', 'COD'];

// ── Sub-component: column ─────────────────────────────────────────────────────

function FooterCol({ heading, links }) {
  const navigate = useNavigate();
  return (
    <div className="min-w-[130px]">
      <h4 className="text-xs font-extrabold text-gray-200 uppercase tracking-wider mb-3">{heading}</h4>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <button onClick={() => navigate(l.href)}
              className="text-[12px] text-gray-400 hover:text-white transition-colors text-left">
              {l.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="bg-gray-900 text-white mt-auto">

      {/* ── Top section ── */}
      <div className="px-5 py-8 max-w-[1400px] mx-auto">
        <div className="flex flex-wrap gap-8">

          {/* Brand block */}
          <div className="min-w-[180px] flex-shrink-0">
            {/* Logo */}
            <button onClick={() => navigate('/')} className="flex flex-col leading-none mb-3">
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl font-black text-brand-400 tracking-tighter">Super</span>
                <span className="text-2xl font-black text-white tracking-tighter">Mart</span>
              </div>
              <span className="text-[9px] text-brand-400 font-bold tracking-widest uppercase mt-0.5 ml-0.5">
                ready in 2 hrs
              </span>
            </button>

            <p className="text-[12px] text-gray-400 leading-relaxed max-w-[200px]">
              Surat's trusted neighbourhood grocery store. Fresh produce, essentials & more — delivered fast.
            </p>

            {/* Social */}
            <div className="flex items-center gap-3 mt-4">
              {[
                { label: 'Instagram', icon: (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162S8.597 18.163 12 18.163s6.162-2.759 6.162-6.162S15.403 5.838 12 5.838zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                )},
                { label: 'WhatsApp', icon: (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                )},
                { label: 'Facebook', icon: (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )},
              ].map((s) => (
                <button key={s.label}
                  className="w-8 h-8 bg-gray-700 hover:bg-brand-600 rounded-lg flex items-center justify-center
                             text-gray-400 hover:text-white transition-all active:scale-95"
                  aria-label={s.label}>
                  {s.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <FooterCol key={col.heading} heading={col.heading} links={col.links} />
          ))}

          {/* App download block */}
          <div className="min-w-[160px]">
            <h4 className="text-xs font-extrabold text-gray-200 uppercase tracking-wider mb-3">Get the App</h4>
            <p className="text-[11px] text-gray-400 mb-3">Order faster with our mobile app</p>

            {/* App Store button */}
            <a href="#" onClick={(e) => e.preventDefault()}
              className="flex items-center gap-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700
                         hover:border-gray-500 rounded-xl px-3 py-2 mb-2 transition-all group">
              <svg className="w-6 h-6 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-1.45.9-2.21 2.44-2.03 4.04.21 1.87 1.38 3.27 2.28 3.58zm-3.08-14.82c.69-.85 1.16-2.01 1.03-3.18-1 .05-2.21.67-2.92 1.52-.64.77-1.18 1.95-1.03 3.1 1.1.08 2.22-.56 2.92-1.44z"/>
              </svg>
              <div>
                <div className="text-[9px] text-gray-400 leading-none">Download on the</div>
                <div className="text-[12px] font-bold text-white leading-tight">App Store</div>
              </div>
            </a>

            {/* Google Play button */}
            <a href="#" onClick={(e) => e.preventDefault()}
              className="flex items-center gap-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700
                         hover:border-gray-500 rounded-xl px-3 py-2 transition-all group">
              <svg className="w-6 h-6 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.18 23.76c.35.2.74.24 1.12.14l11.34-11.34L12 8.92 3.18 23.76zM20.7 10.26L17.72 8.5l-3.28 3.28 3.28 3.28 3.01-1.77c.86-.5.86-1.52-.03-2.03zM2.09 1.18C1.96 1.46 1.9 1.8 1.9 2.18v19.64c0 .38.06.72.2 1l10.62-10.62L2.09 1.18zM4.3.1L15.64 11.44l-3.28-3.28L4.3.1z"/>
              </svg>
              <div>
                <div className="text-[9px] text-gray-400 leading-none">Get it on</div>
                <div className="text-[12px] font-bold text-white leading-tight">Google Play</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-gray-800" />

      {/* ── Payment methods strip ── */}
      <div className="px-5 py-3 max-w-[1400px] mx-auto flex flex-wrap items-center gap-3">
        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mr-1">
          Accepted Payments:
        </span>
        {PAYMENT_LABELS.map((pm) => (
          <span key={pm}
            className="text-[10px] font-bold bg-gray-800 text-gray-300 border border-gray-700
                       px-2.5 py-1 rounded-md">
            {pm}
          </span>
        ))}
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-gray-800 px-5 py-3">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-gray-500">
            © {new Date().getFullYear()} SuperMart. All rights reserved. Surat, Gujarat, India.
          </p>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/privacy-policy')} className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors">Privacy</button>
            <button onClick={() => navigate('/terms')}          className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors">Terms</button>
            <button onClick={() => navigate('/contact')}        className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors">Contact</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
