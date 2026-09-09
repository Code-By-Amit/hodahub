import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { orders, orderItems, products, orderStatusHistory } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendPaymentConfirmationEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.warn('[WEBHOOK] Invalid Razorpay webhook signature');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const razorpayOrderId = paymentEntity?.order_id || payload.payload?.order?.entity?.id;

    if (!razorpayOrderId) {
      return NextResponse.json({ received: true, note: 'No order ID in payload' });
    }

    // Find Order in DB
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.razorpayOrderId, razorpayOrderId))
      .limit(1);

    if (!order) {
      console.warn(`[WEBHOOK] Order not found for Razorpay order: ${razorpayOrderId}`);
      return NextResponse.json({ received: true, note: 'Order not found' });
    }

    // Payment Success Event
    if (event === 'payment.captured' || event === 'order.paid') {
      if (order.paymentStatus !== 'paid') {
        await db
          .update(orders)
          .set({
            status: 'confirmed',
            paymentStatus: 'paid',
            razorpayPaymentId: paymentEntity?.id || order.razorpayPaymentId,
          })
          .where(eq(orders.id, order.id));

        await db.insert(orderStatusHistory).values({
          orderId: order.id,
          status: 'confirmed',
          note: `Payment confirmed via webhook (${event}). Payment ID: ${paymentEntity?.id || 'N/A'}`,
        });

        // Send payment receipt
        sendPaymentConfirmationEmail(paymentEntity?.email || 'customer', {
          ...order,
          razorpayPaymentId: paymentEntity?.id,
        });
      }
    }

    // Payment Failed Event -> RESTORE STOCK
    if (event === 'payment.failed') {
      if (order.paymentStatus === 'pending') {
        await db
          .update(orders)
          .set({
            paymentStatus: 'failed',
          })
          .where(eq(orders.id, order.id));

        await db.insert(orderStatusHistory).values({
          orderId: order.id,
          status: order.status,
          note: `Payment failed via webhook (${event}). Stock restored.`,
        });

        // Restore Stock for failed payment
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));

        for (const item of items) {
          await db
            .update(products)
            .set({ stock: sql`${products.stock} + ${item.quantity}` })
            .where(eq(products.id, item.productId));
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Razorpay Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
