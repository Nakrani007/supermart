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

// Stores
adminRouter.get   ('/stores',          ctrl.getStores);
adminRouter.post  ('/stores',          ctrl.createStore);
adminRouter.put   ('/stores/:id',      ctrl.updateStore);
adminRouter.delete('/stores/:id',      ctrl.deleteStore);
adminRouter.patch ('/stores/:id/main', ctrl.setMainStore);

// Delivery Config
adminRouter.get  ('/delivery-config', ctrl.getDeliveryConfig);
adminRouter.patch('/delivery-config', ctrl.updateDeliveryConfig);

// Delivery Zone (radius + pincode whitelist)
adminRouter.get  ('/delivery-zone', ctrl.getDeliveryZone);
adminRouter.patch('/delivery-zone', ctrl.updateDeliveryZone);

// Users
adminRouter.get  ('/users',                 ctrl.getUsers);
adminRouter.patch('/users/:id/toggle',      ctrl.toggleUser);
adminRouter.get  ('/users/:id/orders',      ctrl.getUserOrders);

// Store Inventory (per-store product stock management)
adminRouter.get('/inventory',            ctrl.getStoreInventory);   // ?storeId=X
adminRouter.put('/inventory/:productId', ctrl.upsertStoreProduct);  // { storeId, stockQty, isActive }

// Image Upload
adminRouter.post('/upload/image', upload.single('image'), ctrl.uploadImage);

// AI Image Proxy — fetch Pollinations server-side to avoid browser CORS
adminRouter.get('/proxy-image', ctrl.proxyImage);
