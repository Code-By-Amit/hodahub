import { db } from '@/lib/db';
import { coupons } from '@/lib/db/schema';
import { desc, sql, eq } from 'drizzle-orm';

export const couponService = {
  /**
   * Admin: List coupons with parallel list and count queries
   */
  async getAdminCoupons({ page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    const [list, [{ count }]] = await Promise.all([
      db.select().from(coupons).orderBy(desc(coupons.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql`count(*)::int` }).from(coupons),
    ]);

    return {
      coupons: list,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    };
  },

  /**
   * Admin: Create coupon
   */
  async createCoupon({ code, type, value, minOrderAmount, expiresAt, isActive }) {
    const [coupon] = await db
      .insert(coupons)
      .values({
        code: code.toUpperCase(),
        type,
        value: value.toString(),
        minOrderAmount: minOrderAmount ? minOrderAmount.toString() : '0',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== false,
      })
      .returning();

    return coupon;
  },

  /**
   * Admin: Update or toggle coupon
   */
  async updateCoupon(id, patch) {
    const updateData = {};
    if (patch.code) updateData.code = patch.code.toUpperCase();
    if (patch.type) updateData.type = patch.type;
    if (patch.value !== undefined) updateData.value = patch.value.toString();
    if (patch.minOrderAmount !== undefined) {
      updateData.minOrderAmount = patch.minOrderAmount ? patch.minOrderAmount.toString() : '0';
    }
    if (patch.expiresAt !== undefined) {
      updateData.expiresAt = patch.expiresAt ? new Date(patch.expiresAt) : null;
    }
    if (patch.isActive !== undefined) {
      updateData.isActive = Boolean(patch.isActive);
    }

    const [coupon] = await db
      .update(coupons)
      .set(updateData)
      .where(eq(coupons.id, id))
      .returning();

    if (!coupon) {
      const error = new Error('Coupon not found');
      error.status = 404;
      throw error;
    }

    return coupon;
  },

  /**
   * Admin: Delete coupon
   */
  async deleteCoupon(id) {
    const [deleted] = await db.delete(coupons).where(eq(coupons.id, id)).returning();
    if (!deleted) {
      const error = new Error('Coupon not found');
      error.status = 404;
      throw error;
    }
    return { success: true };
  },
};
