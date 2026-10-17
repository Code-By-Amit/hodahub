import { api } from './client';

export const settingsApi = {
  getPublic: (opts) => api.get('/api/settings', opts),

  getAdmin: (opts) => api.get('/api/admin/settings', opts),

  updateAdmin: (data, opts) => api.put('/api/admin/settings', data, opts),

  getStats: (opts) => api.get('/api/admin/stats', opts),

  getAnalytics: (opts) => api.get('/api/admin/analytics', opts),
};

export default settingsApi;
