import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, products, orderStatusHistory, users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { adminOrderActionSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';
import { sendOrderStatusEmail } from '@/lib/email';

export async function POST(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const result = adminOrderActionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        formatZodErrorResponse(result, 'Invalid action data'),
        { status: 400 }
      );
    }

    const { action, status, paymentStatus, reason } = result.data;

    // Fetch order & user
    const [order] = await db
      .select({
        id: orders.id,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        totalAmount: orders.totalAmount,
        returnStatus: orders.returnStatus,
        userId: orders.userId,
        userEmail: users.email,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Helper: restore stock for order
    async function restoreOrderStock() {
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
    }

    // Process Actions
    if (action === 'approve_cancel') {
      await db
        .update(orders)
        .set({ status: 'cancelled' })
        .where(eq(orders.id, order.id));

      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        status: 'cancelled',
        note: `Cancellation approved by admin. ${reason ? `Note: ${reason}` : ''}`,
      });

      await restoreOrderStock();
      if (order.userEmail) {
        sendOrderStatusEmail({ email: order.userEmail }, order, 'cancelled', reason);
      }
      return NextResponse.json({ message: 'Cancellation approved. Stock restored!' });
    }

    if (action === 'reject_cancel') {
      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        status: order.status,
        note: `Cancellation request rejected by admin. ${reason ? `Reason: ${reason}` : ''}`,
      });
      return NextResponse.json({ message: 'Cancellation request rejected.' });
    }

    if (action === 'approve_return') {
      await db
        .update(orders)
        .set({
          returnStatus: 'approved',
          paymentStatus: 'refunded',
        })
        .where(eq(orders.id, order.id));

      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        status: order.status,
        note: `Return/Refund approved by admin. Payment status set to refunded. ${reason ? `Note: ${reason}` : ''}`,
      });

      await restoreOrderStock();
      if (order.userEmail) {
        sendOrderStatusEmail({ email: order.userEmail }, order, 'refunded', reason);
      }
      return NextResponse.json({ message: 'Return approved! Payment marked as refunded and stock restored.' });
    }

    if (action === 'reject_return') {
      await db
        .update(orders)
        .set({ returnStatus: 'rejected' })
        .where(eq(orders.id, order.id));

      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        status: order.status,
        note: `Return request rejected by admin. ${reason ? `Reason: ${reason}` : ''}`,
      });
      return NextResponse.json({ message: 'Return request rejected.' });
    }

    if (action === 'update_status' && status) {
      await db
        .update(orders)
        .set({ status })
        .where(eq(orders.id, order.id));

      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        status,
        note: `Status updated to ${status} by admin. ${reason ? `Note: ${reason}` : ''}`,
      });

      if (status === 'cancelled') {
        await restoreOrderStock();
      }

      if (order.userEmail) {
        sendOrderStatusEmail({ email: order.userEmail }, order, status, reason);
      }
      return NextResponse.json({ message: `Order status updated to ${status}` });
    }

    if (action === 'update_payment_status' && paymentStatus) {
      await db
        .update(orders)
        .set({ paymentStatus })
        .where(eq(orders.id, order.id));

      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        status: order.status,
        note: `Payment status updated to ${paymentStatus} by admin.`,
      });
      return NextResponse.json({ message: `Payment status updated to ${paymentStatus}` });
    }

    return NextResponse.json({ error: 'Invalid action configuration' }, { status: 400 });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Admin order action error:', error);
    return NextResponse.json({ error: 'Failed to execute admin order action' }, { status: 500 });
  }
}
