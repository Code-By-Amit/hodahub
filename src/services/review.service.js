import { db } from '@/lib/db';
import { reviews, products, users } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

async function recalculateProductRating(productId) {
  if (!productId) return;
  const [stats] = await db
    .select({
      avg: sql`COALESCE(ROUND(AVG(CASE WHEN ${reviews.rating} IS NOT NULL THEN ${reviews.rating} END)::numeric, 2), 0)`,
      count: sql`count(*)::int`,
    })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.isHidden, false)));

  await db
    .update(products)
    .set({
      ratingAvg: stats.avg || '0',
      reviewCount: stats.count || 0,
    })
    .where(eq(products.id, productId));
}

export const reviewService = {
  /**
   * Admin: List reviews with parallel data and count queries
   */
  async getAdminReviews({ page = 1, limit = 15 } = {}) {
    const offset = (page - 1) * limit;

    const [list, [{ count }]] = await Promise.all([
      db
        .select({
          id: reviews.id,
          productId: reviews.productId,
          productName: products.name,
          userId: reviews.userId,
          userName: sql`COALESCE(${reviews.userName}, ${users.name}, 'Customer')`,
          userEmail: users.email,
          rating: reviews.rating,
          comment: reviews.comment,
          imageUrl: reviews.imageUrl,
          mediaUrls: reviews.mediaUrls,
          isHidden: reviews.isHidden,
          createdAt: reviews.createdAt,
        })
        .from(reviews)
        .leftJoin(products, eq(reviews.productId, products.id))
        .leftJoin(users, eq(reviews.userId, users.id))
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql`count(*)::int` }).from(reviews),
    ]);

    return {
      reviews: list,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    };
  },

  /**
   * Admin: Create a customer review directly
   */
  async createAdminReview({ productId, userName, rating, comment, mediaUrls }) {
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      const error = new Error('Target product not found');
      error.status = 404;
      throw error;
    }

    const [newReview] = await db
      .insert(reviews)
      .values({
        productId,
        userId: null,
        userName: userName.trim(),
        rating: rating || null,
        comment: comment?.trim() || null,
        mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
        isHidden: false,
      })
      .returning();

    await recalculateProductRating(productId);

    return newReview;
  },

  /**
   * Admin: Update review contents and visibility
   */
  async updateReview(id, patch) {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    if (!review) {
      const error = new Error('Review not found');
      error.status = 404;
      throw error;
    }

    const targetProductId = patch.productId || review.productId;

    const [updated] = await db
      .update(reviews)
      .set({
        ...(patch.productId && { productId: patch.productId }),
        ...(patch.userName !== undefined && { userName: patch.userName.trim() }),
        ...(patch.rating !== undefined && { rating: patch.rating ? Number(patch.rating) : null }),
        ...(patch.comment !== undefined && { comment: patch.comment ? patch.comment.trim() : null }),
        ...(patch.mediaUrls !== undefined && { mediaUrls: Array.isArray(patch.mediaUrls) ? patch.mediaUrls : [] }),
        ...(patch.isHidden !== undefined && { isHidden: Boolean(patch.isHidden) }),
      })
      .where(eq(reviews.id, id))
      .returning();

    await recalculateProductRating(targetProductId);
    if (review.productId && review.productId !== targetProductId) {
      await recalculateProductRating(review.productId);
    }

    return updated;
  },

  /**
   * Admin: Toggle review hidden/visible state
   */
  async toggleVisibility(id) {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    if (!review) {
      const error = new Error('Review not found');
      error.status = 404;
      throw error;
    }

    const [updated] = await db
      .update(reviews)
      .set({ isHidden: !review.isHidden })
      .where(eq(reviews.id, id))
      .returning();

    await recalculateProductRating(review.productId);

    return updated;
  },

  /**
   * Admin: Delete review and recalculate rating
   */
  async deleteReview(id) {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    if (!review) {
      const error = new Error('Review not found');
      error.status = 404;
      throw error;
    }

    await db.delete(reviews).where(eq(reviews.id, id));
    await recalculateProductRating(review.productId);

    return { success: true };
  },
};
