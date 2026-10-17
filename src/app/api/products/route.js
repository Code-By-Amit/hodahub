import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { productService } from '@/services/product.service';

export const dynamic = 'force-dynamic';

export const GET = routeHandler({
  auth: false,
  handler: async ({ query }) => {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '12');
    const sort = query.sort || 'newest';
    const category = query.category;
    const brand = query.brand;
    const search = query.search;
    const minPrice = query.minPrice;
    const maxPrice = query.maxPrice;
    const minRating = query.minRating;

    const result = await productService.getProducts({
      page,
      limit,
      sort,
      category,
      brand,
      search,
      minPrice,
      maxPrice,
      minRating,
    });

    return ApiResponse.success(result);
  },
});
