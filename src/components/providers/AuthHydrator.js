'use client';

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, clearUser } from '@/lib/store/authSlice';
import { selectWishlistItems } from '@/lib/store/wishlistSlice';
import { syncWishlistOnAuth } from '@/lib/store/syncWishlist';

export default function AuthHydrator({ children }) {
  const dispatch = useDispatch();
  const guestWishlistItems = useSelector(selectWishlistItems);
  const syncAttempted = useRef(false);

  useEffect(() => {
    async function hydrateAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
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

