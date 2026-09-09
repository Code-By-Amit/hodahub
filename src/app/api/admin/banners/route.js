import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { banners } from '@/lib/db/schema';
import { asc, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const allBanners = await db
      .select()
      .from(banners)
      .orderBy(asc(banners.sortOrder), desc(banners.createdAt));

    return NextResponse.json({ banners: allBanners });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { title, subtitle, imageUrl, bgColor, linkUrl, isActive, sortOrder } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Banner title is required' }, { status: 400 });
    }

    const [newBanner] = await db
      .insert(banners)
      .values({
        title: title.trim(),
        subtitle: subtitle ? subtitle.trim() : null,
        imageUrl: imageUrl ? imageUrl.trim() : null,
        bgColor: bgColor ? bgColor.trim() : '#18181b',
        linkUrl: linkUrl ? linkUrl.trim() : null,
        isActive: isActive ?? true,
        sortOrder: Number(sortOrder || 0),
      })
      .returning();

    try {
      revalidatePath('/', 'layout');
    } catch {}

    return NextResponse.json({ banner: newBanner, message: 'Banner created successfully' }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 });
  }
}
