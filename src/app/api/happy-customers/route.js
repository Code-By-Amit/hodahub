import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { happyCustomers } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const published = await db
      .select({ id: happyCustomers.id, imageUrl: happyCustomers.imageUrl, caption: happyCustomers.caption })
      .from(happyCustomers)
      .where(eq(happyCustomers.isActive, true))
      .orderBy(asc(happyCustomers.sortOrder), asc(happyCustomers.createdAt));

    return NextResponse.json({ happyCustomers: published });
  } catch (error) {
    console.error('Fetch public happy customers error:', error);
    return NextResponse.json({ happyCustomers: [] });
  }
}
