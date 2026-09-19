import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, products, orderStatusHistory } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { cancelOrderSchema } from '@/lib/validations';
import { sendOrderStatusEmail } from '@/lib/email';

export async function POST(request, { params }) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    const result = cancelOrderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Reason is required' },
        { status: 400 }
      );
    }

    const { reason } = result.data;

    // Fetch order
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, user.id)))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Cancellation check
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return NextResponse.json(
        { error: `Cannot cancel order in '${order.status}' status. Only pending or confirmed orders can be cancelled.` },
        { status: 400 }
      );
    }

    // Update order status
    await db
      .update(orders)
      .set({
        status: 'cancelled',
        cancelReason: reason,
      })
      .where(eq(orders.id, order.id));

    // Record history
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      status: 'cancelled',
      note: `Cancelled by customer. Reason: ${reason}`,
    });

    // RESTORE STOCK BACK TO PRODUCTS
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    for (const item of items) {
      if (item.productId) {
        await db
          .update(products)
          .set({
            stock: sql`${products.stock} + ${item.quantity}`,
            isOutOfStock: sql`CASE WHEN ${products.stock} + ${item.quantity} > 0 THEN false ELSE ${products.isOutOfStock} END`,
          })
          .where(eq(products.id, item.productId));
      }
    }

    // Send Status Email
    sendOrderStatusEmail(user.email, { ...order, status: 'cancelled' }, 'cancelled', reason);

    return NextResponse.json({
      message: 'Order cancelled successfully! Stock has been restored.',
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Cancel order error:', error);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
