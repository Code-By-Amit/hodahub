import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { coupons } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function POST(request) {
  try {
    const { code, subtotal } = await request.json();

    if (!code) return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });

    const [coupon] = await db.select().from(coupons)
      .where(and(eq(coupons.code, code.toUpperCase()), eq(coupons.isActive, true)))
      .limit(1);

    if (!coupon) return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 });

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 });
    }

    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
      return NextResponse.json({
        error: `Minimum order amount is ₹${coupon.minOrderAmount}`
      }, { status: 400 });
    }

    const discountValue = coupon.type === 'percent'
      ? (subtotal * Number(coupon.value)) / 100
      : Math.min(Number(coupon.value), subtotal);

    return NextResponse.json({ coupon, discount: discountValue });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}
