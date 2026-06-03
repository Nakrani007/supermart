import * as orderService from './order.service.js';
import { haversineKm } from '../../utils/haversine.js';

export async function createOrder(req, res, next) {
  try {
    const order = await orderService.createOrderService(req.user.id, req.body);
    res.status(201).json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const { page = '1', limit = '10' } = req.query;
    const result = await orderService.getUserOrdersService(req.user.id, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 50), // cap to prevent huge payloads
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req, res, next) {
  try {
    const order = await orderService.getOrderByIdService(req.params.id, req.user.id);
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

export async function deleteOrderFromHistory(req, res, next) {
  try {
    await orderService.deleteOrderFromHistoryService(req.params.id, req.user.id);
    res.json({ success: true, message: 'Removed from history' });
  } catch (err) { next(err); }
}

export async function getDeliverySlots(req, res, next) {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const slots = await orderService.getAvailableSlotsService(date);
    res.json({ success: true, slots });
  } catch (err) {
    next(err);
  }
}

// GET  /api/v1/orders/:id/tracking  — public, no auth needed
export async function getDeliveryTracking(req, res, next) {
  try {
    const data = await orderService.getDeliveryTrackingService(req.params.id);
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
}

// GET /api/v1/orders/delivery-zone?lat=XX&lng=YY
// Public — returns store location, radius, and optionally whether a coordinate is in range.
export async function getDeliveryZone(req, res) {
  const storeLat   = parseFloat(process.env.STORE_LAT          || '21.2094');
  const storeLng   = parseFloat(process.env.STORE_LNG          || '72.8261');
  const radiusKm   = parseFloat(process.env.DELIVERY_RADIUS_KM || '4');
  const storeAddress = process.env.STORE_ADDRESS || 'Kapodra, Surat, Gujarat';

  const payload = { storeLat, storeLng, radiusKm, storeAddress };

  const { lat, lng } = req.query;
  if (lat && lng) {
    const distanceKm = haversineKm(parseFloat(lat), parseFloat(lng), storeLat, storeLng);
    payload.distanceKm = parseFloat(distanceKm.toFixed(2));
    payload.eligible   = distanceKm <= radiusKm;
  }

  res.json({ success: true, ...payload });
}
