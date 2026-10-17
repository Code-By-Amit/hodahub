import { api } from './client';

export const uploadApi = {
  getSignature: (data, opts) => api.post('/api/upload/signature', data, opts),
};

export default uploadApi;
