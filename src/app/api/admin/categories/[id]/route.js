import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { categoryService } from '@/services/category.service';

export const PUT = routeHandler({
  adminOnly: true,
  handler: async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const updated = await categoryService.updateCategory(id, body);
    return ApiResponse.success({ category: updated });
  },
});

export const DELETE = routeHandler({
  adminOnly: true,
  handler: async ({ params }) => {
    const { id } = params;
    await categoryService.deleteCategory(id);
    return ApiResponse.success({ message: 'Deleted' });
  },
});
