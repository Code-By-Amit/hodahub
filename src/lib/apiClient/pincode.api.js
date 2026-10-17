import { api } from './client';

export const pincodeApi = {
  check: (pincode, opts) => api.get(`/api/pincode/check?pincode=${encodeURIComponent(pincode)}`, opts),
};

export default pincodeApi;
