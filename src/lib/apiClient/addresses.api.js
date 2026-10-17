import { api } from './client';

export const addressesApi = {
  getAll: (opts) => api.get('/api/addresses', opts),

  create: (data, opts) => api.post('/api/addresses', data, opts),
};

export default addressesApi;
