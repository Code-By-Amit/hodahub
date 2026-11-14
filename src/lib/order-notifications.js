import { db } from '@/lib/db';
import { orderItems, users, storeSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendOrderConfirmationEmail, sendPaymentConfirmationEmail, sendAdminNewOrderEmail } from '@/lib/email';

export async function notifyPaidOrder(order) {
  const [items, userRows, settingsRows] = await Promise.all([
    db.select({ name: orderItems.productName, quantity: orderItems.quantity, priceAtPurchase: orderItems.priceAtPurchase }).from(orderItems).where(eq(orderItems.orderId, order.id)),
    order.userId ? db.select({ email: users.email }).from(users).where(eq(users.id, order.userId)).limit(1) : Promise.resolve([]),
    db.select().from(storeSettings).limit(1),
  ]);
  const recipient = userRows[0]?.email || order.guestEmail;
  const notifications = [];
  if (recipient) notifications.push(sendOrderConfirmationEmail(recipient, order, items, order.shippingAddress), sendPaymentConfirmationEmail(recipient, order));
  if (settingsRows[0]?.contactEmail) notifications.push(sendAdminNewOrderEmail(settingsRows[0].contactEmail, order, items));
  await Promise.allSettled(notifications);
}
