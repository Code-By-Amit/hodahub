import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist: (state, action) => {
      const product = action.payload;
      if (!product || !product.id) return;
      const exists = state.items.some((item) => String(item.id) === String(product.id));
      if (!exists) {
        state.items.push(product);
      }
    },
    removeFromWishlist: (state, action) => {
      const productId = action.payload;
      if (!productId) return;
      state.items = state.items.filter((item) => String(item.id) !== String(productId));
    },
    toggleWishlist: (state, action) => {
      const product = action.payload;
      if (!product || !product.id) return;
      const index = state.items.findIndex((item) => String(item.id) === String(product.id));
      if (index >= 0) {
        state.items.splice(index, 1);
      } else {
        state.items.push(product);
      }
    },
    setWishlist: (state, action) => {
      state.items = action.payload || [];
    },
    clearWishlist: (state) => {
      state.items = [];
    },
  },
});

export const {
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  setWishlist,
  clearWishlist,
} = wishlistSlice.actions;

export const selectWishlistItems = (state) => state.wishlist.items;
export const selectWishlistItemCount = (state) => state.wishlist.items.length;
export const selectIsWishlisted = (productId) => (state) =>
  productId ? state.wishlist.items.some((item) => String(item.id) === String(productId)) : false;

export default wishlistSlice.reducer;
