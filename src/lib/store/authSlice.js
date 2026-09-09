import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  isLoading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isLoading = false;
    },
    clearUser: (state) => {
      state.user = null;
      state.isLoading = false;
    },
    setAuthLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setUser, clearUser, setAuthLoading } = authSlice.actions;

export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectIsAdmin = (state) => state.auth.user?.role === 'admin';

export default authSlice.reducer;
