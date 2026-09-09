import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { banners } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const activeBanners = await db
      .select()
      .from(banners)
      .where(eq(banners.isActive, true))
      .orderBy(asc(banners.sortOrder), asc(banners.createdAt));

    return NextResponse.json({ banners: activeBanners });
  } catch (error) {
    console.error('Fetch active banners error:', error);
    return NextResponse.json({ banners: [] });
  }
}
