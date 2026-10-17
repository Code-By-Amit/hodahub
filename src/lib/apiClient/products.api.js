import { api, toQueryString } from './client';

export const productsApi = {
  getAll: (params, opts) => {
    const qs = toQueryString(params);
    return api.get(`/api/products${qs ? `?${qs}` : ''}`, opts);
  },

  getBySlug: (slug, opts) => api.get(`/api/products/${slug}`, opts),

  checkAvailability: (data, opts) => api.post('/api/products/check-availability', data, opts),

  getAdmin: (params, opts) => {
    const qs = toQueryString(params);
    return api.get(`/api/admin/products${qs ? `?${qs}` : ''}`, opts);
  },

  getAdminById: (id, opts) => api.get(`/api/admin/products/${id}`, opts),

  save: (id, data, opts) =>
    id
      ? api.put(`/api/admin/products/${id}`, data, opts)
      : api.post('/api/admin/products', data, opts),

  toggleStatus: (id, patch, opts) =>
    api.patch(
      `/api/admin/products/${id}/status`,
      typeof patch === 'object' && patch !== null ? patch : { isActive: patch },
      opts
    ),

  remove: (id, opts) => api.del(`/api/admin/products/${id}`, opts),

  getReviews: (slug, params, opts) => {
    const qs = toQueryString(params);
    return api.get(`/api/products/${slug}/reviews${qs ? `?${qs}` : ''}`, opts);
  },

  createReview: (slug, data, opts) => api.post(`/api/products/${slug}/reviews`, data, opts),

  updateReview: (slug, reviewId, data, opts) =>
    api.put(`/api/products/${slug}/reviews/${reviewId}`, data, opts),

  deleteReview: (slug, reviewId, opts) =>
    api.del(`/api/products/${slug}/reviews/${reviewId}`, opts),
};

export default productsApi;
