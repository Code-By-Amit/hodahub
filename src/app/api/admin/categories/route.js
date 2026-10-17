import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { categoryService } from '@/services/category.service';
import { categorySchema } from '@/lib/validations';

export const GET = routeHandler({
  adminOnly: true,
  handler: async () => {
    const categories = await categoryService.getAdminCategories();
    return ApiResponse.success({ categories });
  },
});

export const POST = routeHandler({
  adminOnly: true,
  schema: categorySchema,
  handler: async ({ data }) => {
    const category = await categoryService.createCategory(data);
    return ApiResponse.created({ category });
  },
});
