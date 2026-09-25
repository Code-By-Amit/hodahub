import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews, products, users } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { adminReviewSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const offset = (page - 1) * limit;

    const list = await db
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
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(reviews);

    return NextResponse.json({
      reviews: list,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Fetch admin reviews error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const result = adminReviewSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        formatZodErrorResponse(result, 'Invalid review data'),
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
