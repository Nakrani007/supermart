// Dashboard analytics — SQLite-compatible version.
// Production: restore raw DATE_TRUNC query in getDailyRevenue().

import { prisma } from '../../config/db.js';
import { cache, CACHE_TTL } from '../../config/redis.js';

export async function getDashboardMetrics() {
  const cacheKey = 'dashboard:metrics';
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const CANCELLED_STATUSES = ['CANCELLED', 'REFUNDED'];

  const [todayAgg, todayOrderCount, allTimeAgg, allTimeCount, lineItemGroups, userGroups, statusGroups, slots, revenueByDay] =
    await Promise.all([
      prisma.order.aggregate({
        where: { createdAt: { gte: todayStart }, status: { notIn: CANCELLED_STATUSES } },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.order.aggregate({
        where: { status: { notIn: CANCELLED_STATUSES } },
        _sum: { total: true },
      }),
      prisma.order.count(),

      // Top products by revenue (last 30 days)
      prisma.orderLineItem.groupBy({
        by: ['productId'],
        where: { order: { createdAt: { gte: thirtyDaysAgo() }, status: { notIn: CANCELLED_STATUSES } } },
        _sum: { lineTotal: true, quantity: true },
        _count: { id: true },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 10,
      }),

      // Top customers by LTV
      prisma.order.groupBy({
        by: ['userId'],
        where: { status: { notIn: CANCELLED_STATUSES } },
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),

      // Orders by status
      prisma.order.groupBy({ by: ['status'], _count: { id: true } }),

      // Today's delivery slots
      prisma.deliverySlot.findMany({
        where: { date: { gte: todayStart }, isActive: true },
        select: { startTime: true, endTime: true, capacity: true, booked: true },
        orderBy: { startTime: 'asc' },
      }),

      // Revenue for last 7 days
      getDailyRevenue(7),
    ]);

  // Enrich top products with names
  const productIds = lineItemGroups.map((r) => r.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, unit: true, imageUrl: true },
  });
  const pMap = new Map(products.map((p) => [p.id, p]));
  const topProducts = lineItemGroups.map((r) => ({
    ...pMap.get(r.productId),
    totalRevenue: r._sum.lineTotal,
    totalQty: r._sum.quantity,
    orderCount: r._count.id,
  }));

  // Enrich top customers with names
  const userIds = userGroups.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, mobile: true },
  });
  const uMap = new Map(users.map((u) => [u.id, u]));
  const topCustomers = userGroups.map((r) => ({
    ...uMap.get(r.userId),
    lifetimeValue: r._sum.total,
    orderCount: r._count.id,
  }));

  const metrics = {
    today: { revenue: allTimeAgg ? Number(todayAgg._sum.total) || 0 : 0, orders: todayOrderCount },
    allTime: { revenue: Number(allTimeAgg._sum.total) || 0, orders: allTimeCount },
    topProducts,
    topCustomers,
    ordersByStatus: Object.fromEntries(statusGroups.map((r) => [r.status, r._count.id])),
    slotUtilization: slots,
    revenueByDay,
  };

  await cache.setex(cacheKey, CACHE_TTL.DASHBOARD, JSON.stringify(metrics));
  return metrics;
}

// SQLite-compatible daily revenue: fetch all recent orders and bucket in JS
async function getDailyRevenue(days) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
    select: { createdAt: true, total: true },
  });

  // Bucket by date string
  const buckets = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { date: key, revenue: 0, orders: 0 };
  }

  for (const o of orders) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    if (buckets[key]) {
      buckets[key].revenue += Number(o.total);
      buckets[key].orders += 1;
    }
  }

  return Object.values(buckets);
}

function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

// ─── Admin Order Management ───────────────────────────────────────────────────

const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

export async function getAllOrdersService({ page = 1, limit = 20, status = null, search = null }) {
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(search && {
      OR: [
        { orderNumber: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { mobile: { contains: search } } },
      ],
    }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, mobile: true, email: true } },
        items: {
          include: { product: { select: { name: true, unit: true, imageUrl: true } } },
        },
        deliverySlot: { select: { date: true, startTime: true, endTime: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, totalPages: Math.ceil(total / limit) };
}

export async function updateOrderStatusService(orderId, newStatus) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw Object.assign(new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`), { statusCode: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
    include: {
      user: { select: { name: true, mobile: true } },
      items: { include: { product: { select: { name: true, unit: true } } } },
      deliverySlot: { select: { date: true, startTime: true, endTime: true } },
    },
  });

  // Invalidate dashboard cache so metrics refresh
  await cache.del('dashboard:metrics');

  return updated;
}
