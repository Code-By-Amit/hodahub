import { api } from './client';

export const wishlistApi = {
  getAll: (opts) => api.get('/api/wishlist', opts),

  add: (productIdOrIds, opts) =>
    api.post(
      '/api/wishlist',
      Array.isArray(productIdOrIds) ? { productIds: productIdOrIds } : { productId: productIdOrIds },
      opts
    ),

  remove: (productId, opts) => api.del(`/api/wishlist/${productId}`, opts),
};

export default wishlistApi;
