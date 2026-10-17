'use client';

import { useQuery } from '@tanstack/react-query';
import { brandsApi } from '@/lib/apiClient/brands.api';

export function useShopBrands() {
  const query = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const data = await brandsApi.getAll();
      return data.brands || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    gcTime: 30 * 60 * 1000,
  });

  return {
    brands: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export default useShopBrands;
