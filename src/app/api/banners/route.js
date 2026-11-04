import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { bannerService } from '@/services/banner.service';

export const dynamic = 'force-dynamic';

export const GET = routeHandler({
  auth: false,
  handler: async () => {
    const activeBanners = await bannerService.getActiveBanners();
    return ApiResponse.success({ banners: activeBanners });
  },
});
