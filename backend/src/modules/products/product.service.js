import { prisma } from '../../config/db.js';
import { cache, CACHE_TTL } from '../../config/redis.js';

const PRODUCT_SELECT = {
  id: true, name: true, nameHi: true, nameGu: true,
  mrp: true, discountPrice: true, stockQty: true,
  unit: true, imageUrl: true, barcode: true, description: true,
  isBestSeller: true, isClearance: true, isWeeklySaver: true,
  category: { select: { name: true, slug: true } },
};

function buildOrderBy(sort) {
  switch (sort) {
    case 'price_asc':  return [{ discountPrice: 'asc' }];
    case 'price_desc': return [{ discountPrice: 'desc' }];
    case 'discount':   return [{ mrp: 'desc' }, { discountPrice: 'asc' }];
    case 'name_asc':   return [{ name: 'asc' }];
    default:           return [{ stockQty: 'desc' }, { name: 'asc' }];
  }
}

// ── Denylist store filter ─────────────────────────────────────────────────────
// Show all globally-active products EXCEPT those explicitly hidden for this store.
//
// Products with NO StoreProduct record  → visible (no config = not hidden)
// Products with StoreProduct.isActive = true  → visible
// Products with StoreProduct.isActive = false → excluded (denylist hit)
//
// This means hiding a product in Store 3 has zero effect on Store 1 or Store 2.
// It also means a new store with zero configuration shows the full catalog —
// no inventory setup required before products appear.
function buildStoreWhere(base, storeId) {
  if (!storeId) return base;
  return {
    ...base,
    NOT: { storeProducts: { some: { storeId, isActive: false } } },
  };
}

// Include store-specific StoreProduct in select so we can surface correct stockQty and pricing
function buildSelectWithStore(storeId) {
  if (!storeId) return PRODUCT_SELECT;
  return {
    ...PRODUCT_SELECT,
    storeProducts: { where: { storeId }, select: { stockQty: true, mrp: true, discountPrice: true } },
  };
}

// Swap in store-specific stockQty and pricing where a StoreProduct record exists
function mapStoreStock(products, storeId) {
  if (!storeId) return products;
  return products.map(({ storeProducts, ...p }) => {
    const sp = storeProducts?.[0];
    return {
      ...p,
      stockQty:      sp?.stockQty      ?? p.stockQty,
      mrp:           sp?.mrp           ?? p.mrp,
      discountPrice: sp?.discountPrice ?? p.discountPrice,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export async function getAllProductsService({ categorySlug, search, page = 1, limit = 40, sort, minPrice, maxPrice, exclude, storeId }) {
  // Only cache unfiltered global requests (no storeId, no filters)
  const isFiltered = !!(search || categorySlug || sort || minPrice || maxPrice || exclude || storeId);
  if (!isFiltered) {
    const cacheKey = `products:all:p${page}`;
    const cached = await cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    const result = await fetchFromDB({ page, limit });
    await cache.setex(cacheKey, CACHE_TTL.PRODUCTS, JSON.stringify(result));
    return result;
  }
  return fetchFromDB({ categorySlug, search, page, limit, sort, minPrice, maxPrice, exclude, storeId });
}

async function fetchFromDB({ categorySlug, search, page = 1, limit = 40, sort, minPrice, maxPrice, exclude, storeId }) {
  const skip = (page - 1) * limit;

  const priceFilter = (minPrice !== undefined || maxPrice !== undefined)
    ? { discountPrice: { ...(minPrice !== undefined && { gte: Number(minPrice) }), ...(maxPrice !== undefined && { lte: Number(maxPrice) }) } }
    : {};

  const baseWhere = {
    isActive: true,
    ...(exclude      && { id: { not: exclude } }),
    ...(categorySlug && { category: { slug: categorySlug } }),
    ...(search && {
      OR: [
        { name:    { contains: search } },
        { nameHi:  { contains: search } },
        { nameGu:  { contains: search } },
        { barcode: { equals:   search } },
      ],
    }),
    ...priceFilter,
  };

  const where        = buildStoreWhere(baseWhere, storeId);
  const selectFields = buildSelectWithStore(storeId);

  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, skip, take: limit, select: selectFields, orderBy: buildOrderBy(sort) }),
    prisma.product.count({ where }),
  ]);

  return { products: mapStoreStock(products, storeId), total, page, totalPages: Math.ceil(total / limit) };
}

export async function getCategoriesService() {
  const cached = await cache.get('categories');
  if (cached) return JSON.parse(cached);

  const categories = await prisma.category.findMany({
    where: { isVisible: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });

  await cache.setex('categories', CACHE_TTL.PRODUCTS, JSON.stringify(categories));
  return categories;
}

export async function getLabeledProductsService(label, limit = 12, storeId) {
  const labelMap = {
    clearance:   { isClearance: true },
    weeklySaver: { isWeeklySaver: true },
    bestSeller:  { isBestSeller: true },
  };
  const labelWhere = labelMap[label] || {};

  const baseWhere    = { isActive: true, stockQty: { gt: 0 }, ...labelWhere };
  const where        = buildStoreWhere(baseWhere, storeId);
  const selectFields = buildSelectWithStore(storeId);

  const products = await prisma.product.findMany({
    where, select: selectFields, orderBy: [{ name: 'asc' }], take: limit,
  });

  return mapStoreStock(products, storeId);
}

export async function getProductByIdService(id, storeId) {
  const product = await prisma.product.findUnique({
    where: { id, isActive: true },
    select: {
      ...PRODUCT_SELECT, sku: true,
      // Include store-specific record so we can check visibility + use store stock
      ...(storeId && {
        storeProducts: {
          where:  { storeId },
          select: { isActive: true, stockQty: true },
        },
      }),
    },
  });
  if (!product) throw Object.assign(new Error('Product not found'), { statusCode: 404 });

  if (storeId) {
    const sp = product.storeProducts?.[0];
    // Only 404 when there is an EXPLICIT hide record (isActive: false) for this store.
    // No StoreProduct record at all = product is visible (denylist semantics).
    if (sp && !sp.isActive) {
      throw Object.assign(new Error('Product not available at this store'), { statusCode: 404 });
    }
    const { storeProducts, ...rest } = product;
    // Use store-specific stockQty if a record exists, otherwise fall back to global
    return sp ? { ...rest, stockQty: sp.stockQty } : rest;
  }

  // Global path — strip storeProducts if present
  const { storeProducts, ...rest } = product;
  return rest;
}

export async function getTopDealsService(limit = 10, storeId) {
  const baseWhere    = { isActive: true, stockQty: { gt: 0 } };
  const where        = buildStoreWhere(baseWhere, storeId);
  const selectFields = buildSelectWithStore(storeId);

  const products = await prisma.product.findMany({
    where, select: selectFields,
    orderBy: [{ mrp: 'desc' }, { discountPrice: 'asc' }],
    take: limit * 3,
  });

  return mapStoreStock(products, storeId)
    .map((p) => ({ ...p, discountPct: p.mrp > p.discountPrice ? Math.round((1 - p.discountPrice / p.mrp) * 100) : 0 }))
    .filter((p) => p.discountPct > 0)
    .sort((a, b) => b.discountPct - a.discountPct)
    .slice(0, limit);
}

export async function getDailyEssentialsService(limit = 10, storeId) {
  const baseWhere = {
    isActive: true,
    stockQty: { gt: 0 },
    category: { slug: { in: ['staples', 'dairy', 'vegetables'] } },
  };
  const where        = buildStoreWhere(baseWhere, storeId);
  const selectFields = buildSelectWithStore(storeId);

  const products = await prisma.product.findMany({
    where, select: selectFields, orderBy: [{ name: 'asc' }], take: limit,
  });
  return mapStoreStock(products, storeId);
}

export async function getRelatedProductsService(productId, categorySlug, limit = 8, storeId) {
  const baseWhere = {
    isActive: true,
    id: { not: productId },
    category: { slug: categorySlug },
  };
  const where        = buildStoreWhere(baseWhere, storeId);
  const selectFields = buildSelectWithStore(storeId);

  const products = await prisma.product.findMany({
    where, select: selectFields, take: limit,
    orderBy: [{ name: 'asc' }],
  });
  return mapStoreStock(products, storeId);
}

// ── Cart validation against a specific store ──────────────────────────────────
// Returns unavailableItems[] with productId + reason for each unavailable item.
// Falls back to global Product.stockQty when no StoreProduct record exists.

export async function validateCartService(storeId, items) {
  if (!storeId || !items?.length) return { unavailableItems: [] };

  const productIds = items.map((i) => i.productId);

  // Fetch store-specific inventory records
  const storeProducts = await prisma.storeProduct.findMany({
    where: { storeId, productId: { in: productIds } },
    select: { productId: true, stockQty: true, isActive: true },
  });
  const spMap = new Map(storeProducts.map((sp) => [sp.productId, sp]));

  // Fetch global product records for fallback
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true, stockQty: true },
  });
  const prodMap = new Map(products.map((p) => [p.id, p]));

  const unavailableItems = [];

  for (const item of items) {
    const prod = prodMap.get(item.productId);
    if (!prod) {
      unavailableItems.push({ productId: item.productId, reason: 'Product not found' });
      continue;
    }

    const sp = spMap.get(item.productId);
    if (sp) {
      // Per-store record exists — use it
      if (!sp.isActive || sp.stockQty === 0) {
        unavailableItems.push({ productId: item.productId, reason: 'Out of stock at this store' });
      } else if (sp.stockQty < item.quantity) {
        unavailableItems.push({
          productId: item.productId,
          reason: `Only ${sp.stockQty} available`,
          available: sp.stockQty,
        });
      }
    } else {
      // No per-store record → fallback to global stock
      if (prod.stockQty === 0) {
        unavailableItems.push({ productId: item.productId, reason: 'Out of stock' });
      }
    }
  }

  return { unavailableItems };
}
