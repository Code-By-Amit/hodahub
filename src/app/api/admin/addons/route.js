import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { addonService } from '@/services/addon.service';
import { productAddonSchema } from '@/lib/validations';

export const GET = routeHandler({
  adminOnly: true,
  handler: async () => {
    const addons = await addonService.getAdminAddons();
    return ApiResponse.success({ addons });
  },
});

export const POST = routeHandler({
  adminOnly: true,
  schema: productAddonSchema,
  handler: async ({ data }) => {
    const addon = await addonService.createAddon(data);
    return ApiResponse.created({ addon });
  },
});
