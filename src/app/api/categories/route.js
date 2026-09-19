import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories, categoryRelations } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { buildCategoryTree } from '@/lib/category-tree';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.name));

    const allRelations = await db
      .select()
      .from(categoryRelations);

    const tree = buildCategoryTree(allCategories, allRelations);

    return NextResponse.json({
      categories: tree.rootCategories,
      allCategories: tree.allCategories,
    });
  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
