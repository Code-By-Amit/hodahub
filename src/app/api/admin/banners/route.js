import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { bannerService } from '@/services/banner.service';

export const GET = routeHandler({
  adminOnly: true,
  handler: async () => {
    const banners = await bannerService.getAdminBanners();
    return ApiResponse.success({ banners });
  },
});

export const POST = routeHandler({
  adminOnly: true,
  handler: async ({ request }) => {
    const body = await request.json();
    if (!body?.title || !body.title.trim()) {
      return ApiResponse.error('Banner title is required', 400);
    }
    const banner = await bannerService.createBanner(body);
    return ApiResponse.created({ banner, message: 'Banner created successfully' });
  },
});
