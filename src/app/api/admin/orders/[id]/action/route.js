import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderStatusHistory, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { adminOrderActionSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';
import { sendOrderStatusEmail } from '@/lib/email';
import { cancelOrderAtomic } from '@/lib/order-lifecycle';
import { canTransitionOrder } from '@/lib/order-rules';

export async function POST(request, { params }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const parsed = adminOrderActionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json(formatZodErrorResponse(parsed, 'Invalid action'), { status: 400 });
    const { action, status, paymentStatus, reason } = parsed.data;
    const note = (reason || '').slice(0, 1000);
    let updated;
    if (action === 'approve_cancel' || (action === 'update_status' && status === 'cancelled')) {
      updated = await cancelOrderAtomic(id, 'Cancelled by admin ' + admin.id + '. ' + note);
    } else {
      updated = await db.transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for('update');
        if (!order) return null;
        let patch = {};
        let description;
        if (action === 'approve_return' || action === 'reject_return') {
          if (order.returnStatus !== 'requested' || order.status !== 'delivered') throw new Error('Only an outstanding exchange request can be reviewed.');
          patch = { returnStatus: action === 'approve_return' ? 'approved' : 'rejected' };
          description = action === 'approve_return' ? 'Exchange approved. Awaiting goods receipt and replacement/store-credit arrangement; no refund or stock adjustment has been recorded.' : 'Exchange request rejected.';
        } else if (action === 'update_status' && status) {
          if (!canTransitionOrder(order.status, status)) throw new Error('This order status transition is not allowed.');
          if (order.paymentMethod === 'razorpay' && order.paymentStatus !== 'paid') throw new Error('Online payment must be collected before confirming or fulfilling the order.');
          if (status === 'packed') throw new Error('Use Pack Order to record package dimensions before packing.');
          if (status === 'shipped' && !order.awbNumber) throw new Error('Create or record a shipment before marking the order shipped.');
          patch = { status, ...(status === 'delivered' ? { deliveredAt: order.deliveredAt || new Date() } : {}) };
          description = 'Order status updated to ' + status + '.';
        } else if (action === 'update_payment_status' && paymentStatus) {
          if (paymentStatus === order.paymentStatus) return order;
          if (paymentStatus === 'refunded' || ['paid', 'refunded'].includes(order.paymentStatus)) throw new Error('Settled payments cannot be changed manually. Reconcile the actual provider settlement first.');
          if (paymentStatus === 'paid' && (order.paymentMethod !== 'cod' || order.status !== 'delivered')) throw new Error('Only delivered COD collections can be marked paid manually. Online payments are confirmed by the payment provider.');
          patch = { paymentStatus };
          description = 'Payment status updated to ' + paymentStatus + '.';
        } else if (action === 'reject_cancel') {
          throw new Error('Customer cancellation is immediate; there is no pending cancellation to reject.');
        } else throw new Error('Invalid action configuration.');
        const [result] = await tx.update(orders).set(patch).where(eq(orders.id, id)).returning();
        await tx.insert(orderStatusHistory).values({ orderId: id, status: result.status, note: description + ' Admin: ' + admin.id + '. ' + note });
        return result;
      });
    }
    if (!updated) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    const [owner] = updated.userId ? await db.select({ email: users.email }).from(users).where(eq(users.id, updated.userId)).limit(1) : [];
    const email = owner?.email || updated.guestEmail;
    if (email && (action === 'update_status' || action === 'approve_cancel')) await sendOrderStatusEmail(email, updated, updated.status, note);
    return NextResponse.json({ order: updated, message: action === 'approve_return' ? 'Exchange approved. Arrange receipt and replacement or store credit; no refund has been issued.' : 'Order updated.' });
  } catch (error) {
    if (['Unauthorized', 'Forbidden'].includes(error.message)) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: error.message || 'Unable to update order' }, { status: 409 });
  }
}
