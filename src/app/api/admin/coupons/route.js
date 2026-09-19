import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { coupons } from '@/lib/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const list = await db.select().from(coupons).orderBy(desc(coupons.createdAt)).limit(limit).offset(offset);
    const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(coupons);
    return NextResponse.json({ coupons: list, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

import { couponSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const parseResult = couponSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        formatZodErrorResponse(parseResult, 'Invalid coupon data'),
        { status: 400 }
      );
    }

    const { code, type, value, minOrderAmount, expiresAt, isActive } = body;

    const [coupon] = await db.insert(coupons).values({
      code: code.toUpperCase(), type, value: value.toString(),
      minOrderAmount: minOrderAmount ? minOrderAmount.toString() : '0',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: isActive !== false,
    }).returning();
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}
