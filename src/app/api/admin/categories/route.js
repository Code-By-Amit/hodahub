import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { categoryService } from '@/services/category.service';
import { categorySchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = routeHandler({
  adminOnly: true,
  handler: async () => {
    const categories = await categoryService.getAdminCategories();
    return ApiResponse.success({ categories }, 200, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
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
