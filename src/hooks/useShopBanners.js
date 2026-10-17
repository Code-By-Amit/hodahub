'use client';

import { useQuery } from '@tanstack/react-query';
import { bannersApi } from '@/lib/apiClient/banners.api';

export function useShopBanners() {
  const query = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const data = await bannersApi.getAll();
      return data.banners || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    gcTime: 30 * 60 * 1000,
  });

  return {
    banners: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export default useShopBanners;
