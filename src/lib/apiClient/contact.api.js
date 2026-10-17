import { api } from './client';

export const contactApi = {
  submit: (data, opts) => api.post('/api/contact', data, opts),
};

export default contactApi;
