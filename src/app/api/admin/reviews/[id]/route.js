import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews, products } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { adminReviewSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

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

export async function PUT(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });

    const result = adminReviewSchema.partial().safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        formatZodErrorResponse(result, 'Invalid review edit data'),
        { status: 400 }
      );
    }

    const { productId, userName, rating, comment, mediaUrls, isHidden } = body;
    const targetProductId = productId || review.productId;

    const [updated] = await db
      .update(reviews)
      .set({
        ...(productId && { productId }),
        ...(userName !== undefined && { userName: userName.trim() }),
        ...(rating !== undefined && { rating: rating ? Number(rating) : null }),
        ...(comment !== undefined && { comment: comment ? comment.trim() : null }),
        ...(mediaUrls !== undefined && { mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [] }),
        ...(isHidden !== undefined && { isHidden: Boolean(isHidden) }),
      })
      .where(eq(reviews.id, id))
      .returning();

    await recalculateProductRating(targetProductId);
    if (review.productId && review.productId !== targetProductId) {
      await recalculateProductRating(review.productId);
    }

    return NextResponse.json({ review: updated, message: 'Review updated successfully!' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    console.error('Update review error:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [updated] = await db
      .update(reviews)
      .set({ isHidden: !review.isHidden })
      .where(eq(reviews.id, id))
      .returning();

    await recalculateProductRating(review.productId);

    return NextResponse.json({ review: updated });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.delete(reviews).where(eq(reviews.id, id));
    await recalculateProductRating(review.productId);

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
