import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { couponService } from '@/services/coupon.service';
import { couponSchema } from '@/lib/validations';

export const GET = routeHandler({
  adminOnly: true,
  handler: async ({ query }) => {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const result = await couponService.getAdminCoupons({ page, limit });
    return ApiResponse.success(result);
  },
});

export const POST = routeHandler({
  adminOnly: true,
  schema: couponSchema,
  handler: async ({ data }) => {
    const coupon = await couponService.createCoupon(data);
    return ApiResponse.created({ coupon });
  },
});
