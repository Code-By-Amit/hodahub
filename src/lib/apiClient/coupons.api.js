import { api, toQueryString } from './client';

export const couponsApi = {
  validate: (data, opts) => api.post('/api/coupons/validate', data, opts),

  getAdmin: (params, opts) => {
    const qs = toQueryString(params);
    return api.get(`/api/admin/coupons${qs ? `?${qs}` : ''}`, opts);
  },

  getById: (id, opts) => api.get(`/api/admin/coupons/${id}`, opts),

  save: (id, data, opts) =>
    id ? api.put(`/api/admin/coupons/${id}`, data, opts) : api.post('/api/admin/coupons', data, opts),

  remove: (id, opts) => api.del(`/api/admin/coupons/${id}`, opts),
};

export default couponsApi;
