import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories, products } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Get subcategories
    const subcategories = await db
      .select()
      .from(categories)
      .where(eq(categories.parentId, category.id));

    // Get products in category
    const categoryProducts = await db
      .select()
      .from(products)
      .where(and(eq(products.categoryId, category.id), eq(products.isActive, true)))
      .orderBy(desc(products.createdAt))
      .limit(20);

    return NextResponse.json({
      category,
      subcategories,
      products: categoryProducts,
    });
  } catch (error) {
    console.error('Category detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}
