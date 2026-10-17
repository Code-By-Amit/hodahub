'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { productsApi } from '@/lib/apiClient/products.api';

export function useAdminProducts({
  page = 1,
  limit = 20,
  search = '',
  category = '',
  active = '',
  stock = '',
} = {}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const queryParams = {
    page,
    limit,
    search: search.trim(),
    category,
    active,
    stock,
  };

  const fetchAdminProducts = (params) => productsApi.getAdmin(params);

  const queryKey = ['admin', 'products', queryParams];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchAdminProducts(queryParams),
    staleTime: 2 * 60 * 1000, // 2 minutes fresh cache
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData, // Keep previous page visible while fetching next
  });

  // Prefetch next page for seamless instant navigation
  useEffect(() => {
    const pagination = query.data?.pagination;
    if (pagination && pagination.page < pagination.totalPages) {
      const nextPage = pagination.page + 1;
      queryClient.prefetchQuery({
        queryKey: ['admin', 'products', { ...queryParams, page: nextPage }],
        queryFn: () => fetchAdminProducts({ ...queryParams, page: nextPage }),
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [query.data, queryParams, queryClient]);

  // Optimistic status toggle mutation (isActive, showOnHome, isOutOfStock)
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, patch }) => productsApi.toggleStatus(id, patch),
    onMutate: async ({ id, patch }) => {
      // Cancel conflicting queries so in-flight fetches don't overwrite optimistic data
      await queryClient.cancelQueries({ queryKey: ['admin', 'products'] });

      // Snapshot all matching cached product queries for rollback
      const previousQueries = queryClient.getQueriesData({ queryKey: ['admin', 'products'] });

      // Optimistically update all cached product lists immediately
      queryClient.setQueriesData({ queryKey: ['admin', 'products'] }, (oldData) => {
        if (!oldData?.products) return oldData;
        return {
          ...oldData,
          products: oldData.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        };
      });

      return { previousQueries };
    },
    onError: (err, { id }, context) => {
      // Rollback to exact previous state
      if (context?.previousQueries) {
        for (const [key, oldData] of context.previousQueries) {
          queryClient.setQueryData(key, oldData);
        }
      }
      toast.error(err.message || 'Failed to update status');
    },
    onSuccess: (data, { id, patch }) => {
      // Synchronize confirmed server response without refetching the entire list
      const confirmedProduct = data?.product;
      if (confirmedProduct) {
        queryClient.setQueriesData({ queryKey: ['admin', 'products'] }, (oldData) => {
          if (!oldData?.products) return oldData;
          return {
            ...oldData,
            products: oldData.products.map((p) =>
              p.id === id ? { ...p, ...confirmedProduct } : p
            ),
          };
        });
      }

      if ('isActive' in patch) {
        toast.success(`Product status set to ${patch.isActive ? 'Active' : 'Inactive'}`);
      } else if ('showOnHome' in patch) {
        toast.success(
          `Product home visibility set to ${patch.showOnHome ? 'Show on Home' : 'Hide on Home'}`
        );
      } else if ('isOutOfStock' in patch) {
        toast.success(
          `Product stock status set to ${patch.isOutOfStock ? 'Out of Stock' : 'In Stock'}`
        );
      }
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: ({ id }) => productsApi.remove(id),
    onSuccess: (_, { id }) => {
      queryClient.setQueriesData({ queryKey: ['admin', 'products'] }, (oldData) => {
        if (!oldData?.products) return oldData;
        return {
          ...oldData,
          products: oldData.products.filter((p) => p.id !== id),
          pagination: {
            ...oldData.pagination,
            total: Math.max(0, (oldData.pagination?.total || 1) - 1),
          },
        };
      });
      toast.success('Product deleted successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Error deleting product');
    },
  });

  return {
    products: query.data?.products || [],
    pagination: query.data?.pagination || { page: 1, totalPages: 1, total: 0, limit },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    toggleStatus: toggleStatusMutation.mutateAsync,
    isToggling: toggleStatusMutation.isPending,
    togglingVariables: toggleStatusMutation.variables,
    deleteProduct: deleteProductMutation.mutateAsync,
    isDeleting: deleteProductMutation.isPending,
  };
}

export default useAdminProducts;
