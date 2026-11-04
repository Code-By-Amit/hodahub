import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { happyCustomers } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const published = await db
      .select({ id: happyCustomers.id, imageUrl: happyCustomers.imageUrl, caption: happyCustomers.caption })
      .from(happyCustomers)
      .where(eq(happyCustomers.isActive, true))
      .orderBy(asc(happyCustomers.sortOrder), asc(happyCustomers.createdAt));

    return NextResponse.json({ happyCustomers: published });
  } catch (error) {
    return handleApiError(error, request);
  }
}
