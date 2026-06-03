// Order service — stock safety via Prisma transaction.
// Dev (SQLite): uses standard Prisma transaction (no SELECT FOR UPDATE).
// Production (PostgreSQL): restore isolationLevel: 'Serializable' + raw SELECT FOR UPDATE.

import { prisma } from '../../config/db.js';
import { cache } from '../../config/redis.js';
import { generateOrderNumber, generateFallbackOrderNumber } from '../../utils/orderNumber.js';
import { haversineKm } from '../../utils/haversine.js';
import { logger } from '../../utils/logger.js';

const FREE_DELIVERY_THRESHOLD = Number(process.env.FREE_DELIVERY_THRESHOLD) || 500;
const DELIVERY_FEE            = Number(process.env.DELIVERY_FEE)            || 40;
const MAX_ORDER_RETRIES       = 3;

// Store location — sourced from .env so the owner can update without a redeploy
const STORE_LAT          = parseFloat(process.env.STORE_LAT          || '21.2094');
const STORE_LNG          = parseFloat(process.env.STORE_LNG          || '72.8261');
const DELIVERY_RADIUS_KM = parseFloat(process.env.DELIVERY_RADIUS_KM || '4');
const STORE_ADDRESS      = process.env.STORE_ADDRESS || 'Kapodra, Surat, Gujarat';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createErr(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

/**
 * Returns true when a Prisma error is a unique-constraint violation on the
 * `orderNumber` field.  Checked against both the error code (P2002) and the
 * meta.target / message so it works on SQLite and PostgreSQL.
 */
function isOrderNumberCollision(err) {
  if (err?.code !== 'P2002') return false;
  const target  = Array.isArray(err?.meta?.target)  ? err.meta.target.join(',')  : String(err?.meta?.target  ?? '');
  const message = String(err?.message ?? '');
  return (
    target.includes('orderNumber') ||
    message.toLowerCase().includes('ordernumber') ||
    // SQLite surfaces unique violations without a structured target field
    (target === '' && message.toLowerCase().includes('unique'))
  );
}

// ─── Create Order ─────────────────────────────────────────────────────────────

export async function createOrderService(userId, orderData) {
  const { cartItems, fulfillmentType, deliverySlotId, address, notes, deliveryLocation, storeId } = orderData;
  const productIds = cartItems.map((i) => i.productId);

  // ── Delivery zone check ────────────────────────────────────────────────────
  // Only enforced when the client sends GPS coordinates (browser may deny permission).
  // HOME_DELIVERY without coordinates is still accepted — rider confirms on ground.
  if (fulfillmentType === 'HOME_DELIVERY' && deliveryLocation) {
    const dist = haversineKm(deliveryLocation.lat, deliveryLocation.lng, STORE_LAT, STORE_LNG);
    if (dist > DELIVERY_RADIUS_KM) {
      throw createErr(
        `Your location is ${dist.toFixed(1)} km from our store (${STORE_ADDRESS}). ` +
        `We deliver within ${DELIVERY_RADIUS_KM} km only.`,
        422
      );
    }
    logger.info({ dist: dist.toFixed(2), userId }, '[Order] Delivery zone check passed');
  }

  let order;
  let lastErr;

  for (let attempt = 1; attempt <= MAX_ORDER_RETRIES; attempt++) {
    // Pick generator: primary on first attempt, high-entropy fallback on retries
    const orderNumber = attempt === 1
      ? generateOrderNumber()
      : generateFallbackOrderNumber();

    logger.info({ attempt, orderNumber, userId }, '[Order] Attempting order creation');

    try {
      order = await prisma.$transaction(async (tx) => {

        // ── 1. Load & validate products ────────────────────────────────────
        const products = await tx.product.findMany({
          where:  { id: { in: productIds } },
          select: { id: true, name: true, stockQty: true, mrp: true, discountPrice: true, isActive: true },
        });

        const productMap = new Map(products.map((p) => [p.id, p]));

        for (const item of cartItems) {
          const product = productMap.get(item.productId);
          if (!product)          throw createErr(`Product not found: ${item.productId}`, 404);
          if (!product.isActive) throw createErr(`"${product.name}" is currently unavailable`, 400);
          if (product.stockQty < item.quantity) {
            throw Object.assign(
              createErr(`Only ${product.stockQty} unit(s) of "${product.name}" available`, 409),
              { available: product.stockQty, productId: product.id }
            );
          }
        }

        // ── 2. Reserve delivery slot ───────────────────────────────────────
        if (fulfillmentType === 'HOME_DELIVERY' && deliverySlotId) {
          const slot = await tx.deliverySlot.findUnique({
            where:  { id: deliverySlotId },
            select: { capacity: true, booked: true, isActive: true },
          });
          if (!slot || !slot.isActive)     throw createErr('Selected delivery slot is unavailable', 400);
          if (slot.booked >= slot.capacity) throw createErr('This delivery slot is fully booked. Please choose another.', 409);

          await tx.deliverySlot.update({
            where: { id: deliverySlotId },
            data:  { booked: { increment: 1 } },
          });
        }

        // ── 3. Build line items with price snapshot ────────────────────────
        const lineItems = cartItems.map((item) => {
          const p          = productMap.get(item.productId);
          const unitPrice  = Number(p.discountPrice);
          const mrpAtPurchase = Number(p.mrp);
          return {
            productId:   item.productId,
            quantity:    item.quantity,
            unitPrice,
            mrpAtPurchase,
            lineTotal:   unitPrice * item.quantity,
          };
        });

        const subtotal   = lineItems.reduce((s, li) => s + li.lineTotal, 0);
        const discount   = lineItems.reduce((s, li) => s + (li.mrpAtPurchase - li.unitPrice) * li.quantity, 0);
        const deliveryFee =
          fulfillmentType === 'STORE_PICKUP' || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
        const total = subtotal + deliveryFee;

        const addressStr = address ? JSON.stringify(address) : null;

        // ── 4. Create order (may throw P2002 on duplicate orderNumber) ─────
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status:          'PENDING',
            fulfillmentType,
            deliverySlotId:  deliverySlotId || null,
            storeId:         storeId        || null,
            address:         addressStr,
            subtotal,
            discount,
            deliveryFee,
            total,
            notes:           notes || null,
            // Save customer GPS for map view + delivery tracking
            customerLat:     deliveryLocation?.lat  ?? null,
            customerLng:     deliveryLocation?.lng  ?? null,
            items:           { create: lineItems },
          },
          include: {
            items:        { include: { product: { select: { name: true, imageUrl: true, unit: true } } } },
            deliverySlot: { select: { date: true, startTime: true, endTime: true } },
          },
        });

        // ── 5. Deduct stock ───────────────────────────────────────────────
        for (const item of cartItems) {
          await tx.product.update({
            where: { id: item.productId },
            data:  { stockQty: { decrement: item.quantity } },
          });
        }

        return newOrder;
      }); // end $transaction

      // ── Transaction committed ─────────────────────────────────────────────
      break; // exit retry loop

    } catch (err) {

      if (isOrderNumberCollision(err)) {
        // Collision on this number — log it and try again (unless exhausted)
        logger.warn(
          { attempt, orderNumber, userId, errCode: err.code },
          '[Order] Order number collision — generating new number'
        );
        lastErr = err;

        if (attempt < MAX_ORDER_RETRIES) continue; // next attempt

        // All retries exhausted — should be astronomically rare
        logger.error({ userId, attempts: MAX_ORDER_RETRIES }, '[Order] CRITICAL: All order number retries exhausted');
        throw createErr('Could not generate a unique order number. Please try again.', 500);
      }

      // Any other error (stock, slot, validation) — propagate immediately
      throw err;
    }
  }

  // Invalidate product cache so stock numbers reflect reality
  try {
    const keys = await cache.keys('products:*');
    if (keys.length) await cache.del(...keys);
  } catch { /* redis failure must not abort a committed order */ }

  logger.info(
    { orderId: order.id, orderNumber: order.orderNumber, userId, total: order.total },
    '[Order] Order created successfully'
  );

  return order;
}

// ─── Get Orders ───────────────────────────────────────────────────────────────

export async function getUserOrdersService(userId, { page = 1, limit = 10 }) {
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where:   { userId, hiddenByUser: false },
      orderBy: { createdAt: 'desc' },
      skip,
      take:    limit,
      include: {
        items:        { include: { product: { select: { name: true, imageUrl: true, unit: true } } } },
        deliverySlot: { select: { date: true, startTime: true, endTime: true } },
      },
    }),
    prisma.order.count({ where: { userId, hiddenByUser: false } }),
  ]);

  return { orders, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getOrderByIdService(orderId, userId) {
  const order = await prisma.order.findFirst({
    where:   { id: orderId, userId },
    include: {
      items:        { include: { product: { select: { name: true, imageUrl: true, unit: true } } } },
      deliverySlot: true,
    },
  });
  if (!order) throw createErr('Order not found', 404);
  return order;
}

// Soft-delete: hides from user's history without destroying records
export async function deleteOrderFromHistoryService(orderId, userId) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) throw createErr('Order not found', 404);
  await prisma.order.update({ where: { id: orderId }, data: { hiddenByUser: true } });
}

// ─── Delivery Tracking ────────────────────────────────────────────────────────

/** Update delivery boy live GPS (called by admin/rider) */
export async function updateDeliveryTrackingService(orderId, lat, lng) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
  if (!order) throw createErr('Order not found', 404);
  return prisma.order.update({
    where: { id: orderId },
    data:  { deliveryLat: lat, deliveryLng: lng, deliveryLocAt: new Date() },
  });
}

/** Get tracking snapshot — public, returns store + delivery boy + customer coords */
export async function getDeliveryTrackingService(orderId) {
  const order = await prisma.order.findUnique({
    where:  { id: orderId },
    select: {
      id: true, orderNumber: true, status: true, fulfillmentType: true,
      deliveryLat: true, deliveryLng: true, deliveryLocAt: true,
      customerLat: true, customerLng: true,
    },
  });
  if (!order) throw createErr('Order not found', 404);

  const storeLat = parseFloat(process.env.STORE_LAT  || '21.2094');
  const storeLng = parseFloat(process.env.STORE_LNG  || '72.8261');

  return {
    orderId:      order.id,
    orderNumber:  order.orderNumber,
    status:       order.status,
    fulfillmentType: order.fulfillmentType,
    store: { lat: storeLat, lng: storeLng, name: 'SuperMart', address: process.env.STORE_ADDRESS || 'Kapodra, Surat' },
    deliveryBoy:  order.deliveryLat
      ? { lat: order.deliveryLat, lng: order.deliveryLng, updatedAt: order.deliveryLocAt }
      : null,
    customer: order.customerLat
      ? { lat: order.customerLat, lng: order.customerLng }
      : null,
  };
}

export async function getAvailableSlotsService(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) throw createErr('Invalid date', 400);

  const start = new Date(date); start.setHours(0,  0,  0,   0);
  const end   = new Date(date); end.setHours(23, 59, 59, 999);

  const slots = await prisma.deliverySlot.findMany({
    where:   { date: { gte: start, lte: end }, isActive: true },
    orderBy: { startTime: 'asc' },
  });

  return slots.filter((s) => s.booked < s.capacity);
}
