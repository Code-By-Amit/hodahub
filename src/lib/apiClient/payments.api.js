import { api } from './client';
import { guestOrderQuery } from './guest-order-query';

export const paymentsApi = {
  createOrder: (data, opts) => api.post('/api/payment/create-order', data, opts),

  verify: (data, opts) => api.post('/api/payment/verify', data, opts),

  retry: (orderId, opts) => api.post(`/api/payment/retry/${orderId}${guestOrderQuery()}`, {}, opts),
};

export default paymentsApi;
