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
      const {
        productId,
        name,
        slug,
        image,
        price,
        discountPrice,
        codAvailable,
        quantity = 1,
        selectedAddons = [],
      } = action.payload;

      // Unique key based on productId + sorted selectedAddonIds
      const addonKey = selectedAddons.map((a) => a.id).sort().join('-');
      const itemKey = addonKey ? `${productId}_${addonKey}` : productId;

      const existing = state.items.find((item) => (item.itemKey || item.productId) === itemKey);

      if (existing) {
        existing.quantity += quantity;
        if (codAvailable !== undefined) existing.codAvailable = codAvailable !== false;
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
          selectedAddons,
        });
      }
    },
    removeItem: (state, action) => {
      const target = action.payload; // can be itemKey or productId
      state.items = state.items.filter(
        (item) => item.itemKey !== target && item.productId !== target
      );
    },
    updateQuantity: (state, action) => {
      const { productId, itemKey, quantity } = action.payload;
      const keyToFind = itemKey || productId;
      const item = state.items.find((item) => (item.itemKey || item.productId) === keyToFind);
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
  state.cart.items.reduce((sum, item) => {
    const basePrice = item.discountPrice || item.price;
    const addonsPrice = (item.selectedAddons || []).reduce(
      (aSum, addon) => aSum + (addon.isFree ? 0 : Number(addon.price || 0)),
      0
    );
    return sum + (basePrice + addonsPrice) * item.quantity;
  }, 0);
export const selectCartCoupon = (state) => state.cart.coupon;

export default cartSlice.reducer;
