import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, users } from '@/lib/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const offset = (page - 1) * limit;

    let where = undefined;
    if (status === 'payment_pending') {
      where = eq(orders.paymentStatus, 'pending');
    } else if (status) {
      where = eq(orders.status, status);
    }

    const list = await db.select({
      id: orders.id, status: orders.status, paymentStatus: orders.paymentStatus,
      paymentMethod: orders.paymentMethod, totalAmount: orders.totalAmount,
      createdAt: orders.createdAt, couponCode: orders.couponCode,
      guestName: orders.guestName, guestEmail: orders.guestEmail, guestPhone: orders.guestPhone,
      userName: users.name, userEmail: users.email, userPhone: users.phone,
    }).from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(where).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);

    const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(orders).where(where);
    return NextResponse.json({ orders: list, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
