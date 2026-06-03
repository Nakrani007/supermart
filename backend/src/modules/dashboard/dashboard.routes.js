import { Router } from 'express';
import { requireAdmin } from '../../middleware/adminAuth.js';
import * as ctrl from './dashboard.controller.js';

export const dashboardRouter = Router();

// All dashboard routes require a valid ADMIN token
dashboardRouter.use(requireAdmin);

// GET  /api/v1/dashboard/metrics
dashboardRouter.get('/metrics', ctrl.getMetrics);

// GET  /api/v1/dashboard/orders?page=1&limit=20&status=PENDING&search=
dashboardRouter.get('/orders', ctrl.getAllOrders);

// PATCH /api/v1/dashboard/orders/:id/status
dashboardRouter.patch('/orders/:id/status', ctrl.updateOrderStatus);

// PUT /api/v1/dashboard/orders/:id/tracking  — update delivery boy live GPS
dashboardRouter.put('/orders/:id/tracking', ctrl.updateDeliveryTracking);
