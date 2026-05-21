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

export async function getAllProductsService({ categorySlug, search, page = 1, limit = 40, sort, minPrice, maxPrice, exclude }) {
  const isFiltered = !!(search || categorySlug || sort || minPrice || maxPrice || exclude);
  if (!isFiltered) {
    const cacheKey = `products:all:p${page}`;
    const cached = await cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    const result = await fetchFromDB({ page, limit });
    await cache.setex(cacheKey, CACHE_TTL.PRODUCTS, JSON.stringify(result));
    return result;
  }
  return fetchFromDB({ categorySlug, search, page, limit, sort, minPrice, maxPrice, exclude });
}

async function fetchFromDB({ categorySlug, search, page = 1, limit = 40, sort, minPrice, maxPrice, exclude }) {
  const skip = (page - 1) * limit;

  const priceFilter = (minPrice !== undefined || maxPrice !== undefined)
    ? { discountPrice: { ...(minPrice !== undefined && { gte: Number(minPrice) }), ...(maxPrice !== undefined && { lte: Number(maxPrice) }) } }
    : {};

  const where = {
    isActive: true,
    ...(exclude && { id: { not: exclude } }),
    ...(categorySlug && { category: { slug: categorySlug } }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { nameHi: { contains: search } },
        { nameGu: { contains: search } },
        { barcode: { equals: search } },
      ],
    }),
    ...priceFilter,
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, skip, take: limit, select: PRODUCT_SELECT, orderBy: buildOrderBy(sort) }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, totalPages: Math.ceil(total / limit) };
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

export async function getLabeledProductsService(label, limit = 12) {
  const labelMap = { clearance: { isClearance: true }, weeklySaver: { isWeeklySaver: true }, bestSeller: { isBestSeller: true } };
  const labelWhere = labelMap[label] || {};

  return prisma.product.findMany({
    where: { isActive: true, stockQty: { gt: 0 }, ...labelWhere },
    select: PRODUCT_SELECT,
    orderBy: [{ stockQty: 'desc' }, { name: 'asc' }],
    take: limit,
  });
}

export async function getProductByIdService(id) {
  const product = await prisma.product.findUnique({
    where: { id, isActive: true },
    select: { ...PRODUCT_SELECT, sku: true },
  });
  if (!product) throw Object.assign(new Error('Product not found'), { statusCode: 404 });
  return product;
}

export async function getTopDealsService(limit = 10) {
  const products = await prisma.product.findMany({
    where: { isActive: true, stockQty: { gt: 0 } },
    select: PRODUCT_SELECT,
    orderBy: [{ mrp: 'desc' }, { discountPrice: 'asc' }],
    take: limit * 3,
  });
  // Sort by actual discount % and trim
  return products
    .map((p) => ({ ...p, discountPct: p.mrp > p.discountPrice ? Math.round((1 - p.discountPrice / p.mrp) * 100) : 0 }))
    .filter((p) => p.discountPct > 0)
    .sort((a, b) => b.discountPct - a.discountPct)
    .slice(0, limit);
}

export async function getDailyEssentialsService(limit = 10) {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      stockQty: { gt: 0 },
      category: { slug: { in: ['staples', 'dairy', 'vegetables'] } },
    },
    select: PRODUCT_SELECT,
    orderBy: [{ stockQty: 'desc' }, { name: 'asc' }],
    take: limit,
  });
  return products;
}

export async function getRelatedProductsService(productId, categorySlug, limit = 8) {
  return prisma.product.findMany({
    where: { isActive: true, id: { not: productId }, category: { slug: categorySlug } },
    select: PRODUCT_SELECT,
    take: limit,
    orderBy: [{ stockQty: 'desc' }, { name: 'asc' }],
  });
}
