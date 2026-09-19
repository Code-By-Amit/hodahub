import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, products, users } from '@/lib/db/schema';
import { sql, eq, lte, and, ne } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAdmin(request);

    const [
      [orderStats],
      [productStats],
      [userStats],
      [revenueStats],
      [paidRevenueStats],
      lowStockProducts,
    ] = await Promise.all([
      db.select({ count: sql`count(*)::int` }).from(orders),
      db.select({ count: sql`count(*)::int` }).from(products),
      db.select({ count: sql`count(*)::int` }).from(users),
      db
        .select({ total: sql`COALESCE(SUM(${orders.totalAmount}::numeric), 0)` })
        .from(orders)
        .where(ne(orders.status, 'cancelled')),
      db
        .select({ total: sql`COALESCE(SUM(${orders.totalAmount}::numeric), 0)` })
        .from(orders)
        .where(eq(orders.paymentStatus, 'paid')),
      db
        .select({ id: products.id, name: products.name, stock: products.stock })
        .from(products)
        .where(and(eq(products.isActive, true), lte(products.stock, 5)))
        .limit(10),
    ]);

    return NextResponse.json({
      totalOrders: orderStats.count,
      totalProducts: productStats.count,
      totalUsers: userStats.count,
      totalRevenue: revenueStats.total,
      paidRevenue: paidRevenueStats.total,
      lowStockProducts,
    });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
