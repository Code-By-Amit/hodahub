import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { categories, categoryRelations, products } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { checkCategoryCycle } from '@/lib/category-tree';

export async function PUT(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { name, slug, imageUrl, parentIds } = body;

    if (parentIds !== undefined) {
      const normalizedParentIds = Array.isArray(parentIds)
        ? parentIds.filter(Boolean)
        : [];

      // Cycle prevention check
      const allRelations = await db.select().from(categoryRelations);
      const cycleCheck = checkCategoryCycle(id, normalizedParentIds, allRelations);
      if (cycleCheck.hasCycle) {
        return NextResponse.json({ error: cycleCheck.reason }, { status: 400 });
      }

      // Clear existing relations and re-insert
      await db.delete(categoryRelations).where(eq(categoryRelations.categoryId, id));
      if (normalizedParentIds.length > 0) {
        await db.insert(categoryRelations).values(
          normalizedParentIds.map((pId) => ({
            categoryId: id,
            parentId: pId,
          }))
        );
      }
    }

    const [cat] = await db
      .update(categories)
      .set({
        ...(name && { name }),
        ...(slug && { slug: slug.toLowerCase().replace(/\s+/g, '-') }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
      })
      .where(eq(categories.id, id))
      .returning();

    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/categories');
      revalidatePath('/products');
    } catch {}

    const updatedRelations = await db
      .select()
      .from(categoryRelations)
      .where(eq(categoryRelations.categoryId, id));

    return NextResponse.json({
      category: {
        ...cat,
        parentIds: updatedRelations.map((r) => r.parentId),
      },
    });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    console.error('Update category error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    // Check if category has products assigned
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(products)
      .where(eq(products.categoryId, id));

    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete category: ${count} product(s) are assigned to it. Please reassign or delete the products first.` },
        { status: 400 }
      );
    }

    await db.delete(categories).where(eq(categories.id, id));

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/categories');
      revalidatePath('/products');
    } catch {}

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Cannot delete category: Product(s) are assigned to it. Please reassign or delete the products first.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to delete category' }, { status: 500 });
  }
}
