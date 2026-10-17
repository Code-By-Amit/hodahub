import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { orderService } from '@/services/order.service';

export const GET = routeHandler({
  adminOnly: true,
  handler: async ({ query }) => {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const status = query.status || '';

    const result = await orderService.getAdminOrders({ page, limit, status });
    return ApiResponse.success(result);
  },
});
