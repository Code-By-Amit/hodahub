'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * @typedef {Object} AdminUserRecord
 * @property {string} id
 * @property {string|null} name
 * @property {string|null} email
 * @property {string|null} phone
 * @property {'admin' | 'customer' | string} role
 * @property {boolean} isVerified
 * @property {string} createdAt
 * @property {'phone' | 'google' | 'email' | string} authProvider
 */

/**
 * @typedef {Object} UsersPagination
 * @property {number} page
 * @property {number} limit
 * @property {number} total
 * @property {number} totalPages
 */

/**
 * Hook for managing Admin Users list with caching, prefetching, and optimistic updates.
 *
 * @param {Object} [params]
 * @param {number} [params.page=1] - Active page number
 * @param {number} [params.limit=20] - Number of items per page
 * @param {string} [params.search=''] - Search term for name/email/phone
 */
export function useAdminUsers({ page = 1, limit = 20, search = '' } = {}) {
  const queryClient = useQueryClient();
  const trimmedSearch = search.trim();

  const fetchUsers = async (p, l, s) => {
    const params = new URLSearchParams({
      page: String(p),
      limit: String(l),
    });
    if (s) params.set('search', s);

    const res = await fetch(`/api/admin/users?${params.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch users');
    }
    return res.json();
  };

  const queryKey = ['admin', 'users', { page, limit, search: trimmedSearch }];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchUsers(page, limit, trimmedSearch),
    staleTime: 2 * 60 * 1000,
  });

  // Prefetch next page if available
  useEffect(() => {
    const pagination = query.data?.pagination;
    if (pagination && pagination.page < pagination.totalPages) {
      const nextPage = pagination.page + 1;
      queryClient.prefetchQuery({
        queryKey: ['admin', 'users', { page: nextPage, limit, search: trimmedSearch }],
        queryFn: () => fetchUsers(nextPage, limit, trimmedSearch),
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [query.data, page, limit, trimmedSearch, queryClient]);

  // Mutation with optimistic updates for changing user roles
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user role');
      }
      return data;
    },
    onMutate: async ({ userId, role }) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ['admin', 'users'] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update active query data
      if (previousData?.users) {
        queryClient.setQueryData(queryKey, {
          ...previousData,
          users: previousData.users.map((u) =>
            u.id === userId ? { ...u, role } : u
          ),
        });
      }

      return { previousData };
    },
    onError: (err, newVariables, context) => {
      // Roll back on failure
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Invalidate queries to ensure server consistency
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  // Mutation for creating a new admin user
  const createAdminMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create admin user');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  return {
    users: query.data?.users || [],
    pagination: query.data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    updateRole: updateRoleMutation.mutateAsync,
    isUpdatingRole: updateRoleMutation.isPending,
    createAdmin: createAdminMutation.mutateAsync,
    isCreatingAdmin: createAdminMutation.isPending,
  };
}

export default useAdminUsers;
