'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/lib/apiClient/products.api';

export function useShopProducts(params = {}) {
  const queryClient = useQueryClient();

  const {
    page = 1,
    limit = 12,
    sort = 'newest',
    category = '',
    brand = '',
    minPrice = '',
    maxPrice = '',
    search = '',
    minRating = '',
    enabled = true,
  } = params;

  const normalizedParams = useMemo(() => ({
    page,
    limit,
    sort,
    category,
    brand,
    minPrice,
    maxPrice,
    search,
    minRating,
  }), [page, limit, sort, category, brand, minPrice, maxPrice, search, minRating]);

  const fetchProducts = (p) => productsApi.getAll(p);

  const queryKey = ['products', normalizedParams];

  const query = useQuery({
    enabled,
    queryKey,
    queryFn: () => fetchProducts(normalizedParams),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData, // Seamless pagination without layout flash
  });

  // Prefetch next page
  useEffect(() => {
    const pagination = query.data?.pagination;
    if (enabled && pagination && pagination.page < pagination.totalPages) {
      const nextPage = pagination.page + 1;
      queryClient.prefetchQuery({
        queryKey: ['products', { ...normalizedParams, page: nextPage }],
        queryFn: () => fetchProducts({ ...normalizedParams, page: nextPage }),
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [query.data, normalizedParams, queryClient, enabled]);

  return {
    products: query.data?.products || [],
    pagination: query.data?.pagination || { page: 1, totalPages: 1, total: 0 },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useShopProducts;
