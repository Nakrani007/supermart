import { Router } from 'express';
import { requireAdmin } from '../../middleware/adminAuth.js';
import { upload } from '../../utils/upload.js';
import * as ctrl from './admin.controller.js';

export const adminRouter = Router();

// ── Public ────────────────────────────────────────────────────────────────────
adminRouter.post('/auth/login', ctrl.login);

// ── All routes below require admin token ─────────────────────────────────────
adminRouter.use(requireAdmin);

// Analytics
adminRouter.get('/metrics', ctrl.getMetrics);

// Products
adminRouter.get   ('/products',     ctrl.getProducts);
adminRouter.post  ('/products',     ctrl.createProduct);
adminRouter.put   ('/products/:id', ctrl.updateProduct);
adminRouter.delete('/products/:id', ctrl.deleteProduct);

// Categories
adminRouter.get   ('/categories',            ctrl.getCategories);
adminRouter.post  ('/categories/ai-preview', ctrl.previewCategoryAI);  // must be before /:id
adminRouter.post  ('/categories',            ctrl.createCategory);
adminRouter.put   ('/categories/:id',        ctrl.updateCategory);
adminRouter.delete('/categories/:id',        ctrl.deleteCategory);
adminRouter.patch ('/categories/reorder',    ctrl.reorderCategories);

// Banners
adminRouter.get   ('/banners',     ctrl.getBanners);
adminRouter.post  ('/banners',     ctrl.createBanner);
adminRouter.put   ('/banners/:id', ctrl.updateBanner);
adminRouter.delete('/banners/:id', ctrl.deleteBanner);

// Home Sections
adminRouter.get  ('/sections',          ctrl.getSections);
adminRouter.patch('/sections/:key',     ctrl.updateSection);

// Delivery Slots
adminRouter.get   ('/slots',     ctrl.getSlots);
adminRouter.post  ('/slots',     ctrl.createSlot);
adminRouter.patch ('/slots/:id', ctrl.updateSlot);
adminRouter.delete('/slots/:id', ctrl.deleteSlot);

// Delivery Config
adminRouter.get  ('/delivery-config', ctrl.getDeliveryConfig);
adminRouter.patch('/delivery-config', ctrl.updateDeliveryConfig);

// Users
adminRouter.get  ('/users',                 ctrl.getUsers);
adminRouter.patch('/users/:id/toggle',      ctrl.toggleUser);
adminRouter.get  ('/users/:id/orders',      ctrl.getUserOrders);

// Image Upload
adminRouter.post('/upload/image', upload.single('image'), ctrl.uploadImage);
