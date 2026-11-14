import { db } from '@/lib/db';
import { orders, orderItems, products, orderStatusHistory } from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { canAccessOrder } from '@/lib/order-access';

// All inventory releases serialize on the order row and commit with the status change.
export async function cancelOrderAtomic(orderId, reason, { userId, expiredBefore, user, accessCode } = {}) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');
    if (!order || (userId && order.userId !== userId)) return null;
    if ((user || accessCode) && !canAccessOrder(user, order, accessCode)) return null;
    if (order.status === 'cancelled') return order;
    if (!['pending', 'confirmed'].includes(order.status)) throw new Error('This order can no longer be cancelled.');
    if (expiredBefore && (order.paymentMethod !== 'razorpay' || order.status !== 'pending' || !['pending', 'failed'].includes(order.paymentStatus) || new Date(order.createdAt) > expiredBefore)) return null;
    // Older failed orders were already released by the former webhook implementation.
    if (!order.inventoryReleased) {
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      for (const item of items) {
        if (!item.productId) continue;
        await tx.update(products).set({ stock: sql`${products.stock} + ${item.quantity}`, unitsSold: sql`GREATEST(0, ${products.unitsSold} - ${item.quantity})`, isOutOfStock: false }).where(eq(products.id, item.productId));
      }
    }
    const [updated] = await tx.update(orders).set({ status: 'cancelled', cancelReason: reason, inventoryReleased: true }).where(eq(orders.id, order.id)).returning();
    await tx.insert(orderStatusHistory).values({ orderId: order.id, status: 'cancelled', note: reason });
    return updated;
  });
}

export async function recordPaymentFailure(razorpayOrderId) {
  return db.transaction(async (tx) => {
    const [updated] = await tx.update(orders).set({ paymentStatus: 'failed' }).where(and(eq(orders.razorpayOrderId, razorpayOrderId), eq(orders.status, 'pending'), eq(orders.paymentStatus, 'pending'))).returning();
    if (updated) await tx.insert(orderStatusHistory).values({ orderId: updated.id, status: updated.status, note: 'Payment attempt failed. Stock remains reserved until checkout expiry or cancellation.' });
    return updated;
  });
}

export async function confirmPaymentAtomic(razorpayOrderId, paymentId, note) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.razorpayOrderId, razorpayOrderId)).for('update');
    if (!order) return { outcome: 'missing' };
    if (order.status === 'cancelled' || order.inventoryReleased || order.paymentStatus === 'refunded') {
      if (paymentId && order.razorpayPaymentId !== paymentId) {
        await tx.update(orders).set({ razorpayPaymentId: paymentId }).where(eq(orders.id, order.id));
        await tx.insert(orderStatusHistory).values({ orderId: order.id, status: order.status, note: `PAYMENT RECONCILIATION REQUIRED: capture ${paymentId} arrived after cancellation, stock release, or refund. Fulfillment was not reactivated.` });
      }
      return { outcome: 'reconciliation', order };
    }
    if (order.paymentStatus === 'paid') return { outcome: 'settled', order };
    const status = order.status === 'pending' ? 'confirmed' : order.status;
    const [updated] = await tx.update(orders).set({ status, paymentStatus: 'paid', razorpayPaymentId: paymentId || order.razorpayPaymentId }).where(and(eq(orders.id, order.id), inArray(orders.paymentStatus, ['pending', 'failed']))).returning();
    await tx.insert(orderStatusHistory).values({ orderId: order.id, status, note });
    return { outcome: 'confirmed', order: updated };
  });
}
