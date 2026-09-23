import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  coupon: null, // { code, type, value, discount }
};

const generateItemKey = (productId, selectedAddons = []) => {
  const addonKey = selectedAddons
    .map((a) => `${a.id}_${a.quantity || 1}`)
    .sort()
    .join('-');
  return addonKey ? `${productId}_${addonKey}` : productId;
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

      const normalizedAddons = selectedAddons.map((a) => ({
        ...a,
        quantity: Math.max(1, a.quantity || 1),
      }));

      const itemKey = generateItemKey(productId, normalizedAddons);
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
          selectedAddons: normalizedAddons,
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
    updateAddonQuantity: (state, action) => {
      const { itemKey, productId, addonId, quantity } = action.payload;
      const keyToFind = itemKey || productId;
      const item = state.items.find((i) => (i.itemKey || i.productId) === keyToFind);
      if (item && Array.isArray(item.selectedAddons)) {
        const addon = item.selectedAddons.find((a) => a.id === addonId);
        if (addon) {
          addon.quantity = Math.max(1, quantity);
          item.itemKey = generateItemKey(item.productId, item.selectedAddons);
        }
      }
    },
    removeAddonFromCartItem: (state, action) => {
      const { itemKey, productId, addonId } = action.payload;
      const keyToFind = itemKey || productId;
      const item = state.items.find((i) => (i.itemKey || i.productId) === keyToFind);
      if (item && Array.isArray(item.selectedAddons)) {
        item.selectedAddons = item.selectedAddons.filter((a) => a.id !== addonId);
        item.itemKey = generateItemKey(item.productId, item.selectedAddons);
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
    const addonsTotal = (item.selectedAddons || []).reduce(
      (aSum, addon) => aSum + (addon.isFree ? 0 : Number(addon.price || 0) * (addon.quantity || 1)),
      0
    );
    return sum + addonsTotal;
  }, 0);

export const selectCartSubtotal = (state) =>
  selectCartProductsSubtotal(state) + selectCartAddonsSubtotal(state);

export const selectCartCoupon = (state) => state.cart.coupon;

export default cartSlice.reducer;
