import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  coupon: null, // { code, type, value, discount }
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action) => {
      const { productId, name, slug, image, price, discountPrice, codAvailable, quantity = 1 } = action.payload;
      const existing = state.items.find((item) => item.productId === productId);

      if (existing) {
        existing.quantity += quantity;
        if (codAvailable !== undefined) existing.codAvailable = codAvailable !== false;
      } else {
        state.items.push({
          productId,
          name,
          slug,
          image,
          price: Number(price),
          discountPrice: discountPrice ? Number(discountPrice) : null,
          codAvailable: codAvailable !== false,
          quantity,
        });
      }
    },
    removeItem: (state, action) => {
      state.items = state.items.filter((item) => item.productId !== action.payload);
    },
    updateQuantity: (state, action) => {
      const { productId, quantity } = action.payload;
      const item = state.items.find((item) => item.productId === productId);
      if (item) {
        item.quantity = Math.max(1, quantity);
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.coupon = null;
    },
    applyCoupon: (state, action) => {
      state.coupon = action.payload;
    },
    removeCoupon: (state) => {
      state.coupon = null;
    },
  },
});

export const { addItem, removeItem, updateQuantity, clearCart, applyCoupon, removeCoupon } =
  cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;
export const selectCartItemCount = (state) =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
export const selectCartSubtotal = (state) =>
  state.cart.items.reduce(
    (sum, item) => sum + (item.discountPrice || item.price) * item.quantity,
    0
  );
export const selectCartCoupon = (state) => state.cart.coupon;

export default cartSlice.reducer;
