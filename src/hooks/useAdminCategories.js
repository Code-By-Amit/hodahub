'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { categoriesApi } from '@/lib/apiClient/categories.api';

export function useAdminCategories() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const queryKey = ['admin', 'categories'];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const data = await categoriesApi.getAdmin();
      return data.categories || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 15 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const data = await categoriesApi.save(id, payload);
      return { id, data };
    },
    onSuccess: ({ id, data }) => {
      const savedCategory = data.category;
      if (savedCategory) {
        queryClient.setQueryData(queryKey, (old = []) => {
          if (id) {
            return old.map((c) => (c.id === id ? savedCategory : c));
          }
          return [...old, savedCategory];
        });
      } else {
        queryClient.invalidateQueries({ queryKey });
      }
      // Also invalidate public categories so storefront updates
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(id ? 'Category updated!' : 'Category created!');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await categoriesApi.remove(id);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData(queryKey, (old = []) => old.filter((c) => c.id !== deletedId));
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    },
    onError: (err) => {
      toast.error(err.message || 'Error deleting category');
    },
  });

  return {
    categories: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    saveCategory: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteCategory: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export default useAdminCategories;
