import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories, categoryRelations, products } from '@/lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getPrimaryBreadcrumbs } from '@/lib/category-tree';

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

    const allCategories = await db.select().from(categories);
    const allRelations = await db.select().from(categoryRelations);

    // Calculate subcategories (categories where category.id is a parent in category_relations)
    const childRelRows = allRelations.filter((r) => r.parentId === category.id);
    const childCategoryIds = childRelRows.map((r) => r.categoryId);

    let subcategories = [];
    if (childCategoryIds.length > 0) {
      subcategories = await db
        .select()
        .from(categories)
        .where(inArray(categories.id, childCategoryIds));
    }

    // Get primary breadcrumb path
    const breadcrumbs = getPrimaryBreadcrumbs(category.id, allCategories, allRelations);

    // Get products in this category
    const categoryProducts = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.categoryId, category.id),
          eq(products.isActive, true)
        )
      )
      .orderBy(desc(products.createdAt))
      .limit(50);

    return NextResponse.json({
      category,
      subcategories,
      breadcrumbs,
      products: categoryProducts,
    });
  } catch (error) {
    console.error('Category detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}
