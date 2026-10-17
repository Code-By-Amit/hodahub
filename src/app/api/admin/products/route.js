import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { productService } from '@/services/product.service';
import { productSchema } from '@/lib/validations';

export const GET = routeHandler({
  adminOnly: true,
  handler: async ({ query }) => {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const search = query.search || '';
    const categoryFilter = query.category || '';
    const brandFilter = query.brand || '';
    const activeFilter = query.active || '';
    const stockFilter = query.stock || '';

    const result = await productService.getAdminProducts({
      page,
      limit,
      search,
      categoryFilter,
      brandFilter,
      activeFilter,
      stockFilter,
    });

    return ApiResponse.success(result);
  },
});

export const POST = routeHandler({
  adminOnly: true,
  schema: productSchema,
  handler: async ({ data }) => {
    const product = await productService.createProduct(data);
    return ApiResponse.created({ product });
  },
});
