import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { reviewService } from '@/services/review.service';
import { adminReviewSchema } from '@/lib/validations';

export const PUT = routeHandler({
  adminOnly: true,
  handler: async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const result = adminReviewSchema.partial().safeParse(body);
    if (!result.success) {
      return ApiResponse.error(result.error.issues?.[0]?.message || 'Invalid review edit data', 400);
    }
    const updated = await reviewService.updateReview(id, body);
    return ApiResponse.success({ review: updated, message: 'Review updated successfully!' });
  },
});

export const PATCH = routeHandler({
  adminOnly: true,
  handler: async ({ params }) => {
    const { id } = params;
    const updated = await reviewService.toggleVisibility(id);
    return ApiResponse.success({ review: updated });
  },
});

export const DELETE = routeHandler({
  adminOnly: true,
  handler: async ({ params }) => {
    const { id } = params;
    await reviewService.deleteReview(id);
    return ApiResponse.success({ message: 'Deleted' });
  },
});
