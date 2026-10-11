'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { setUser } from '@/lib/store/authSlice';

/**
 * @typedef {Object} CurrentUser
 * @property {string} id
 * @property {string} [name]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [avatarUrl]
 * @property {'admin' | 'customer' | string} role
 * @property {boolean} isVerified
 * @property {boolean} phoneVerified
 * @property {boolean} isPhoneAuth
 * @property {'phone' | 'google' | 'email' | string} authProvider
 * @property {string} createdAt
 */

/**
 * TanStack Query hook for fetching and managing current authenticated user session and profile data.
 * Keeps React Query cache and Redux auth store in sync.
 */
export function useCurrentUser() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  const query = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/api/profile');
      if (!res.ok) {
        if (res.status === 401) {
          return { user: null, addresses: [] };
        }
        throw new Error('Failed to fetch profile');
      }
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const user = query.data?.user || null;
  const addresses = query.data?.addresses || [];

  useEffect(() => {
    if (query.data && 'user' in query.data) {
      dispatch(setUser(query.data.user));
    }
  }, [query.data, dispatch]);

  const updateProfileMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], (old) =>
        old ? { ...old, user: data.user } : { user: data.user, addresses: [] }
      );
      dispatch(setUser(data.user));
    },
  });

  return {
    ...query,
    user,
    addresses,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
  };
}

export default useCurrentUser;
