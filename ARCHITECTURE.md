# Local Super Mart — Hybrid Online Platform
## High-Level Architecture

### System Design Diagram (Textual)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  React 19 PWA (Vite + Tailwind)  │  POS Terminal (In-store)    │
│  Mobile-first, offline-capable   │  Barcode scanner             │
└──────────────┬──────────────────────────────┬───────────────────┘
               │ HTTPS / WSS                  │ REST
               ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX (Reverse Proxy)                        │
│  SSL termination │ Static file serving │ Rate limiting (L4)     │
│  Gzip/Brotli compression (critical for 2G/3G Tier-2 users)     │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│              NODE.JS / EXPRESS API (PM2 Cluster)                │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Auth   │ │ Orders  │ │ Products │ │Dashboard │ │ POS Sync  │
│  │ Module  │ │ Module  │ │  Module  │ │  Module  │ │  Module   │
│  └─────────┘ └─────────┘ └──────────┘ └──────────┘            │
│        │            │           │             │                  │
│  ┌─────▼────────────▼───────────▼─────────────▼──────────────┐ │
│  │              Middleware Pipeline                           │ │
│  │  JWT Auth → Zod Validation → Rate Limiter → Error Handler │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────┬────────────────────────────────┬────────────────────────-┘
       │                                │
       ▼                                ▼
┌──────────────┐              ┌──────────────────────┐
│  Redis Cache │              │  PostgreSQL Primary   │
│  - Product   │◄────────────►│  (Write + Read)       │
│    catalog   │  cache miss  │                       │
│  - Sessions  │              │  ┌────────────────┐   │
│  - OTP codes │              │  │ Read Replica   │   │
│  - Rate keys │              │  │ (Analytics)    │   │
│              │              │  └────────────────┘   │
└──────────────┘              └──────────────────────-┘
```

---

### Request Flow (Frontend → Backend → DB → POS Sync)

```
1. PRODUCT BROWSE
   Browser → Nginx → Express
          → Redis HIT?  → return cached JSON (sub-5ms)
          → Redis MISS? → PostgreSQL query
                        → Redis SET (TTL 5min)
                        → return JSON + set ETag

2. ADD TO CART (Guest)
   Browser → localStorage (Zustand persist)
   [No network call — cart lives locally until checkout]

3. CHECKOUT (Authenticated)
   Browser → POST /api/v1/orders/create
          → JWT middleware (validate token)
          → Zod schema validation
          → prisma.$transaction(SERIALIZABLE)
              → SELECT FOR UPDATE (lock product rows)
              → Validate stock availability
              → Validate delivery slot capacity
              → Create Order + OrderLineItems
              → Decrement stockQty atomically
              → Reserve delivery slot
          ← Order confirmation JSON
   Browser → Clear localStorage cart
          → Show confirmation screen

4. POS SYNC (In-store terminal)
   POS → POST /api/v1/pos/sync (API key auth)
       → Batch upsert products (barcode as key)
       → Invalidate Redis product cache
       → WebSocket broadcast to connected clients (optional)
```

---

### Scalability Considerations

| Concern              | Strategy                                                       |
|----------------------|----------------------------------------------------------------|
| High read traffic    | Redis caching (product catalog, TTL 5min)                      |
| High write traffic   | PostgreSQL connection pooling (PgBouncer), PM2 cluster mode    |
| DB indexing          | Composite indexes for analytics, partial indexes for active    |
| Horizontal scaling   | Stateless Express workers behind Nginx load balancer           |
| Image serving        | CDN (Cloudflare) for product images — not served by Node       |
| Stock race condition | SELECT FOR UPDATE in SERIALIZABLE transaction                  |
| Low-bandwidth users  | Gzip (Nginx) + lazy loading + skeleton screens in React        |
| Offline support      | Cart persisted in localStorage, retry queue for failed orders  |
| POS sync load        | Bulk upsert with ON CONFLICT DO UPDATE (single query, batched) |

---

### Caching Strategy

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1 — Browser                                       │
│   - Product images: Cache-Control max-age=86400         │
│   - Cart: Zustand + localStorage (survives refresh)     │
│   - Auth token: localStorage (with expiry check)        │
├─────────────────────────────────────────────────────────┤
│ Layer 2 — Redis                                         │
│   - products:all        TTL 300s (invalidated on sync)  │
│   - products:category:* TTL 300s                        │
│   - otp:mobile:*        TTL 600s (10 min OTP window)    │
│   - ratelimit:ip:*      sliding window counters         │
├─────────────────────────────────────────────────────────┤
│ Layer 3 — PostgreSQL                                    │
│   - shared_buffers: 25% of RAM                          │
│   - work_mem: 64MB for analytics queries                │
│   - pg_stat_statements for slow query monitoring        │
└─────────────────────────────────────────────────────────┘
```

---

### Folder Structure

```
store/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js          (Prisma singleton)
│   │   │   └── redis.js       (ioredis singleton)
│   │   ├── middleware/
│   │   │   ├── auth.js        (JWT verification)
│   │   │   ├── errorHandler.js
│   │   │   ├── rateLimiter.js
│   │   │   └── validate.js    (Zod wrapper)
│   │   ├── modules/
│   │   │   ├── auth/          (routes, controller, service, schema)
│   │   │   ├── orders/
│   │   │   ├── products/
│   │   │   ├── dashboard/
│   │   │   └── pos/
│   │   ├── utils/
│   │   │   ├── logger.js      (Winston)
│   │   │   ├── jwt.js
│   │   │   ├── otp.js
│   │   │   └── orderNumber.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── manifest.json      (PWA manifest)
    ├── src/
    │   ├── api/               (axios instances per domain)
    │   ├── store/             (Zustand — cart, auth)
    │   ├── hooks/             (useCart, useVoiceSearch)
    │   ├── pages/             (CartPage, HomePage, DashboardPage)
    │   ├── components/
    │   │   ├── common/        (AuthModal, ProductCard, SearchBar)
    │   │   └── cart/          (BachatTracker, CheckoutSelector)
    │   └── utils/             (phoneticMatch, localStorage, currency)
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```
