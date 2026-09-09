import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, orderStatusHistory, products, addresses } from '@/lib/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const [order] = await db.select().from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order || order.userId !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get items with product info
    const items = await db
      .select({
        id: orderItems.id,
        quantity: orderItems.quantity,
        priceAtPurchase: orderItems.priceAtPurchase,
        productName: products.name,
        productSlug: products.slug,
        productImage: products.images,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));

    // Get status history
    const history = await db.select().from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, id))
      .orderBy(asc(orderStatusHistory.changedAt));

    // Get address
    let address = null;
    if (order.addressId) {
      const [addr] = await db.select().from(addresses).where(eq(addresses.id, order.addressId)).limit(1);
      address = addr;
    }

    return NextResponse.json({ order, items, history, address });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}
