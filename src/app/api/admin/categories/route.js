import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { asc, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const list = await db.select().from(categories).orderBy(asc(categories.name));
    return NextResponse.json({ categories: list });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await requireAdmin(request);
    const { name, slug, imageUrl, parentId } = await request.json();
    if (!name || !slug) return NextResponse.json({ error: 'Name and slug required' }, { status: 400 });

    const [category] = await db.insert(categories).values({
      name, slug: slug.toLowerCase().replace(/\s+/g, '-'),
      imageUrl: imageUrl || null, parentId: parentId || null,
    }).returning();

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/categories');
      revalidatePath('/products');
    } catch {}

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
