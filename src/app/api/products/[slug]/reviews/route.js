import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews, users, products as productsTable } from '@/lib/db/schema';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';

function getProductWhereCondition(slug) {
  const rawSlug = slug || '';
  const decodedSlug = decodeURIComponent(rawSlug);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawSlug);
  return isUuid
    ? or(eq(productsTable.id, rawSlug), eq(productsTable.slug, rawSlug))
    : or(eq(productsTable.slug, rawSlug), eq(productsTable.slug, decodedSlug));
}

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Find product by slug or id
    const [product] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(getProductWhereCondition(slug))
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
        userName: sql`COALESCE(${reviews.userName}, ${users.name}, 'Anonymous Customer')`,
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
    const body = await request.json();

    const { rating, comment, mediaUrls } = body;
    if (!rating && (!comment || !comment.trim())) {
      return NextResponse.json({ error: 'Please provide either a star rating or a review comment' }, { status: 400 });
    }
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    let sanitizedMediaUrls = [];
    if (Array.isArray(mediaUrls)) {
      sanitizedMediaUrls = mediaUrls
        .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url.trim()))
        .slice(0, 5);
    }

    // Find product
    const [product] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(getProductWhereCondition(slug))
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
        userName: user.name || null,
        rating: rating || null,
        comment: comment?.trim() || null,
        mediaUrls: sanitizedMediaUrls,
      })
      .returning();

    // Update product rating (averaging only non-null ratings)
    const [stats] = await db
      .select({
        avg: sql`COALESCE(ROUND(AVG(CASE WHEN ${reviews.rating} IS NOT NULL THEN ${reviews.rating} END)::numeric, 2), 0)`,
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
