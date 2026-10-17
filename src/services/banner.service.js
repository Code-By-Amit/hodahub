import { db } from '@/lib/db';
import { banners } from '@/lib/db/schema';
import { desc, asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export const bannerService = {
  /**
   * Storefront: Fetch active promotional banners ordered by sortOrder
   */
  async getActiveBanners() {
    return db
      .select()
      .from(banners)
      .where(eq(banners.isActive, true))
      .orderBy(asc(banners.sortOrder), desc(banners.createdAt));
  },

  /**
   * Admin: List all banners
   */
  async getAdminBanners() {
    return db
      .select()
      .from(banners)
      .orderBy(asc(banners.sortOrder), desc(banners.createdAt));
  },

  /**
   * Admin: Create a banner
   */
  async createBanner({ title, subtitle, imageUrl, bgColor, linkUrl, isActive, sortOrder }) {
    const [banner] = await db
      .insert(banners)
      .values({
        title: title.trim(),
        subtitle: subtitle ? subtitle.trim() : null,
        imageUrl: imageUrl ? imageUrl.trim() : null,
        bgColor: bgColor ? bgColor.trim() : null,
        linkUrl: linkUrl ? linkUrl.trim() : null,
        isActive: isActive !== false,
        sortOrder: Number(sortOrder || 0),
      })
      .returning();

    try {
      revalidatePath('/', 'layout');
    } catch {}

    return banner;
  },

  /**
   * Admin: Update or toggle banner
   */
  async updateBanner(id, patch) {
    const updateData = {};
    if (patch.title !== undefined) updateData.title = patch.title.trim();
    if (patch.subtitle !== undefined) updateData.subtitle = patch.subtitle ? patch.subtitle.trim() : null;
    if (patch.imageUrl !== undefined) updateData.imageUrl = patch.imageUrl ? patch.imageUrl.trim() : null;
    if (patch.bgColor !== undefined) updateData.bgColor = patch.bgColor ? patch.bgColor.trim() : null;
    if (patch.linkUrl !== undefined) updateData.linkUrl = patch.linkUrl ? patch.linkUrl.trim() : null;
    if (patch.isActive !== undefined) updateData.isActive = Boolean(patch.isActive);
    if (patch.sortOrder !== undefined) updateData.sortOrder = Number(patch.sortOrder || 0);

    const [updated] = await db
      .update(banners)
      .set(updateData)
      .where(eq(banners.id, id))
      .returning();

    if (!updated) {
      const error = new Error('Banner not found');
      error.status = 404;
      throw error;
    }

    try {
      revalidatePath('/', 'layout');
    } catch {}

    return updated;
  },

  /**
   * Admin: Delete banner
   */
  async deleteBanner(id) {
    const [deleted] = await db.delete(banners).where(eq(banners.id, id)).returning();
    if (!deleted) {
      const error = new Error('Banner not found');
      error.status = 404;
      throw error;
    }

    try {
      revalidatePath('/', 'layout');
    } catch {}

    return deleted;
  },
};
