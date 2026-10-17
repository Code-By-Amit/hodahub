import { api, toQueryString } from './client';

export const reviewsApi = {
  getAdmin: (params, opts) => {
    const qs = toQueryString(params);
    return api.get(`/api/admin/reviews${qs ? `?${qs}` : ''}`, opts);
  },

  getById: (id, opts) => api.get(`/api/admin/reviews/${id}`, opts),

  save: (id, data, opts) =>
    id ? api.put(`/api/admin/reviews/${id}`, data, opts) : api.post('/api/admin/reviews', data, opts),

  toggleVisibility: (id, opts) => api.patch(`/api/admin/reviews/${id}`, {}, opts),

  remove: (id, opts) => api.del(`/api/admin/reviews/${id}`, opts),
};

export default reviewsApi;
