import client from './client.js';

export const ordersApi = {
  create:            (data)         => client.post('/orders/create', data),
  getMyOrders:       (params)       => client.get('/orders/my', { params }),
  getById:           (id)           => client.get(`/orders/${id}`),
  getSlots:          (date)         => client.get('/orders/slots', { params: { date } }),
  deleteFromHistory: (id)           => client.delete(`/orders/${id}/history`),

  // Delivery tracking — public, no auth required
  getTracking:       (id)           => client.get(`/orders/${id}/tracking`),

  // Admin
  getDashboard:      ()             => client.get('/dashboard/metrics'),
  adminGetOrders:    (params)       => client.get('/dashboard/orders', { params }),
  adminUpdateStatus: (id, status)   => client.patch(`/dashboard/orders/${id}/status`, { status }),
};
