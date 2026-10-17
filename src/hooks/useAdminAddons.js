'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { addonsApi } from '@/lib/apiClient/addons.api';

export function useAdminAddons() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const queryKey = ['admin', 'addons'];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await addonsApi.getAdmin();
      return data.addons || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Optimistic toggle mutation for addon status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      return addonsApi.save(id, { isActive });
    },
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey });

      const previousAddons = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) =>
        old.map((a) => (a.id === id ? { ...a, isActive } : a))
      );

      return { previousAddons };
    },
    onError: (err, { id }, context) => {
      if (context?.previousAddons) {
        queryClient.setQueryData(queryKey, context.previousAddons);
      }
      toast.error(err.message || 'Error updating add-on status');
    },
    onSuccess: (data, { id, isActive }) => {
      const updated = data?.addon;
      if (updated) {
        queryClient.setQueryData(queryKey, (old = []) =>
          old.map((a) => (a.id === updated.id ? updated : a))
        );
      }
      toast.success(`Add-on status set to ${isActive ? 'Active' : 'Inactive'}`);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const data = await addonsApi.save(id, payload);
      return { id, data };
    },
    onSuccess: ({ id, data }) => {
      const savedAddon = data.addon;
      if (savedAddon) {
        queryClient.setQueryData(queryKey, (old = []) => {
          if (id) {
            return old.map((a) => (a.id === id ? savedAddon : a));
          }
          return [savedAddon, ...old];
        });
      } else {
        queryClient.invalidateQueries({ queryKey });
      }
      toast.success(id ? 'Add-on updated!' : 'Add-on created!');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save add-on');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await addonsApi.remove(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(queryKey, (old = []) => old.filter((a) => a.id !== deletedId));
      toast.success('Add-on deleted');
    },
    onError: (err) => {
      toast.error(err.message || 'Error deleting add-on');
    },
  });

  return {
    addons: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    toggleStatus: (id, isActive) => toggleStatusMutation.mutateAsync({ id, isActive }),
    isToggling: toggleStatusMutation.isPending,
    togglingId: toggleStatusMutation.variables?.id,
    saveAddon: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteAddon: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export default useAdminAddons;
