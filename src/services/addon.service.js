import { db } from '@/lib/db';
import { addons, productAddons } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export const addonService = {
  /**
   * Admin: List all addons with linked product count
   */
  async getAdminAddons() {
    return db
      .select({
        id: addons.id,
        name: addons.name,
        price: addons.price,
        isFree: addons.isFree,
        imageUrl: addons.imageUrl,
        isActive: addons.isActive,
        createdAt: addons.createdAt,
        updatedAt: addons.updatedAt,
        productCount: sql`count(${productAddons.productId})::int`,
      })
      .from(addons)
      .leftJoin(productAddons, eq(addons.id, productAddons.addonId))
      .groupBy(addons.id)
      .orderBy(desc(addons.createdAt));
  },

  /**
   * Admin: Create addon
   */
  async createAddon({ name, price, isFree, imageUrl, isActive }) {
    const [addon] = await db
      .insert(addons)
      .values({
        name: name.trim(),
        price: isFree ? '0.00' : (price || 0).toString(),
        isFree: isFree === true,
        imageUrl: imageUrl || null,
        isActive: isActive !== false,
      })
      .returning();

    return addon;
  },

  /**
   * Admin: Update or toggle addon
   */
  async updateAddon(id, patch) {
    const updateData = {};
    if (patch.name !== undefined) updateData.name = patch.name.trim();
    if (patch.price !== undefined) updateData.price = patch.isFree ? '0.00' : (patch.price || 0).toString();
    if (patch.isFree !== undefined) updateData.isFree = patch.isFree === true;
    if (patch.imageUrl !== undefined) updateData.imageUrl = patch.imageUrl || null;
    if (patch.isActive !== undefined) updateData.isActive = patch.isActive !== false;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(addons)
      .set(updateData)
      .where(eq(addons.id, id))
      .returning();

    if (!updated) {
      const error = new Error('Add-on not found');
      error.status = 404;
      throw error;
    }

    return updated;
  },

  /**
   * Admin: Delete addon and its product associations
   */
  async deleteAddon(id) {
    await db.delete(productAddons).where(eq(productAddons.addonId, id));
    const [deleted] = await db.delete(addons).where(eq(addons.id, id)).returning();

    if (!deleted) {
      const error = new Error('Add-on not found');
      error.status = 404;
      throw error;
    }

    return deleted;
  },
};
