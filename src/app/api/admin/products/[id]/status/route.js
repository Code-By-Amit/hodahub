import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { productService } from '@/services/product.service';
import { productStatusToggleSchema } from '@/lib/validations';

export const PATCH = routeHandler({
  adminOnly: true,
  schema: productStatusToggleSchema,
  handler: async ({ params, data }) => {
    const { id } = params;
    if (!id) {
      return ApiResponse.error('Product ID is required', 400);
    }

    const updatedProduct = await productService.toggleStatus(id, data);
    return ApiResponse.success({ success: true, product: updatedProduct });
  },
});
