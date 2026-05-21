import client from './client.js';

export const productsApi = {
  getAll:             (params)        => client.get('/products', { params }),
  getCategories:      ()              => client.get('/products/categories'),
  getById:            (id)            => client.get(`/products/${id}`),
  getTopDeals:        ()              => client.get('/products/deals'),
  getDailyEssentials: ()              => client.get('/products/essentials'),
  getRelated:         (id)            => client.get(`/products/${id}/related`),
  // Admin-controlled public endpoints
  getLabeledProducts: (label, limit)  => client.get('/products/labeled', { params: { label, limit } }),
  getBanners:         ()              => client.get('/products/banners'),
  getSections:        ()              => client.get('/products/sections'),
  getDeliveryConfig:  ()              => client.get('/products/delivery-config'),
};
