import { api, toQueryString } from './client';

export const brandsApi = {
  getAll: (params, opts) => {
    const qs = toQueryString(params);
    return api.get(`/api/brands${qs ? `?${qs}` : ''}`, opts);
  },

  getBySlug: (slug, opts) => api.get(`/api/brands/${slug}`, opts),

  getAdmin: (opts) => api.get('/api/admin/brands', opts),

  getById: (id, opts) => api.get(`/api/admin/brands/${id}`, opts),

  save: (id, data, opts) =>
    id ? api.put(`/api/admin/brands/${id}`, data, opts) : api.post('/api/admin/brands', data, opts),

  remove: (id, opts) => api.del(`/api/admin/brands/${id}`, opts),
};

export default brandsApi;
