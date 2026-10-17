'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { reviewsApi } from '@/lib/apiClient/reviews.api';

export function useAdminReviews({ page = 1, limit = 15 } = {}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const queryKey = ['admin', 'reviews', { page, limit }];

  const query = useQuery({
    queryKey,
    queryFn: () => reviewsApi.getAdmin({ page, limit }),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Optimistic toggle mutation for review visibility (isHidden)
  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id }) => reviewsApi.toggleVisibility(id),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'reviews'] });

      const previousQueries = queryClient.getQueriesData({ queryKey: ['admin', 'reviews'] });

      queryClient.setQueriesData({ queryKey: ['admin', 'reviews'] }, (oldData) => {
        if (!oldData?.reviews) return oldData;
        return {
          ...oldData,
          reviews: oldData.reviews.map((r) =>
            r.id === id ? { ...r, isHidden: !r.isHidden } : r
          ),
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
      toast.error(err.message || 'Error updating review visibility');
    },
    onSuccess: (data, { id }) => {
      const updated = data?.review;
      if (updated) {
        queryClient.setQueriesData({ queryKey: ['admin', 'reviews'] }, (oldData) => {
          if (!oldData?.reviews) return oldData;
          return {
            ...oldData,
            reviews: oldData.reviews.map((r) => (r.id === id ? updated : r)),
          };
        });
      }
      toast.success('Review visibility updated');
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const data = await reviewsApi.save(id, payload);
      return { id, data };
    },
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      toast.success(id ? 'Review updated successfully!' : 'Review created successfully!');
    },
    onError: (err) => {
      toast.error(err.message || 'Error saving review');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await reviewsApi.remove(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueriesData({ queryKey: ['admin', 'reviews'] }, (oldData) => {
        if (!oldData?.reviews) return oldData;
        return {
          ...oldData,
          reviews: oldData.reviews.filter((r) => r.id !== deletedId),
          pagination: {
            ...oldData.pagination,
            total: Math.max(0, (oldData.pagination?.total || 1) - 1),
          },
        };
      });
      toast.success('Review deleted');
    },
    onError: (err) => {
      toast.error(err.message || 'Error deleting review');
    },
  });

  return {
    reviews: query.data?.reviews || [],
    pagination: query.data?.pagination || { page: 1, totalPages: 1, total: 0 },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    toggleVisibility: (id) => toggleVisibilityMutation.mutateAsync({ id }),
    isToggling: toggleVisibilityMutation.isPending,
    togglingId: toggleVisibilityMutation.variables?.id,
    saveReview: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteReview: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export default useAdminReviews;
