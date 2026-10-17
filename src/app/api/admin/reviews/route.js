import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { reviewService } from '@/services/review.service';
import { adminReviewSchema } from '@/lib/validations';

export const GET = routeHandler({
  adminOnly: true,
  handler: async ({ query }) => {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '15');
    const result = await reviewService.getAdminReviews({ page, limit });
    return ApiResponse.success(result);
  },
});

export const POST = routeHandler({
  adminOnly: true,
  schema: adminReviewSchema,
  handler: async ({ data }) => {
    const review = await reviewService.createAdminReview(data);
    return ApiResponse.created({ review, message: 'Review published successfully by admin!' });
  },
});
