import { api } from './client';

export const analyticsApi = {
  track: (data, opts) => api.post('/api/analytics/track', data, opts),
};

export default analyticsApi;
