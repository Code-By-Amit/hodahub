import { api } from './client';

export const bannersApi = {
  getAll: (opts) => api.get('/api/banners', opts),

  getAdmin: (opts) => api.get('/api/admin/banners', opts),

  getById: (id, opts) => api.get(`/api/admin/banners/${id}`, opts),

  save: (id, data, opts) =>
    id ? api.put(`/api/admin/banners/${id}`, data, opts) : api.post('/api/admin/banners', data, opts),

  remove: (id, opts) => api.del(`/api/admin/banners/${id}`, opts),
};

export default bannersApi;
