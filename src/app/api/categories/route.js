import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { asc, isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.name));

    // Build hierarchy
    const rootCategories = allCategories.filter((c) => !c.parentId);
    const childMap = {};
    allCategories.forEach((c) => {
      if (c.parentId) {
        if (!childMap[c.parentId]) childMap[c.parentId] = [];
        childMap[c.parentId].push(c);
      }
    });

    const categoriesWithChildren = rootCategories.map((cat) => ({
      ...cat,
      children: childMap[cat.id] || [],
    }));

    return NextResponse.json({ categories: categoriesWithChildren });
  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
