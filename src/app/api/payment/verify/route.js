import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { orders, orderItems, orderStatusHistory, products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { sendOrderConfirmationEmail, sendPaymentConfirmationEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } =
      await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return NextResponse.json({ error: 'Missing required payment parameters' }, { status: 400 });
    }

    // Verify HMAC Signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Find Order
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Update Order Payment Status
    await db
      .update(orders)
      .set({
        status: 'confirmed',
        paymentStatus: 'paid',
        razorpayPaymentId: razorpay_payment_id,
      })
      .where(eq(orders.id, order.id));

    // Record Status History
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      status: 'confirmed',
      note: `Payment verified via client signature. Payment ID: ${razorpay_payment_id}`,
    });

    // Fetch items for confirmation email
    const items = await db
      .select({
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        priceAtPurchase: orderItems.priceAtPurchase,
        name: products.name,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, order.id));

    // Send Confirmation Emails
    sendOrderConfirmationEmail(user.email, order, items);
    sendPaymentConfirmationEmail(user.email, { ...order, razorpayPaymentId: razorpay_payment_id });

    return NextResponse.json({
      orderId: order.id,
      message: 'Payment verified successfully! Order confirmed.',
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Payment verify error:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
