import { api } from './client';

export const profileApi = {
  get: (opts) => api.get('/api/profile', opts),

  update: (data, opts) => api.put('/api/profile', data, opts),

  changePassword: (data, opts) => api.put('/api/profile/password', data, opts),

  sendPhoneOtp: (data, opts) => api.post('/api/user/phone/send-otp', data, opts),

  verifyPhoneOtp: (data, opts) => api.post('/api/user/phone/verify-otp', data, opts),
};

export default profileApi;
