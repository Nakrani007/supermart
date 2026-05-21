import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { orderRateLimiter } from '../../middleware/rateLimiter.js';
import { CreateOrderSchema } from './order.schema.js';
import * as ctrl from './order.controller.js';

export const orderRouter = Router();

// Public — guests need to see slots before deciding to login
orderRouter.get('/slots', ctrl.getDeliverySlots);

// Everything below requires a valid JWT
orderRouter.use(requireAuth);

// POST /api/v1/orders/create
orderRouter.post('/create', orderRateLimiter, validate(CreateOrderSchema), ctrl.createOrder);

// GET /api/v1/orders/my
orderRouter.get('/my', ctrl.getMyOrders);

// GET /api/v1/orders/:id
orderRouter.get('/:id', ctrl.getOrder);

// DELETE /api/v1/orders/:id/history  (soft-delete from user's view)
orderRouter.delete('/:id/history', ctrl.deleteOrderFromHistory);
