import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { banners } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { title, subtitle, imageUrl, bgColor, linkUrl, isActive, sortOrder } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Banner title is required' }, { status: 400 });
    }

    const [updated] = await db
      .update(banners)
      .set({
        title: title.trim(),
        subtitle: subtitle ? subtitle.trim() : null,
        imageUrl: imageUrl ? imageUrl.trim() : null,
        bgColor: bgColor ? bgColor.trim() : null,
        linkUrl: linkUrl ? linkUrl.trim() : null,
        isActive: isActive ?? true,
        sortOrder: Number(sortOrder || 0),
      })
      .where(eq(banners.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    try {
      revalidatePath('/', 'layout');
    } catch {}

    return NextResponse.json({ banner: updated, message: 'Banner updated successfully' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const [deleted] = await db
      .delete(banners)
      .where(eq(banners.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    try {
      revalidatePath('/', 'layout');
    } catch {}

    return NextResponse.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 });
  }
}
