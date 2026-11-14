import { db } from '@/lib/db';
import { orders, storeSettings } from '@/lib/db/schema';
import { and, eq, inArray, lte } from 'drizzle-orm';
import { cancelOrderAtomic } from '@/lib/order-lifecycle';

export async function cleanupAbandonedOrders() {
  try {
    const [settings] = await db.select().from(storeSettings).limit(1);
    const expirationMinutes = settings?.orderExpirationMinutes || 15;
    const cutoffTime = new Date(Date.now() - expirationMinutes * 60000);
    const expired = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.paymentMethod, 'razorpay'), eq(orders.status, 'pending'), inArray(orders.paymentStatus, ['pending', 'failed']), lte(orders.createdAt, cutoffTime))).limit(100);
    let cleanedCount = 0;
    for (const order of expired) {
      const cancelled = await cancelOrderAtomic(order.id, 'Online payment expired after ' + expirationMinutes + ' minutes.', { expiredBefore: cutoffTime });
      if (cancelled) cleanedCount++;
    }
    return { success: true, cleanedCount, expirationMinutes };
  } catch (error) {
    console.error('Abandoned order cleanup failed:', error);
    return { success: false, error: 'Order cleanup failed' };
  }
}
