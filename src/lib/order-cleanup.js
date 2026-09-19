import { db } from '@/lib/db';
import { orders, orderItems, products, orderStatusHistory, storeSettings } from '@/lib/db/schema';
import { eq, and, lte, sql } from 'drizzle-orm';

/**
 * Cleanup abandoned pending orders older than the configured expiration threshold.
 * Restores product stock and updates isOutOfStock status.
 */
export async function cleanupAbandonedOrders() {
  try {
    const [settings] = await db.select().from(storeSettings).limit(1);
    const expirationMinutes = settings?.orderExpirationMinutes || 15;
    const cutoffTime = new Date(Date.now() - expirationMinutes * 60 * 1000);

    // Find pending unpaid orders created before cutoffTime
    const expiredOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, 'pending'),
          eq(orders.paymentStatus, 'pending'),
          lte(orders.createdAt, cutoffTime)
        )
      );

    let cleanedCount = 0;

    for (const order of expiredOrders) {
      // Update order status to cancelled
      await db
        .update(orders)
        .set({
          status: 'cancelled',
          cancelReason: `Order payment timed out after ${expirationMinutes} minutes of inactivity.`,
        })
        .where(eq(orders.id, order.id));

      // Record history entry
      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        status: 'cancelled',
        note: `Auto-cancelled due to payment expiration (${expirationMinutes} min timeout). Reserved stock restored.`,
      });

      // Restore stock for items
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

      cleanedCount++;
    }

    return { success: true, cleanedCount, expirationMinutes };
  } catch (error) {
    console.error('Abandoned order cleanup error:', error);
    return { success: false, error: error.message };
  }
}
