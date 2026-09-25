import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  coupon: null, // { code, type, value, discount }
};

const generateItemKey = (productId) => String(productId);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action) => {
      const {
        productId,
        name,
        slug,
        image,
        price,
        discountPrice,
        codAvailable,
        quantity = 1,
        selectedAddon = null,
      } = action.payload;

      const itemKey = generateItemKey(productId);
      const existing = state.items.find((item) => item.itemKey === itemKey || item.productId === productId);

      const normalizedAddon = selectedAddon
        ? {
            ...selectedAddon,
            quantity: Math.max(1, Math.min(selectedAddon.quantity || 1, quantity)),
          }
        : null;

      if (existing) {
        existing.quantity += quantity;
        if (codAvailable !== undefined) existing.codAvailable = codAvailable !== false;
        if (normalizedAddon) {
          existing.selectedAddon = normalizedAddon;
        }
      } else {
        state.items.push({
          itemKey,
          productId,
          name,
          slug,
          image,
          price: Number(price),
          discountPrice: discountPrice ? Number(discountPrice) : null,
          codAvailable: codAvailable !== false,
          quantity,
          selectedAddon: normalizedAddon,
        });
      }
    },
    removeItem: (state, action) => {
      const target = action.payload; // itemKey or productId
      state.items = state.items.filter(
        (item) => item.itemKey !== target && item.productId !== target
      );
    },
    updateQuantity: (state, action) => {
      const { itemKey, quantity } = action.payload;
      const item = state.items.find((i) => i.itemKey === itemKey || i.productId === action.payload.productId);
      if (item) {
        const newQty = Math.max(1, quantity);
        item.quantity = newQty;

        // Downward clamp: if product quantity drops below selectedAddon quantity, clamp down
        if (item.selectedAddon && item.selectedAddon.quantity > newQty) {
          item.selectedAddon.quantity = newQty;
        }
      }
    },
    updateAddonQuantity: (state, action) => {
      const { itemKey, quantity } = action.payload;
      const item = state.items.find((i) => i.itemKey === itemKey || i.productId === action.payload.productId);
      if (item && item.selectedAddon) {
        item.selectedAddon.quantity = Math.max(1, Math.min(quantity, item.quantity));
      }
    },
    removeAddonFromCartItem: (state, action) => {
      const { itemKey } = action.payload;
      const item = state.items.find((i) => i.itemKey === itemKey || i.productId === action.payload.productId);
      if (item) {
        item.selectedAddon = null;
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

export const {
  addItem,
  removeItem,
  updateQuantity,
  updateAddonQuantity,
  removeAddonFromCartItem,
  clearCart,
  applyCoupon,
  removeCoupon,
} = cartSlice.actions;

export const selectCartItems = (state) => state.cart.items;

export const selectCartItemCount = (state) =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0);

export const selectCartProductsSubtotal = (state) =>
  state.cart.items.reduce((sum, item) => {
    const basePrice = item.discountPrice || item.price;
    return sum + basePrice * item.quantity;
  }, 0);

export const selectCartAddonsSubtotal = (state) =>
  state.cart.items.reduce((sum, item) => {
    if (!item.selectedAddon) return sum;
    const addon = item.selectedAddon;
    const addonPrice = addon.isFree ? 0 : Number(addon.price || 0);
    return sum + addonPrice * (addon.quantity || 1);
  }, 0);

export const selectCartSubtotal = (state) =>
  selectCartProductsSubtotal(state) + selectCartAddonsSubtotal(state);

export const selectCartCoupon = (state) => state.cart.coupon;

export default cartSlice.reducer;
