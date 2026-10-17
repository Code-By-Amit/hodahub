'use client';

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, clearUser } from '@/lib/store/authSlice';
import { selectWishlistItems } from '@/lib/store/wishlistSlice';
import { syncWishlistOnAuth } from '@/lib/store/syncWishlist';
import { authApi } from '@/lib/apiClient/auth.api';

export default function AuthHydrator({ children }) {
  const dispatch = useDispatch();
  const guestWishlistItems = useSelector(selectWishlistItems);
  const syncAttempted = useRef(false);

  useEffect(() => {
    async function hydrateAuth() {
      try {
        const data = await authApi.me();
        if (data?.user) {
          dispatch(setUser(data.user));

          if (!syncAttempted.current) {
            syncAttempted.current = true;
            await syncWishlistOnAuth(dispatch, guestWishlistItems);
          }
        } else {
          dispatch(clearUser());
        }
      } catch {
        dispatch(clearUser());
      }
    }

    hydrateAuth();
  }, [dispatch]);

  return children;
}

