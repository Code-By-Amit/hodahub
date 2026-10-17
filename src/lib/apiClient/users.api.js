import { api, toQueryString } from './client';

export const usersApi = {
  getAdmin: (params, opts) => {
    const qs = toQueryString(params);
    return api.get(`/api/admin/users${qs ? `?${qs}` : ''}`, opts);
  },

  updateRole: (data, opts) => api.patch('/api/admin/users', data, opts),

  createAdmin: (data, opts) => api.post('/api/admin/users', data, opts),
};

export default usersApi;
