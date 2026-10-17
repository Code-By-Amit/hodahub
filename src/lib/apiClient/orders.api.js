import { api, toQueryString } from './client';

export const ordersApi = {
  // Customer endpoints
  getAll: (opts) => api.get('/api/orders', opts),

  getById: (id, params, opts) => {
    const qs = toQueryString(params);
    return api.get(`/api/orders/${id}${qs ? `?${qs}` : ''}`, opts);
  },

  create: (data, opts) => api.post('/api/orders', data, opts),

  cancel: (id, data, opts) => api.post(`/api/orders/${id}/cancel`, data, opts),

  returnOrder: (id, data, opts) => api.post(`/api/orders/${id}/return`, data, opts),

  getTracking: (id, params, opts) => {
    const qs = toQueryString(params);
    return api.get(`/api/orders/${id}/tracking${qs ? `?${qs}` : ''}`, opts);
  },

  // Admin endpoints
  getAdmin: (params, opts) => {
    const qs = toQueryString(params);
    return api.get(`/api/admin/orders${qs ? `?${qs}` : ''}`, opts);
  },

  getAdminById: (id, opts) => api.get(`/api/admin/orders/${id}`, opts),

  takeAction: (id, data, opts) => api.post(`/api/admin/orders/${id}/action`, data, opts),

  pack: (id, data, opts) => api.post(`/api/admin/orders/${id}/pack`, data, opts),

  createShipment: (id, data, opts) => api.post(`/api/admin/orders/${id}/shipment`, data, opts),

  manualAwb: (id, data, opts) => api.post(`/api/admin/orders/${id}/manual-awb`, data, opts),

  testShipment: (id, opts) => api.post(`/api/admin/orders/${id}/test-shipment`, {}, opts),
};

export default ordersApi;
