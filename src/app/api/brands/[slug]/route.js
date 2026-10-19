import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { brandService } from '@/services/brand.service';
import { brandParamSchema, brandDetailQuerySchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export const GET = routeHandler({
  auth: false,
  paramsSchema: brandParamSchema,
  querySchema: brandDetailQuerySchema,
  handler: async ({ params, query }) => {
    const data = await brandService.getBrandCategoryHierarchy({
      slug: params.slug,
      categorySlug: query?.category || null,
    });

    return ApiResponse.success({
      brand: {
        name: data.brand.name,
        slug: data.brand.slug,
        productCount: data.brand.productCount,
        image: data.brand.image,
      },
      categories: data.categories,
      selectedCategory: data.selectedCategory,
      breadcrumbs: data.breadcrumbs,
      isSingleCategory: data.isSingleCategory,
    });
  },
});

