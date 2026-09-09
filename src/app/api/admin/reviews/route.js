import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews, users, products } from '@/lib/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const list = await db.select({
      id: reviews.id, rating: reviews.rating, comment: reviews.comment,
      mediaUrls: reviews.mediaUrls,
      isHidden: reviews.isHidden, createdAt: reviews.createdAt,
      userName: users.name, userEmail: users.email,
      productName: products.name, productSlug: products.slug,
    }).from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(products, eq(reviews.productId, products.id))
      .orderBy(desc(reviews.createdAt)).limit(limit).offset(offset);

    const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(reviews);
    return NextResponse.json({ reviews: list, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
