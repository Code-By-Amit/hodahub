import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { brandService } from '@/services/brand.service';
import { brandQuerySchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export const GET = routeHandler({
  auth: false,
  querySchema: brandQuerySchema,
  handler: async ({ query }) => {
    const q = query.q || query.search;
    const page = query.page;
    const limit = query.limit;
    const category = query.category;

    const result = await brandService.getBrands({
      q,
      page,
      limit,
      category,
    });

    return ApiResponse.success(result);
  },
});
