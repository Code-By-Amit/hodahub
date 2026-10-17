import { api, toQueryString } from './client';

export const addonsApi = {
  getAdmin: (params, opts) => {
    const qs = toQueryString(params);
    return api.get(`/api/admin/addons${qs ? `?${qs}` : ''}`, opts);
  },

  getById: (id, opts) => api.get(`/api/admin/addons/${id}`, opts),

  save: (id, data, opts) =>
    id ? api.put(`/api/admin/addons/${id}`, data, opts) : api.post('/api/admin/addons', data, opts),

  remove: (id, opts) => api.del(`/api/admin/addons/${id}`, opts),
};

export default addonsApi;
