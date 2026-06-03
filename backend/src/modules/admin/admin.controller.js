import path from 'path';
import * as svc from './admin.service.js';
import { generateCategoryContent } from '../../utils/aiGenerate.js';
import { saveFile } from '../../utils/upload.js';

const ok = (res, data) => res.json({ success: true, ...data });
const wrap = (fn) => async (req, res, next) => { try { await fn(req, res); } catch (err) { next(err); } };

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const login = wrap(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required' });
  const result = await svc.adminLoginService(username, password);
  ok(res, result);
});

// ─── Metrics ──────────────────────────────────────────────────────────────────

export const getMetrics = wrap(async (req, res) => {
  const { storeId } = req.query;
  const metrics = await svc.getAdminMetrics(storeId || null);
  ok(res, { metrics });
});

// ─── Products ─────────────────────────────────────────────────────────────────

export const getProducts = wrap(async (req, res) => {
  const { page = '1', limit = '20', search, category, label, status, storeId } = req.query;
  const result = await svc.getAdminProductsService({ page: +page, limit: Math.min(+limit, 100), search, categorySlug: category, label, status, storeId: storeId || null });
  ok(res, result);
});

export const createProduct = wrap(async (req, res) => {
  const product = await svc.createProductService(req.body);
  res.status(201).json({ success: true, product });
});

export const updateProduct = wrap(async (req, res) => {
  const storeId = req.body.storeId || req.query.storeId || null;
  const product = await svc.updateProductService(req.params.id, req.body, storeId);
  ok(res, { product });
});

export const deleteProduct = wrap(async (req, res) => {
  const result = await svc.deleteProductService(req.params.id);
  ok(res, result);
});

// ─── Categories ───────────────────────────────────────────────────────────────

export const getCategories = wrap(async (req, res) => {
  const categories = await svc.getAdminCategoriesService();
  ok(res, { categories });
});

export const createCategory = wrap(async (req, res) => {
  const category = await svc.createCategoryService(req.body);
  res.status(201).json({ success: true, category });
});

export const updateCategory = wrap(async (req, res) => {
  const category = await svc.updateCategoryService(req.params.id, req.body);
  ok(res, { category });
});

export const deleteCategory = wrap(async (req, res) => {
  await svc.deleteCategoryService(req.params.id);
  ok(res, { message: 'Category deleted' });
});

export const reorderCategories = wrap(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ success: false, message: 'ids must be an array' });
  await svc.reorderCategoriesService(ids);
  ok(res, { message: 'Order updated' });
});

// POST /api/v1/admin/categories/ai-preview
// Returns AI-generated content for a given name + slug WITHOUT saving.
export const previewCategoryAI = wrap(async (req, res) => {
  const { name, slug } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'name is required' });
  const content = generateCategoryContent(name, slug);
  ok(res, { content });
});

// ─── Banners ──────────────────────────────────────────────────────────────────

export const getBanners = wrap(async (req, res) => {
  const banners = await svc.getBannersService();
  ok(res, { banners });
});

export const createBanner = wrap(async (req, res) => {
  const banner = await svc.createBannerService(req.body);
  res.status(201).json({ success: true, banner });
});

export const updateBanner = wrap(async (req, res) => {
  const banner = await svc.updateBannerService(req.params.id, req.body);
  ok(res, { banner });
});

export const deleteBanner = wrap(async (req, res) => {
  await svc.deleteBannerService(req.params.id);
  ok(res, { message: 'Banner deleted' });
});

// ─── Home Sections ────────────────────────────────────────────────────────────

export const getSections = wrap(async (req, res) => {
  const sections = await svc.getHomeSectionsService();
  ok(res, { sections });
});

export const updateSection = wrap(async (req, res) => {
  const section = await svc.updateHomeSectionService(req.params.key, req.body);
  ok(res, { section });
});

// ─── Delivery Slots ───────────────────────────────────────────────────────────

export const getSlots = wrap(async (req, res) => {
  const { from, to } = req.query;
  const slots = await svc.getAdminSlotsService({ from, to });
  ok(res, { slots });
});

export const createSlot = wrap(async (req, res) => {
  const slot = await svc.createSlotService(req.body);
  res.status(201).json({ success: true, slot });
});

export const updateSlot = wrap(async (req, res) => {
  const slot = await svc.updateSlotService(req.params.id, req.body);
  ok(res, { slot });
});

export const deleteSlot = wrap(async (req, res) => {
  await svc.deleteSlotService(req.params.id);
  ok(res, { message: 'Slot deleted' });
});

// ─── Delivery Config ──────────────────────────────────────────────────────────

export const getDeliveryConfig = wrap(async (req, res) => {
  const config = await svc.getDeliveryConfigService();
  ok(res, { config });
});

export const updateDeliveryConfig = wrap(async (req, res) => {
  const config = await svc.updateDeliveryConfigService(req.body);
  ok(res, { config });
});

// ─── Stores ───────────────────────────────────────────────────────────────────

export const getStores = wrap(async (req, res) => {
  const stores = await svc.getStoresService();
  ok(res, { stores });
});

export const createStore = wrap(async (req, res) => {
  const store = await svc.createStoreService(req.body);
  res.status(201).json({ success: true, store });
});

export const updateStore = wrap(async (req, res) => {
  const store = await svc.updateStoreService(req.params.id, req.body);
  ok(res, { store });
});

export const deleteStore = wrap(async (req, res) => {
  await svc.deleteStoreService(req.params.id);
  ok(res, { message: 'Store deleted' });
});

export const setMainStore = wrap(async (req, res) => {
  const store = await svc.setMainStoreService(req.params.id);
  ok(res, { store });
});

// ─── Delivery Zone ────────────────────────────────────────────────────────────

export const getDeliveryZone = wrap(async (req, res) => {
  const zone = await svc.getDeliveryZoneService();
  ok(res, { zone });
});

export const updateDeliveryZone = wrap(async (req, res) => {
  const zone = await svc.updateDeliveryZoneService(req.body);
  ok(res, { zone });
});

// ─── Users ────────────────────────────────────────────────────────────────────

export const getUsers = wrap(async (req, res) => {
  const { page = '1', limit = '20', search } = req.query;
  const result = await svc.getUsersService({ page: +page, limit: Math.min(+limit, 100), search: search || null });
  ok(res, result);
});

export const toggleUser = wrap(async (req, res) => {
  const result = await svc.toggleUserService(req.params.id);
  ok(res, result);
});

export const getUserOrders = wrap(async (req, res) => {
  const { page = '1', limit = '10' } = req.query;
  const result = await svc.getUserOrdersService(req.params.id, { page: +page, limit: +limit });
  ok(res, result);
});

// ─── Image Upload ─────────────────────────────────────────────────────────────

export const uploadImage = wrap(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided' });

  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const imageUrl = await saveFile(req.file, baseUrl);

  ok(res, { imageUrl, filename: req.file.originalname, size: req.file.size });
});

// ─── AI Image Proxy ───────────────────────────────────────────────────────────
// Fetches Pollinations.ai server-side so the browser never hits a CORS wall.

export const proxyImage = wrap(async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, message: 'url query param required' });

  let parsed;
  try { parsed = new URL(url); } catch {
    return res.status(400).json({ success: false, message: 'Invalid URL' });
  }
  if (!parsed.hostname.endsWith('pollinations.ai')) {
    return res.status(403).json({ success: false, message: 'Only pollinations.ai URLs are allowed' });
  }

  const upstream = await fetch(url);
  if (!upstream.ok) return res.status(502).json({ success: false, message: 'Upstream image fetch failed' });

  const contentType = upstream.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await upstream.arrayBuffer());

  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.send(buffer);
});

// ─── Store Inventory ──────────────────────────────────────────────────────────

export const getStoreInventory = wrap(async (req, res) => {
  const { storeId, page = '1', limit = '30', search, category } = req.query;
  if (!storeId) return res.status(400).json({ success: false, message: 'storeId query param required' });
  const result = await svc.getStoreInventoryService(storeId, {
    page: +page, limit: Math.min(+limit, 100), search, categorySlug: category,
  });
  ok(res, result);
});

export const upsertStoreProduct = wrap(async (req, res) => {
  const { productId } = req.params;
  const { storeId, stockQty, isActive } = req.body;
  if (!storeId) return res.status(400).json({ success: false, message: 'storeId is required' });
  const sp = await svc.upsertStoreProductService(storeId, productId, { stockQty, isActive });
  ok(res, { storeProduct: sp });
});
