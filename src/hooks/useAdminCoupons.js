'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { couponsApi } from '@/lib/apiClient/coupons.api';

export function useAdminCoupons({ page = 1, limit = 20 } = {}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const queryKey = ['admin', 'coupons', { page, limit }];

  const query = useQuery({
    queryKey,
    queryFn: () => couponsApi.getAdmin({ page, limit }),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Optimistic toggle mutation for coupon active status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      return couponsApi.save(id, { isActive });
    },
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'coupons'] });

      const previousQueries = queryClient.getQueriesData({ queryKey: ['admin', 'coupons'] });

      queryClient.setQueriesData({ queryKey: ['admin', 'coupons'] }, (oldData) => {
        if (!oldData?.coupons) return oldData;
        return {
          ...oldData,
          coupons: oldData.coupons.map((c) => (c.id === id ? { ...c, isActive } : c)),
        };
      });

      return { previousQueries };
    },
    onError: (err, { id }, context) => {
      if (context?.previousQueries) {
        for (const [key, oldData] of context.previousQueries) {
          queryClient.setQueryData(key, oldData);
        }
      }
      toast.error(err.message || 'Error updating coupon status');
    },
    onSuccess: (data, { id, isActive }) => {
      const updated = data?.coupon;
      if (updated) {
        queryClient.setQueriesData({ queryKey: ['admin', 'coupons'] }, (oldData) => {
          if (!oldData?.coupons) return oldData;
          return {
            ...oldData,
            coupons: oldData.coupons.map((c) => (c.id === id ? updated : c)),
          };
        });
      }
      toast.success(`Coupon status set to ${isActive ? 'Active' : 'Inactive'}`);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const data = await couponsApi.save(id, payload);
      return { id, data };
    },
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      toast.success(id ? 'Coupon updated!' : 'Coupon created!');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save coupon');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await couponsApi.remove(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueriesData({ queryKey: ['admin', 'coupons'] }, (oldData) => {
        if (!oldData?.coupons) return oldData;
        return {
          ...oldData,
          coupons: oldData.coupons.filter((c) => c.id !== deletedId),
          pagination: {
            ...oldData.pagination,
            total: Math.max(0, (oldData.pagination?.total || 1) - 1),
          },
        };
      });
      toast.success('Coupon deleted');
    },
    onError: (err) => {
      toast.error(err.message || 'Error deleting coupon');
    },
  });

  return {
    coupons: query.data?.coupons || [],
    pagination: query.data?.pagination || { page: 1, totalPages: 1, total: 0 },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    toggleStatus: (id, isActive) => toggleStatusMutation.mutateAsync({ id, isActive }),
    isToggling: toggleStatusMutation.isPending,
    togglingId: toggleStatusMutation.variables?.id,
    saveCoupon: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteCoupon: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export default useAdminCoupons;
