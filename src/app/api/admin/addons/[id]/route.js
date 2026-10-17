import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { addonService } from '@/services/addon.service';
import { productAddonSchema } from '@/lib/validations';

export const PUT = routeHandler({
  adminOnly: true,
  handler: async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    const parseResult = productAddonSchema.partial().safeParse(body);
    if (!parseResult.success) {
      return ApiResponse.error(parseResult.error.issues?.[0]?.message || 'Invalid add-on data', 400);
    }
    const updated = await addonService.updateAddon(id, parseResult.data);
    return ApiResponse.success({ addon: updated });
  },
});

export const DELETE = routeHandler({
  adminOnly: true,
  handler: async ({ params }) => {
    const { id } = params;
    await addonService.deleteAddon(id);
    return ApiResponse.success({ message: 'Add-on deleted successfully' });
  },
});
