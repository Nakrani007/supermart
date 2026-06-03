import client from './client.js';

export const productsApi = {
  getAll:             (params)               => client.get('/products', { params }),
  getCategories:      ()                     => client.get('/products/categories'),
  getById:            (id, storeId)          => client.get(`/products/${id}`, { params: { ...(storeId && { storeId }) } }),
  getTopDeals:        (storeId)              => client.get('/products/deals', { params: { ...(storeId && { storeId }) } }),
  getDailyEssentials: (storeId)             => client.get('/products/essentials', { params: { ...(storeId && { storeId }) } }),
  getRelated:         (id, storeId)          => client.get(`/products/${id}/related`, { params: { ...(storeId && { storeId }) } }),
  // Admin-controlled public endpoints
  getLabeledProducts: (label, limit, storeId) => client.get('/products/labeled', { params: { label, limit, ...(storeId && { storeId }) } }),
  getBanners:         ()                     => client.get('/products/banners'),
  getSections:        ()                     => client.get('/products/sections'),
  getDeliveryConfig:  ()                     => client.get('/products/delivery-config'),
  // Store + cart validation
  validateCart: (storeId, items)             => client.post('/products/validate-cart', { storeId, items }),
};
