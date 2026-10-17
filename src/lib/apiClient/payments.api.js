import { api } from './client';

export const paymentsApi = {
  createOrder: (data, opts) => api.post('/api/payment/create-order', data, opts),

  verify: (data, opts) => api.post('/api/payment/verify', data, opts),

  retry: (orderId, opts) => api.post(`/api/payment/retry/${orderId}`, {}, opts),
};

export default paymentsApi;
