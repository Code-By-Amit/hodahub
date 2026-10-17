'use client';

import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '@/lib/apiClient/categories.api';

export function useShopCategories() {
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const data = await categoriesApi.getAll();
      return data.categories || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    gcTime: 30 * 60 * 1000,
  });

  return {
    categories: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export default useShopCategories;
