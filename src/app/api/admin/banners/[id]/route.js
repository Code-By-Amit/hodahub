import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { bannerService } from '@/services/banner.service';

export const PUT = routeHandler({
  adminOnly: true,
  handler: async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    if (!body?.title || !body.title.trim()) {
      return ApiResponse.error('Banner title is required', 400);
    }
    const updated = await bannerService.updateBanner(id, body);
    return ApiResponse.success({ banner: updated, message: 'Banner updated successfully' });
  },
});

export const DELETE = routeHandler({
  adminOnly: true,
  handler: async ({ params }) => {
    const { id } = params;
    await bannerService.deleteBanner(id);
    return ApiResponse.success({ message: 'Banner deleted successfully' });
  },
});
