import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { categoryService } from '@/services/category.service';

export const dynamic = 'force-dynamic';

export const GET = routeHandler({
  auth: false,
  handler: async () => {
    const tree = await categoryService.getPublicTree();
    return ApiResponse.success({
      categories: tree.rootCategories,
      allCategories: tree.allCategories,
    });
  },
});
