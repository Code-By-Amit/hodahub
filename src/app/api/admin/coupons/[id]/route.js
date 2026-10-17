import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { couponService } from '@/services/coupon.service';

export const PUT = routeHandler({
  adminOnly: true,
  handler: async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const updated = await couponService.updateCoupon(id, body);
    return ApiResponse.success({ coupon: updated });
  },
});

export const DELETE = routeHandler({
  adminOnly: true,
  handler: async ({ params }) => {
    const { id } = params;
    await couponService.deleteCoupon(id);
    return ApiResponse.success({ message: 'Deleted' });
  },
});
