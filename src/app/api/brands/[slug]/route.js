import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { brandService } from '@/services/brand.service';
import { brandParamSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export const GET = routeHandler({
  auth: false,
  paramsSchema: brandParamSchema,
  handler: async ({ params }) => {
    const brand = await brandService.getBrandBySlug(params.slug);
    return ApiResponse.success({
      brand: {
        name: brand.name,
        slug: brand.slug,
        productCount: brand.productCount,
        image: brand.image,
      },
    });
  },
});
