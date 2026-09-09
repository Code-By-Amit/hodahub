import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews, users, products as productsTable } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Find product by slug
    const [product] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.slug, slug))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const reviewList = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        mediaUrls: reviews.mediaUrls,
        createdAt: reviews.createdAt,
        userName: users.name,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(and(eq(reviews.productId, product.id), eq(reviews.isHidden, false)))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(reviews)
      .where(and(eq(reviews.productId, product.id), eq(reviews.isHidden, false)));

    return NextResponse.json({
      reviews: reviewList,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (error) {
    console.error('Reviews GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Please login to review' }, { status: 401 });
    }

    const { slug } = await params;
    const { rating, comment, mediaUrls } = await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    // Find product
    const [product] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.slug, slug))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if already reviewed
    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.productId, product.id), eq(reviews.userId, user.id)))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'You already reviewed this product' }, { status: 409 });
    }

    // Create review
    const [newReview] = await db
      .insert(reviews)
      .values({
        productId: product.id,
        userId: user.id,
        rating,
        comment: comment?.trim() || null,
        mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
      })
      .returning();

    // Update product rating
    const [stats] = await db
      .select({
        avg: sql`ROUND(AVG(${reviews.rating})::numeric, 2)`,
        count: sql`count(*)::int`,
      })
      .from(reviews)
      .where(and(eq(reviews.productId, product.id), eq(reviews.isHidden, false)));

    await db
      .update(productsTable)
      .set({
        ratingAvg: stats.avg || '0',
        reviewCount: stats.count || 0,
      })
      .where(eq(productsTable.id, product.id));

    return NextResponse.json({ review: newReview }, { status: 201 });
  } catch (error) {
    console.error('Reviews POST error:', error);
    return NextResponse.json({ error: 'Failed to add review' }, { status: 500 });
  }
}
