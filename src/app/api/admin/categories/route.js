import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { categories, categoryRelations } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { checkCategoryCycle } from '@/lib/category-tree';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const list = await db.select().from(categories).orderBy(asc(categories.name));
    const relations = await db.select().from(categoryRelations);

    const parentMap = {};
    relations.forEach((rel) => {
      if (!parentMap[rel.categoryId]) parentMap[rel.categoryId] = [];
      parentMap[rel.categoryId].push(rel.parentId);
    });

    const categoriesWithParents = list.map((cat) => ({
      ...cat,
      parentIds: parentMap[cat.id] || [],
    }));

    return NextResponse.json({ categories: categoriesWithParents });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

import { categorySchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const parseResult = categorySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        formatZodErrorResponse(parseResult, 'Invalid category data'),
        { status: 400 }
      );
    }

    const { name, slug, imageUrl, parentIds } = body;

    const normalizedParentIds = Array.isArray(parentIds)
      ? parentIds.filter(Boolean)
      : [];

    // Cycle check before creation
    const allRelations = await db.select().from(categoryRelations);
    const cycleCheck = checkCategoryCycle(null, normalizedParentIds, allRelations);
    if (cycleCheck.hasCycle) {
      return NextResponse.json({ error: cycleCheck.reason }, { status: 400 });
    }

    const [category] = await db
      .insert(categories)
      .values({
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        imageUrl: imageUrl || null,
      })
      .returning();

    if (normalizedParentIds.length > 0) {
      await db.insert(categoryRelations).values(
        normalizedParentIds.map((pId) => ({
          categoryId: category.id,
          parentId: pId,
        }))
      );
    }

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/categories');
      revalidatePath('/products');
    } catch {}

    return NextResponse.json(
      { category: { ...category, parentIds: normalizedParentIds } },
      { status: 201 }
    );
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    console.error('Create category error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 500 });
  }
}
