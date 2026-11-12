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
    staleTime: 30 * 1000, // 30 seconds fresh cache for admin management
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    retry: 1,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const data = await categoriesApi.save(id, payload);
      return { id, data, payload };
    },
    onSuccess: ({ id, data, payload }) => {
      const savedCategory = data?.category || (payload ? { ...payload, id } : null);
      if (savedCategory) {
        queryClient.setQueryData(queryKey, (old = []) => {
          const updated = id
            ? old.map((c) => (c.id === id ? { ...c, ...savedCategory } : c))
            : [...old, savedCategory];
          return [...updated].sort((a, b) => {
            const rankA = (a.sortOrder ?? a.sort_order ?? 0) > 0 ? (a.sortOrder ?? a.sort_order) : 999999;
            const rankB = (b.sortOrder ?? b.sort_order ?? 0) > 0 ? (b.sortOrder ?? b.sort_order) : 999999;
            if (rankA !== rankB) return rankA - rankB;
            return (a.name || '').localeCompare(b.name || '');
          });
        });
      }
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.refetchQueries({ queryKey });
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
