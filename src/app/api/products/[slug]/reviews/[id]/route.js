import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews, products as productsTable } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { reviewSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function PUT(request, { params }) {
  try {
    const user = await requireAuth(request);
    const { slug, id } = await params;
    const body = await request.json();

    const result = reviewSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        formatZodErrorResponse(result, 'Invalid review data'),
        { status: 400 }
      );
    }

    const { rating, comment, imageUrl } = result.data;

    // Check review author
    const [existing] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, id), eq(reviews.userId, user.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Review not found or unauthorized' }, { status: 404 });
    }

    const [updated] = await db
      .update(reviews)
      .set({
        rating,
        comment: comment || null,
        imageUrl: imageUrl || null,
      })
      .where(eq(reviews.id, id))
      .returning();

    // Recalculate rating
    const [stats] = await db
      .select({
        avg: sql`ROUND(AVG(${reviews.rating})::numeric, 2)`,
        count: sql`count(*)::int`,
      })
      .from(reviews)
      .where(and(eq(reviews.productId, existing.productId), eq(reviews.isHidden, false)));

    await db
      .update(productsTable)
      .set({
        ratingAvg: stats.avg || '0',
        reviewCount: stats.count || 0,
      })
      .where(eq(productsTable.id, existing.productId));

    return NextResponse.json({ review: updated, message: 'Review updated successfully!' });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const [existing] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Check ownership or admin
    if (existing.userId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(reviews).where(eq(reviews.id, id));

    // Recalculate rating
    const [stats] = await db
      .select({
        avg: sql`ROUND(AVG(${reviews.rating})::numeric, 2)`,
        count: sql`count(*)::int`,
      })
      .from(reviews)
      .where(and(eq(reviews.productId, existing.productId), eq(reviews.isHidden, false)));

    await db
      .update(productsTable)
      .set({
        ratingAvg: stats.avg || '0',
        reviewCount: stats.count || 0,
      })
      .where(eq(productsTable.id, existing.productId));

    return NextResponse.json({ message: 'Review deleted successfully!' });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
