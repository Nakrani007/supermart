import * as dashboardService from './dashboard.service.js';
import * as orderService     from '../orders/order.service.js';

export async function getMetrics(req, res, next) {
  try {
    const metrics = await dashboardService.getDashboardMetrics();
    res.json({ success: true, metrics });
  } catch (err) {
    next(err);
  }
}

export async function getAllOrders(req, res, next) {
  try {
    const { page = '1', limit = '20', status, search, storeId } = req.query;
    const result = await dashboardService.getAllOrdersService({
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      status: status || null,
      search: search || null,
      storeId: storeId || null,
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await dashboardService.updateOrderStatusService(id, status);
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/dashboard/orders/:id/tracking
export async function updateDeliveryTracking(req, res, next) {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }
    await orderService.updateDeliveryTrackingService(req.params.id, parseFloat(lat), parseFloat(lng));
    res.json({ success: true });
  } catch (err) { next(err); }
}
