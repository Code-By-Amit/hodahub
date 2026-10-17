'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { ordersApi } from '@/lib/apiClient/orders.api';

export function useAdminOrders({ page = 1, limit = 20, status = '' } = {}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const queryKey = ['admin', 'orders', { page, limit, status }];

  const query = useQuery({
    queryKey,
    queryFn: () => ordersApi.getAdmin({ page, limit, status }),
    staleTime: 60 * 1000, // 1 minute fresh cache for orders
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Optimistic mark paid mutation
  const markPaidMutation = useMutation({
    mutationFn: ({ orderId }) =>
      ordersApi.takeAction(orderId, { action: 'update_payment_status', paymentStatus: 'paid' }),
    onMutate: async ({ orderId }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'orders'] });

      const previousQueries = queryClient.getQueriesData({ queryKey: ['admin', 'orders'] });

      queryClient.setQueriesData({ queryKey: ['admin', 'orders'] }, (oldData) => {
        if (!oldData?.orders) return oldData;
        return {
          ...oldData,
          orders: oldData.orders.map((o) =>
            o.id === orderId ? { ...o, paymentStatus: 'paid' } : o
          ),
        };
      });

      return { previousQueries };
    },
    onError: (err, { orderId }, context) => {
      if (context?.previousQueries) {
        for (const [key, oldData] of context.previousQueries) {
          queryClient.setQueryData(key, oldData);
        }
      }
      toast.error(err.message || 'Failed to update payment status');
    },
    onSuccess: () => {
      toast.success('Order marked as Paid');
    },
  });

  return {
    orders: query.data?.orders || [],
    pagination: query.data?.pagination || { page: 1, totalPages: 1, total: 0 },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    markPaid: (orderId) => markPaidMutation.mutateAsync({ orderId }),
    isMarkingPaid: markPaidMutation.isPending,
    markingPaidId: markPaidMutation.variables?.orderId,
  };
}

export default useAdminOrders;
