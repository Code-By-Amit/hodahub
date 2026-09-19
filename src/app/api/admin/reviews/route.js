import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews, products } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { adminReviewSchema } from '@/lib/validations';

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const result = adminReviewSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Invalid review data' },
        { status: 400 }
      );
    }

    const { productId, userName, rating, comment, mediaUrls } = result.data;

    // Check if product exists
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: 'Target product not found' }, { status: 404 });
    }

    // Insert admin-published customer review
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

    // Recalculate product rating average over non-null ratings
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

    return NextResponse.json(
      { review: newReview, message: 'Review published successfully by admin!' },
      { status: 201 }
    );
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Admin create review error:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
