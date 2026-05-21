import adminClient from './adminClient.js';
import client from './client.js';

export const adminApi = {
  // ── Auth ────────────────────────────────────────────────────────────────────
  login: (c) => adminClient.post('/admin/auth/login', c),

  // ── Analytics ───────────────────────────────────────────────────────────────
  getMetrics: () => adminClient.get('/admin/metrics'),

  // ── Products ────────────────────────────────────────────────────────────────
  getProducts:    (p) => adminClient.get('/admin/products', { params: p }),
  createProduct:  (d) => adminClient.post('/admin/products', d),
  updateProduct:  (id, d) => adminClient.put(`/admin/products/${id}`, d),
  deleteProduct:  (id) => adminClient.delete(`/admin/products/${id}`),
  uploadImage:    (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return adminClient.post('/admin/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  // ── Categories ──────────────────────────────────────────────────────────────
  getCategories:       ()       => adminClient.get('/admin/categories'),
  createCategory:      (d)      => adminClient.post('/admin/categories', d),
  updateCategory:      (id, d)  => adminClient.put(`/admin/categories/${id}`, d),
  deleteCategory:      (id)     => adminClient.delete(`/admin/categories/${id}`),
  reorderCategories:   (ids)    => adminClient.patch('/admin/categories/reorder', { ids }),
  previewCategoryAI:   (d)      => adminClient.post('/admin/categories/ai-preview', d),

  // ── Banners ─────────────────────────────────────────────────────────────────
  getBanners:    ()      => adminClient.get('/admin/banners'),
  createBanner:  (d)     => adminClient.post('/admin/banners', d),
  updateBanner:  (id, d) => adminClient.put(`/admin/banners/${id}`, d),
  deleteBanner:  (id)    => adminClient.delete(`/admin/banners/${id}`),

  // ── Sections ─────────────────────────────────────────────────────────────────
  getSections:    ()       => adminClient.get('/admin/sections'),
  updateSection:  (key, d) => adminClient.patch(`/admin/sections/${key}`, d),

  // ── Delivery Slots ───────────────────────────────────────────────────────────
  getSlots:    (p)     => adminClient.get('/admin/slots', { params: p }),
  createSlot:  (d)     => adminClient.post('/admin/slots', d),
  updateSlot:  (id, d) => adminClient.patch(`/admin/slots/${id}`, d),
  deleteSlot:  (id)    => adminClient.delete(`/admin/slots/${id}`),

  // ── Delivery Config ──────────────────────────────────────────────────────────
  getDeliveryConfig:    ()  => adminClient.get('/admin/delivery-config'),
  updateDeliveryConfig: (d) => adminClient.patch('/admin/delivery-config', d),

  // ── Users ────────────────────────────────────────────────────────────────────
  getUsers:      (p)   => adminClient.get('/admin/users', { params: p }),
  toggleUser:    (id)  => adminClient.patch(`/admin/users/${id}/toggle`),
  getUserOrders: (id, p) => adminClient.get(`/admin/users/${id}/orders`, { params: p }),

  // ── Orders (dashboard routes with admin token) ───────────────────────────────
  getOrders:         (p)       => adminClient.get('/dashboard/orders', { params: p }),
  updateOrderStatus: (id, s)   => adminClient.patch(`/dashboard/orders/${id}/status`, { status: s }),
};

// Public APIs read by customer frontend
export const publicApi = {
  getBanners:        () => client.get('/products/banners'),
  getSections:       () => client.get('/products/sections'),
  getDeliveryConfig: () => client.get('/products/delivery-config'),
  getLabeledProducts:(label, limit) => client.get('/products/labeled', { params: { label, limit } }),
};
