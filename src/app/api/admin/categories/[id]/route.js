import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const [cat] = await db.update(categories).set({
      ...(body.name && { name: body.name }),
      ...(body.slug && { slug: body.slug.toLowerCase().replace(/\s+/g, '-') }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
      ...(body.parentId !== undefined && { parentId: body.parentId || null }),
    }).where(eq(categories.id, id)).returning();
    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/categories');
      revalidatePath('/products');
    } catch {}

    return NextResponse.json({ category: cat });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
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
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
