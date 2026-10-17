'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { bannersApi } from '@/lib/apiClient/banners.api';

export function useAdminBanners() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const queryKey = ['admin', 'banners'];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await bannersApi.getAdmin();
      return data.banners || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Optimistic toggle mutation for banner status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ banner }) => {
      return bannersApi.save(banner.id, { ...banner, isActive: !banner.isActive });
    },
    onMutate: async ({ banner }) => {
      await queryClient.cancelQueries({ queryKey });

      const previousBanners = queryClient.getQueryData(queryKey);

      // Optimistically flip status immediately
      queryClient.setQueryData(queryKey, (old = []) =>
        old.map((b) => (b.id === banner.id ? { ...b, isActive: !banner.isActive } : b))
      );

      return { previousBanners };
    },
    onError: (err, { banner }, context) => {
      // Rollback on failure
      if (context?.previousBanners) {
        queryClient.setQueryData(queryKey, context.previousBanners);
      }
      toast.error(err.message || 'Error toggling banner status');
    },
    onSuccess: (data, { banner }) => {
      const updatedBanner = data?.banner;
      if (updatedBanner) {
        queryClient.setQueryData(queryKey, (old = []) =>
          old.map((b) => (b.id === updatedBanner.id ? updatedBanner : b))
        );
      }
      // Invalidate public storefront banners
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success(`Banner ${!banner.isActive ? 'activated' : 'deactivated'}`);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const data = await bannersApi.save(id, payload);
      return { id, data };
    },
    onSuccess: ({ id, data }) => {
      const savedBanner = data.banner;
      if (savedBanner) {
        queryClient.setQueryData(queryKey, (old = []) => {
          if (id) {
            return old.map((b) => (b.id === id ? savedBanner : b));
          }
          return [...old, savedBanner];
        });
      } else {
        queryClient.invalidateQueries({ queryKey });
      }
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success(id ? 'Banner updated!' : 'Banner created!');
    },
    onError: (err) => {
      toast.error(err.message || 'Error saving banner');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await bannersApi.remove(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(queryKey, (old = []) => old.filter((b) => b.id !== deletedId));
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner deleted');
    },
    onError: (err) => {
      toast.error(err.message || 'Error deleting banner');
    },
  });

  return {
    banners: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    toggleStatus: (banner) => toggleStatusMutation.mutateAsync({ banner }),
    isToggling: toggleStatusMutation.isPending,
    togglingId: toggleStatusMutation.variables?.banner?.id,
    saveBanner: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteBanner: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export default useAdminBanners;
