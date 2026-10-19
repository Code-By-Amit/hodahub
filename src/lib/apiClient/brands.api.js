import { api, toQueryString } from './client';

export const brandsApi = {
  getAll: (params, opts) => {
    const qs = toQueryString(params);
    return api.get(`/api/brands${qs ? `?${qs}` : ''}`, opts);
  },

  getBySlug: (slug, params, opts) => {
    const isParamsQuery =
      params &&
      typeof params === 'object' &&
      !('headers' in params) &&
      !('signal' in params) &&
      !('next' in params) &&
      !('cache' in params);
    const query = isParamsQuery ? params : undefined;
    const options = isParamsQuery ? opts : params;
    const qs = toQueryString(query);
    return api.get(`/api/brands/${slug}${qs ? `?${qs}` : ''}`, options);
  },

  getAdmin: (opts) => api.get('/api/admin/brands', opts),

  getById: (id, opts) => api.get(`/api/admin/brands/${id}`, opts),

  save: (id, data, opts) =>
    id ? api.put(`/api/admin/brands/${id}`, data, opts) : api.post('/api/admin/brands', data, opts),

  remove: (id, opts) => api.del(`/api/admin/brands/${id}`, opts),
};

export default brandsApi;
