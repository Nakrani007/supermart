import * as orderService from './order.service.js';

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
