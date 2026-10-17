import { api, toQueryString } from './client';

export const categoriesApi = {
  getAll: (opts) => api.get('/api/categories', opts),

  getBySlug: (slug, opts) => api.get(`/api/categories/${slug}`, opts),

  getAdmin: (params, opts) => {
    const qs = toQueryString(params);
    return api.get(`/api/admin/categories${qs ? `?${qs}` : ''}`, opts);
  },

  getByIds: (ids, opts) => api.get(`/api/admin/categories/by-ids?ids=${ids.join(',')}`, opts),

  getDescendants: (id, opts) => api.get(`/api/admin/categories/${id}/descendants`, opts),

  save: (id, data, opts) =>
    id
      ? api.put(`/api/admin/categories/${id}`, data, opts)
      : api.post('/api/admin/categories', data, opts),

  remove: (id, opts) => api.del(`/api/admin/categories/${id}`, opts),
};

export default categoriesApi;
