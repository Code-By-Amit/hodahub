import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, orderStatusHistory, products, addresses, users } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const items = await db.select({
      id: orderItems.id, quantity: orderItems.quantity, priceAtPurchase: orderItems.priceAtPurchase,
      productName: products.name, productSlug: products.slug, productImage: products.images,
      productLink: products.productLink,
    }).from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));

    const history = await db.select().from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, id)).orderBy(asc(orderStatusHistory.changedAt));

    let address = null;
    if (order.addressId) {
      const [a] = await db.select().from(addresses).where(eq(addresses.id, order.addressId)).limit(1);
      address = a;
    }

    let customer = null;
    if (order.userId) {
      const [u] = await db.select({ name: users.name, email: users.email, phone: users.phone }).from(users).where(eq(users.id, order.userId)).limit(1);
      customer = u;
    }

    return NextResponse.json({ order, items, history, address, customer });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const { status, note } = await request.json();

    if (!status) return NextResponse.json({ error: 'Status required' }, { status: 400 });

    const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.insert(orderStatusHistory).values({
      orderId: id, status, note: note || null,
    });

    return NextResponse.json({ order });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
