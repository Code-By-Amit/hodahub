import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { bannerService } from '@/services/banner.service';

export const dynamic = 'force-dynamic';

export const GET = routeHandler({
  auth: false,
  handler: async () => {
    try {
      const activeBanners = await bannerService.getActiveBanners();
      return ApiResponse.success({ banners: activeBanners });
    } catch (error) {
      console.error('Fetch active banners error:', error);
      return ApiResponse.success({ banners: [] });
    }
  },
});
