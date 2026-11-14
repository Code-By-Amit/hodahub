import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { productService } from '@/services/product.service';
import { validatePriceRange } from '@/lib/catalog-filters';
import { AppError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export const GET = routeHandler({
  auth: false,
  handler: async ({ query }) => {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 12);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw AppError.badRequest('Invalid pagination');
    const priceError = validatePriceRange(query.minPrice, query.maxPrice);
    if (priceError) throw AppError.badRequest(priceError);
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
