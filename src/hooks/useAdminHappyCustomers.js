'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { buildOrderPatch } from '@/lib/happy-customers';
import { happyCustomersApi } from '@/lib/apiClient/happyCustomers.api';

export function useAdminHappyCustomers() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const queryKey = ['admin', 'happy-customers'];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await happyCustomersApi.getAdmin();
      return data.happyCustomers || data.items || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Optimistic toggle mutation for published/hidden status
  const toggleActiveMutation = useMutation({
    mutationFn: ({ item }) => happyCustomersApi.toggleActive(item.id, !item.isActive),
    onMutate: async ({ item }) => {
      await queryClient.cancelQueries({ queryKey });

      const previousItems = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old = []) =>
        old.map((i) => (i.id === item.id ? { ...i, isActive: !item.isActive } : i))
      );

      return { previousItems };
    },
    onError: (err, { item }, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKey, context.previousItems);
      }
      toast.error(err.message || 'Error updating status');
    },
    onSuccess: (data, { item }) => {
      const updated = data?.happyCustomer || data?.item;
      if (updated) {
        queryClient.setQueryData(queryKey, (old = []) =>
          old.map((i) => (i.id === updated.id ? updated : i))
        );
      }
      queryClient.invalidateQueries({ queryKey: ['happy-customers'] });
      toast.success(`Screenshot ${!item.isActive ? 'published' : 'unpublished'}`);
    },
  });

  // Save (create or update) mutation
  const saveMutation = useMutation({
    mutationFn: async ({ id, form }) => {
      const data = await happyCustomersApi.save(id, form);
      return { id, data };
    },
    onSuccess: ({ id, data }) => {
      const saved = data?.happyCustomer || data?.item;
      if (saved) {
        queryClient.setQueryData(queryKey, (old = []) => {
          if (id) {
            return old.map((i) => (i.id === id ? saved : i));
          }
          return [saved, ...old];
        });
      } else {
        queryClient.invalidateQueries({ queryKey });
      }
      queryClient.invalidateQueries({ queryKey: ['happy-customers'] });
      toast.success(id ? 'Screenshot updated!' : 'Screenshot added!');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save screenshot');
    },
  });

  // Reorder mutation with rollback
  const reorderMutation = useMutation({
    mutationFn: async (nextItems) => {
      const patch = buildOrderPatch(nextItems);
      if (patch.length === 0) return true;

      const results = await Promise.all(
        patch.map(({ id, sortOrder }) => happyCustomersApi.updateOrder(id, sortOrder))
      );

      const allOk = results.every(Boolean);
      if (!allOk) {
        throw new Error('Failed to save display order');
      }
      return true;
    },
    onMutate: async (nextItems) => {
      await queryClient.cancelQueries({ queryKey });
      const previousItems = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, nextItems);
      return { previousItems };
    },
    onError: (err, nextItems, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKey, context.previousItems);
      }
      toast.error(err.message || 'Failed to save display order');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['happy-customers'] });
      toast.success('Display order updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await happyCustomersApi.remove(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(queryKey, (old = []) => old.filter((i) => i.id !== deletedId));
      queryClient.invalidateQueries({ queryKey: ['happy-customers'] });
      toast.success('Screenshot deleted');
    },
    onError: (err) => {
      toast.error(err.message || 'Error deleting screenshot');
    },
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    toggleActive: (item) => toggleActiveMutation.mutateAsync({ item }),
    isToggling: toggleActiveMutation.isPending,
    togglingId: toggleActiveMutation.variables?.item?.id,
    saveItem: (payload) => saveMutation.mutateAsync(payload),
    isSaving: saveMutation.isPending,
    reorderItems: (items) => reorderMutation.mutateAsync(items),
    isReordering: reorderMutation.isPending,
    deleteItem: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export default useAdminHappyCustomers;
