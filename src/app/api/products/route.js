import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, categories } from '@/lib/db/schema';
import { eq, desc, asc, ilike, and, gte, lte, sql, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sort = searchParams.get('sort') || 'newest';
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(products.isActive, true)];

    if (category) {
      // Find category by slug
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, category))
        .limit(1);
      if (cat) {
        conditions.push(eq(products.categoryId, cat.id));
      }
    }

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.description, `%${search}%`)
        )
      );
    }

    if (minPrice) {
      conditions.push(gte(products.price, minPrice));
    }

    if (maxPrice) {
      conditions.push(lte(products.price, maxPrice));
    }

    // Sort
    let orderBy;
    switch (sort) {
      case 'price-asc':
        orderBy = asc(products.price);
        break;
      case 'price-desc':
        orderBy = desc(products.price);
        break;
      case 'best-sellers':
        orderBy = desc(products.reviewCount);
        break;
      case 'top-rated':
        orderBy = desc(products.ratingAvg);
        break;
      case 'discount':
        orderBy = desc(sql`CASE WHEN ${products.discountPrice} IS NOT NULL THEN (${products.price} - ${products.discountPrice}) / ${products.price} ELSE 0 END`);
        break;
      case 'oldest':
        orderBy = asc(products.createdAt);
        break;
      case 'newest':
      default:
        orderBy = desc(products.createdAt);
        break;
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Fetch products
    const productList = await db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Count total
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(products)
      .where(whereClause);

    // Delete productLink to ensure admin-only field is never exposed publicly
    const sanitizedProducts = productList.map((p) => {
      const { productLink, ...rest } = p;
      return rest;
    });

    return NextResponse.json({
      products: sanitizedProducts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
