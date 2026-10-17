import { api } from './client';

export const authApi = {
  me: (opts) => api.get('/api/auth/me', opts),

  login: (data, opts) => api.post('/api/auth/login', data, opts),

  logout: (opts) => api.post('/api/auth/logout', {}, opts),

  signup: (data, opts) => api.post('/api/auth/signup', data, opts),

  refresh: (opts) => api.post('/api/auth/refresh', {}, opts),

  verifyOtp: (data, opts) => api.post('/api/auth/verify-otp', data, opts),

  resendOtp: (data, opts) => api.post('/api/auth/resend-otp', data, opts),

  forgotPassword: (data, opts) => api.post('/api/auth/forgot-password', data, opts),

  resetPassword: (data, opts) => api.post('/api/auth/reset-password', data, opts),

  sendPhoneOtp: (data, opts) => api.post('/api/auth/phone/send-otp', data, opts),

  verifyPhoneOtp: (data, opts) => api.post('/api/auth/phone/verify-otp', data, opts),

  getPhoneWidgetToken: (opts) => api.get('/api/auth/phone/widget-token', opts),

  verifyMsg91Otp: (data, opts) => api.post('/api/auth/msg91/verify', data, opts),
};

export default authApi;
