import { api } from './client';

export const happyCustomersApi = {
  getAll: (opts) => api.get('/api/happy-customers', opts),

  getAdmin: (opts) => api.get('/api/admin/happy-customers', opts),

  save: (id, data, opts) =>
    id
      ? api.put(`/api/admin/happy-customers/${id}`, data, opts)
      : api.post('/api/admin/happy-customers', data, opts),

  toggleActive: (id, isActive, opts) =>
    api.put(`/api/admin/happy-customers/${id}`, { isActive }, opts),

  updateOrder: (id, sortOrder, opts) =>
    api.put(`/api/admin/happy-customers/${id}`, { sortOrder }, opts),

  remove: (id, opts) => api.del(`/api/admin/happy-customers/${id}`, opts),
};

export default happyCustomersApi;
