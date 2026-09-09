import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { coupons } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const [coupon] = await db.update(coupons).set({
      ...(body.code && { code: body.code.toUpperCase() }),
      ...(body.type && { type: body.type }),
      ...(body.value !== undefined && { value: body.value.toString() }),
      ...(body.minOrderAmount !== undefined && { minOrderAmount: body.minOrderAmount ? body.minOrderAmount.toString() : '0' }),
      ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    }).where(eq(coupons.id, id)).returning();
    if (!coupon) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ coupon });
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
    await db.delete(coupons).where(eq(coupons.id, id));
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
