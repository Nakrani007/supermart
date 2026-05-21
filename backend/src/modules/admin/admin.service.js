// Admin service — auth, products, categories, banners, sections, slots, users, analytics.

import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db.js';
import { signToken } from '../../utils/jwt.js';
import { cache, CACHE_TTL } from '../../config/redis.js';
import { generateCategoryContent, generateSlug } from '../../utils/aiGenerate.js';

const CANCELLED = ['CANCELLED', 'REFUNDED'];

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function adminLoginService(username, password) {
  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });

  const token = signToken({ adminId: admin.id, username: admin.username, name: admin.name, isAdmin: true });
  return { token, admin: { id: admin.id, username: admin.username, name: admin.name } };
}

export async function ensureDefaultAdmin() {
  const count = await prisma.admin.count();
  if (count === 0) {
    const hash = await bcrypt.hash('store@123', 12);
    await prisma.admin.create({ data: { username: 'store', passwordHash: hash, name: 'Store Admin' } });
    console.log('[Admin] Default admin created: username=store password=store@123');
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getAdminProductsService({ page = 1, limit = 20, search, categorySlug, label, status }) {
  const skip = (page - 1) * limit;
  const where = {
    ...(status === 'active'   && { isActive: true  }),
    ...(status === 'inactive' && { isActive: false }),
    ...(categorySlug && { category: { slug: categorySlug } }),
    ...(label === 'bestSeller'  && { isBestSeller: true }),
    ...(label === 'clearance'   && { isClearance:  true }),
    ...(label === 'weeklySaver' && { isWeeklySaver: true }),
    ...(search && {
      OR: [
        { name:    { contains: search } },
        { sku:     { contains: search } },
        { barcode: { contains: search } },
      ],
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where, skip, take: limit,
      orderBy: [{ createdAt: 'desc' }],
      include: { category: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, totalPages: Math.ceil(total / limit) };
}

export async function createProductService(data) {
  const { name, sku, barcode, categoryId, mrp, discountPrice } = data;
  if (!name || !sku || !barcode || !categoryId || mrp == null || discountPrice == null) {
    throw Object.assign(new Error('Name, SKU, barcode, category, MRP and price are required'), { statusCode: 400 });
  }

  const product = await prisma.product.create({
    data: {
      name,
      nameHi:       data.nameHi       || null,
      nameGu:       data.nameGu       || null,
      description:  data.description  || null,
      sku,
      barcode,
      mrp:          Number(mrp),
      discountPrice: Number(discountPrice),
      stockQty:     Number(data.stockQty) || 0,
      unit:         data.unit         || 'piece',
      imageUrl:     data.imageUrl     || null,
      isActive:     data.isActive     !== false,
      isBestSeller: !!data.isBestSeller,
      isClearance:  !!data.isClearance,
      isWeeklySaver: !!data.isWeeklySaver,
      categoryId,
    },
    include: { category: { select: { name: true, slug: true } } },
  });

  await invalidateProductCache();
  return product;
}

export async function updateProductService(id, data) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Product not found'), { statusCode: 404 });

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(data.name         !== undefined && { name:         data.name         }),
      ...(data.nameHi       !== undefined && { nameHi:       data.nameHi       }),
      ...(data.nameGu       !== undefined && { nameGu:       data.nameGu       }),
      ...(data.description  !== undefined && { description:  data.description  }),
      ...(data.sku          !== undefined && { sku:          data.sku          }),
      ...(data.barcode      !== undefined && { barcode:      data.barcode      }),
      ...(data.mrp          !== undefined && { mrp:          Number(data.mrp)  }),
      ...(data.discountPrice !== undefined && { discountPrice: Number(data.discountPrice) }),
      ...(data.stockQty     !== undefined && { stockQty:     Number(data.stockQty) }),
      ...(data.unit         !== undefined && { unit:         data.unit         }),
      ...(data.imageUrl     !== undefined && { imageUrl:     data.imageUrl     }),
      ...(data.isActive     !== undefined && { isActive:     !!data.isActive   }),
      ...(data.isBestSeller !== undefined && { isBestSeller: !!data.isBestSeller }),
      ...(data.isClearance  !== undefined && { isClearance:  !!data.isClearance  }),
      ...(data.isWeeklySaver !== undefined && { isWeeklySaver: !!data.isWeeklySaver }),
      ...(data.categoryId   !== undefined && { categoryId:   data.categoryId   }),
    },
    include: { category: { select: { name: true, slug: true } } },
  });

  await invalidateProductCache();
  return updated;
}

export async function deleteProductService(id) {
  const p = await prisma.product.findUnique({ where: { id }, include: { _count: { select: { orderItems: true } } } });
  if (!p) throw Object.assign(new Error('Product not found'), { statusCode: 404 });

  if (p._count.orderItems > 0) {
    // Soft-delete: disable instead of deleting to preserve order history integrity
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    await invalidateProductCache();
    return { deleted: false, disabled: true, message: 'Product has order history — disabled instead of deleted' };
  }

  await prisma.product.delete({ where: { id } });
  await invalidateProductCache();
  return { deleted: true };
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getAdminCategoriesService() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  });
}

export async function createCategoryService(data) {
  if (!data.name) throw Object.assign(new Error('Category name is required'), { statusCode: 400 });

  // Auto-generate slug if not provided
  const slug = (data.slug || generateSlug(data.name)).toLowerCase().replace(/\s+/g, '-');

  // AI content generation — builds description, tags, metaTitle from templates
  let aiContent = {};
  if (data.autoGenerate) {
    aiContent = generateCategoryContent(data.name, slug);
  }

  const cat = await prisma.category.create({
    data: {
      name:        data.name,
      nameHi:      data.nameHi      || null,
      nameGu:      data.nameGu      || null,
      slug,
      isVisible:   data.isVisible !== false,
      icon:        data.icon        || null,
      imageUrl:    data.imageUrl    || null,
      sortOrder:   Number(data.sortOrder) || 0,
      // Use AI-generated values unless admin provided explicit overrides
      description: data.description ?? aiContent.description ?? null,
      tags:        data.tags        ?? aiContent.tags        ?? null,
      metaTitle:   data.metaTitle   ?? aiContent.metaTitle   ?? null,
    },
  });

  await cache.del('categories');
  return cat;
}

export async function updateCategoryService(id, data) {
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) throw Object.assign(new Error('Category not found'), { statusCode: 404 });

  // Re-generate AI content if requested (uses current name/slug if not being changed)
  let aiContent = {};
  if (data.autoGenerate) {
    const nameForAI = data.name  || cat.name;
    const slugForAI = data.slug  || cat.slug;
    aiContent = generateCategoryContent(nameForAI, slugForAI);
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(data.name        !== undefined && { name:        data.name        }),
      ...(data.nameHi      !== undefined && { nameHi:      data.nameHi      }),
      ...(data.nameGu      !== undefined && { nameGu:      data.nameGu      }),
      ...(data.slug        !== undefined && { slug:        data.slug.toLowerCase().replace(/\s+/g, '-') }),
      ...(data.isVisible   !== undefined && { isVisible:   !!data.isVisible }),
      ...(data.icon        !== undefined && { icon:        data.icon        }),
      ...(data.imageUrl    !== undefined && { imageUrl:    data.imageUrl    }),
      ...(data.sortOrder   !== undefined && { sortOrder:   Number(data.sortOrder) }),
      // New SEO fields — explicit value wins; AI fallback applied only when autoGenerate=true
      description: data.description ?? (data.autoGenerate ? aiContent.description : undefined),
      tags:        data.tags        ?? (data.autoGenerate ? aiContent.tags        : undefined),
      metaTitle:   data.metaTitle   ?? (data.autoGenerate ? aiContent.metaTitle   : undefined),
    },
  });

  await cache.del('categories');
  return updated;
}

export async function deleteCategoryService(id) {
  const cat = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!cat) throw Object.assign(new Error('Category not found'), { statusCode: 404 });
  if (cat._count.products > 0) throw Object.assign(new Error(`Cannot delete: ${cat._count.products} product(s) use this category`), { statusCode: 400 });

  await prisma.category.delete({ where: { id } });
  await cache.del('categories');
}

export async function reorderCategoriesService(orderedIds) {
  await Promise.all(orderedIds.map((id, idx) =>
    prisma.category.update({ where: { id }, data: { sortOrder: idx } })
  ));
  await cache.del('categories');
}

// ─── Banners ──────────────────────────────────────────────────────────────────

export async function getBannersService() {
  return prisma.banner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
}

export async function getActiveBannersService() {
  const now = new Date();
  return prisma.banner.findMany({
    where: {
      isActive: true,
      OR: [
        { startDate: null },
        { startDate: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
      ],
    },
    orderBy: [{ sortOrder: 'asc' }],
  });
}

export async function createBannerService(data) {
  return prisma.banner.create({
    data: {
      title:     data.title    || 'New Banner',
      subtitle:  data.subtitle || null,
      imageUrl:  data.imageUrl || null,
      bgColor:   data.bgColor  || '#0f766e',
      ctaText:   data.ctaText  || 'Shop Now',
      ctaLink:   data.ctaLink  || null,
      isActive:  data.isActive !== false,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate:   data.endDate   ? new Date(data.endDate)   : null,
      sortOrder: Number(data.sortOrder) || 0,
    },
  });
}

export async function updateBannerService(id, data) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) throw Object.assign(new Error('Banner not found'), { statusCode: 404 });

  return prisma.banner.update({
    where: { id },
    data: {
      ...(data.title     !== undefined && { title:     data.title     }),
      ...(data.subtitle  !== undefined && { subtitle:  data.subtitle  }),
      ...(data.imageUrl  !== undefined && { imageUrl:  data.imageUrl  }),
      ...(data.bgColor   !== undefined && { bgColor:   data.bgColor   }),
      ...(data.ctaText   !== undefined && { ctaText:   data.ctaText   }),
      ...(data.ctaLink   !== undefined && { ctaLink:   data.ctaLink   }),
      ...(data.isActive  !== undefined && { isActive:  !!data.isActive }),
      ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
      ...(data.endDate   !== undefined && { endDate:   data.endDate   ? new Date(data.endDate)   : null }),
      ...(data.sortOrder !== undefined && { sortOrder: Number(data.sortOrder) }),
    },
  });
}

export async function deleteBannerService(id) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) throw Object.assign(new Error('Banner not found'), { statusCode: 404 });
  await prisma.banner.delete({ where: { id } });
}

// ─── Home Sections ────────────────────────────────────────────────────────────

export async function getHomeSectionsService() {
  return prisma.homeSection.findMany({ orderBy: { sortOrder: 'asc' } });
}

export async function getVisibleSectionsService() {
  return prisma.homeSection.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' } });
}

export async function updateHomeSectionService(key, data) {
  const section = await prisma.homeSection.findUnique({ where: { key } });
  if (!section) throw Object.assign(new Error('Section not found'), { statusCode: 404 });

  return prisma.homeSection.update({
    where: { key },
    data: {
      ...(data.title     !== undefined && { title:     data.title     }),
      ...(data.subtitle  !== undefined && { subtitle:  data.subtitle  }),
      ...(data.isVisible !== undefined && { isVisible: !!data.isVisible }),
    },
  });
}

// ─── Delivery Slots ───────────────────────────────────────────────────────────

export async function getAdminSlotsService({ from, to }) {
  const where = {};
  if (from || to) {
    where.date = {
      ...(from && { gte: new Date(from) }),
      ...(to   && { lte: new Date(to)   }),
    };
  }
  return prisma.deliverySlot.findMany({ where, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] });
}

export async function createSlotService(data) {
  const date = new Date(data.date);
  date.setHours(0, 0, 0, 0);

  return prisma.deliverySlot.create({
    data: {
      date,
      startTime: data.startTime,
      endTime:   data.endTime,
      capacity:  Number(data.capacity) || 20,
      booked:    0,
      isActive:  data.isActive !== false,
    },
  });
}

export async function updateSlotService(id, data) {
  const slot = await prisma.deliverySlot.findUnique({ where: { id } });
  if (!slot) throw Object.assign(new Error('Slot not found'), { statusCode: 404 });

  return prisma.deliverySlot.update({
    where: { id },
    data: {
      ...(data.capacity  !== undefined && { capacity:  Number(data.capacity)  }),
      ...(data.isActive  !== undefined && { isActive:  !!data.isActive        }),
      ...(data.startTime !== undefined && { startTime: data.startTime         }),
      ...(data.endTime   !== undefined && { endTime:   data.endTime           }),
    },
  });
}

export async function deleteSlotService(id) {
  const slot = await prisma.deliverySlot.findUnique({ where: { id }, include: { _count: { select: { orders: true } } } });
  if (!slot) throw Object.assign(new Error('Slot not found'), { statusCode: 404 });
  if (slot._count.orders > 0) throw Object.assign(new Error('Cannot delete a slot that has existing orders'), { statusCode: 400 });
  await prisma.deliverySlot.delete({ where: { id } });
}

// ─── Delivery Config ──────────────────────────────────────────────────────────

export async function getDeliveryConfigService() {
  let config = await prisma.deliveryConfig.findFirst();
  if (!config) {
    config = await prisma.deliveryConfig.create({
      data: { deliveryEnabled: true, pickupEnabled: true, earliestMsg: 'Delivery in 2-4 hours', freeDeliveryMin: 500, deliveryFee: 30 },
    });
  }
  return config;
}

export async function updateDeliveryConfigService(data) {
  let config = await prisma.deliveryConfig.findFirst();
  if (!config) config = await prisma.deliveryConfig.create({ data: {} });

  return prisma.deliveryConfig.update({
    where: { id: config.id },
    data: {
      ...(data.deliveryEnabled !== undefined && { deliveryEnabled: !!data.deliveryEnabled }),
      ...(data.pickupEnabled   !== undefined && { pickupEnabled:   !!data.pickupEnabled   }),
      ...(data.earliestMsg     !== undefined && { earliestMsg:     data.earliestMsg        }),
      ...(data.freeDeliveryMin !== undefined && { freeDeliveryMin: Number(data.freeDeliveryMin) }),
      ...(data.deliveryFee     !== undefined && { deliveryFee:     Number(data.deliveryFee) }),
    },
  });
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUsersService({ page = 1, limit = 20, search = null }) {
  const skip = (page - 1) * limit;
  const where = search
    ? { OR: [{ name: { contains: search } }, { mobile: { contains: search } }, { email: { contains: search } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, mobile: true, email: true, password: true, isVerified: true, isActive: true, createdAt: true, _count: { select: { orders: true } } },
    }),
    prisma.user.count({ where }),
  ]);

  const userIds = users.map((u) => u.id);
  const agg = await prisma.order.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds }, status: { notIn: CANCELLED } },
    _sum: { total: true },
  });
  const spendMap = new Map(agg.map((a) => [a.userId, Number(a._sum.total) || 0]));

  const enriched = users.map((u) => ({
    id: u.id, name: u.name || 'Guest', mobile: u.mobile, email: u.email,
    isVerified: u.isVerified, isActive: u.isActive, createdAt: u.createdAt,
    orderCount: u._count.orders, totalSpent: spendMap.get(u.id) || 0,
    authType: u.password ? 'password' : 'otp',
    passwordHint: u.password ? u.password.slice(0, 7) + '••••••••••••••••••••' : null,
  }));

  return { users: enriched, total, page, totalPages: Math.ceil(total / limit) };
}

export async function toggleUserService(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return prisma.user.update({ where: { id }, data: { isActive: !user.isActive }, select: { id: true, isActive: true } });
}

export async function getUserOrdersService(userId, { page = 1, limit = 10 }) {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: { select: { name: true, unit: true, imageUrl: true } } } },
        deliverySlot: { select: { date: true, startTime: true, endTime: true } },
      },
    }),
    prisma.order.count({ where: { userId } }),
  ]);
  return { orders, total, page, totalPages: Math.ceil(total / limit) };
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getAdminMetrics() {
  const cacheKey = 'admin:metrics';
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const now        = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now); monthStart.setDate(1);    monthStart.setHours(0, 0, 0, 0);
  const yearStart  = new Date(now); yearStart.setMonth(0, 1); yearStart.setHours(0, 0, 0, 0);

  const [
    todayRev, monthRev, yearRev, allTimeRev,
    todayCount, monthCount, totalCount,
    revenueByDay, revenueByMonth, revenueByYear,
    lineItemGroups, statusGroups, recentOrders, totalUsers,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { createdAt: { gte: todayStart }, status: { notIn: CANCELLED } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: monthStart }, status: { notIn: CANCELLED } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: yearStart  }, status: { notIn: CANCELLED } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: {                                   status: { notIn: CANCELLED } }, _sum: { total: true } }),

    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.order.count(),

    getDailyRevenue(30),
    getMonthlyRevenue(12),
    getYearlyRevenue(),

    prisma.orderLineItem.groupBy({
      by: ['productId'],
      where: { order: { createdAt: { gte: thirtyDaysAgo() }, status: { notIn: CANCELLED } } },
      _sum: { lineTotal: true, quantity: true }, _count: { id: true },
      orderBy: { _sum: { lineTotal: 'desc' } }, take: 10,
    }),
    prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.order.findMany({
      take: 10, orderBy: { createdAt: 'desc' },
      select: { id: true, orderNumber: true, status: true, total: true, createdAt: true, user: { select: { name: true, mobile: true } }, items: { select: { id: true } } },
    }),
    prisma.user.count(),
  ]);

  const productIds = lineItemGroups.map((r) => r.productId);
  const products   = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, unit: true, imageUrl: true } });
  const pMap       = new Map(products.map((p) => [p.id, p]));
  const topProducts = lineItemGroups.map((r) => ({ ...pMap.get(r.productId), totalRevenue: r._sum.lineTotal, totalQty: r._sum.quantity, orderCount: r._count.id }));

  const metrics = {
    revenue: {
      today: Number(todayRev._sum.total) || 0, month: Number(monthRev._sum.total) || 0,
      year: Number(yearRev._sum.total) || 0,   allTime: Number(allTimeRev._sum.total) || 0,
    },
    orders: { today: todayCount, month: monthCount, total: totalCount },
    totalUsers, revenueByDay, revenueByMonth, revenueByYear, topProducts,
    ordersByStatus: Object.fromEntries(statusGroups.map((r) => [r.status, r._count.id])),
    recentOrders: recentOrders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status, total: o.total, itemCount: o.items.length, createdAt: o.createdAt, customer: o.user })),
  };

  await cache.setex(cacheKey, CACHE_TTL.DASHBOARD, JSON.stringify(metrics));
  return metrics;
}

// ─── Revenue helpers ──────────────────────────────────────────────────────────

async function getDailyRevenue(days) {
  const since = new Date(); since.setDate(since.getDate() - days + 1); since.setHours(0, 0, 0, 0);
  const orders = await prisma.order.findMany({ where: { createdAt: { gte: since }, status: { notIn: CANCELLED } }, select: { createdAt: true, total: true } });
  const buckets = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { date: key, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), revenue: 0, orders: 0 };
  }
  for (const o of orders) { const key = new Date(o.createdAt).toISOString().slice(0, 10); if (buckets[key]) { buckets[key].revenue += Number(o.total); buckets[key].orders += 1; } }
  return Object.values(buckets);
}

async function getMonthlyRevenue(months) {
  const since = new Date(); since.setMonth(since.getMonth() - months + 1); since.setDate(1); since.setHours(0, 0, 0, 0);
  const orders = await prisma.order.findMany({ where: { createdAt: { gte: since }, status: { notIn: CANCELLED } }, select: { createdAt: true, total: true } });
  const buckets = {};
  for (let i = 0; i < months; i++) {
    const d = new Date(); d.setMonth(d.getMonth() - (months - 1 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets[key] = { month: key, label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), revenue: 0, orders: 0 };
  }
  for (const o of orders) { const d = new Date(o.createdAt); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; if (buckets[key]) { buckets[key].revenue += Number(o.total); buckets[key].orders += 1; } }
  return Object.values(buckets);
}

async function getYearlyRevenue() {
  const cur = new Date().getFullYear();
  const since = new Date(cur - 4, 0, 1);
  const orders = await prisma.order.findMany({ where: { createdAt: { gte: since }, status: { notIn: CANCELLED } }, select: { createdAt: true, total: true } });
  const buckets = {};
  for (let y = cur - 4; y <= cur; y++) buckets[y] = { year: y, label: String(y), revenue: 0, orders: 0 };
  for (const o of orders) { const y = new Date(o.createdAt).getFullYear(); if (buckets[y]) { buckets[y].revenue += Number(o.total); buckets[y].orders += 1; } }
  return Object.values(buckets);
}

function thirtyDaysAgo() { const d = new Date(); d.setDate(d.getDate() - 30); return d; }

// ─── Cache helpers ────────────────────────────────────────────────────────────

async function invalidateProductCache() {
  const keys = await cache.keys('products:*');
  if (keys.length > 0) await cache.del(...keys);
  await cache.del('admin:metrics');
}
