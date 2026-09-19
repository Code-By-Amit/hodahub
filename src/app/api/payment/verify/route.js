import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { orders, orderItems, orderStatusHistory, products, storeSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';
import { sendOrderConfirmationEmail, sendPaymentConfirmationEmail, sendAdminNewOrderEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
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

    const isCod = order.paymentMethod === 'cod';

    // Update Order Payment Status
    if (isCod) {
      await db
        .update(orders)
        .set({
          status: 'confirmed',
          paymentStatus: 'pending',
          codAdvancePaymentId: razorpay_payment_id,
          codAdvancePaidAt: new Date(),
        })
        .where(eq(orders.id, order.id));
    } else {
      await db
        .update(orders)
        .set({
          status: 'confirmed',
          paymentStatus: 'paid',
          razorpayPaymentId: razorpay_payment_id,
        })
        .where(eq(orders.id, order.id));
    }

    // Record Status History
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      status: 'confirmed',
      note: isCod
        ? `COD advance payment of ₹${order.codAdvanceAmount || '99.00'} verified online. Payment ID: ${razorpay_payment_id}. Cash balance due on delivery.`
        : `Payment verified via client signature. Payment ID: ${razorpay_payment_id}`,
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

    const recipientEmail = user?.email || order.guestEmail;
    if (recipientEmail) {
      sendOrderConfirmationEmail(recipientEmail, order, items);
      if (!isCod) {
        sendPaymentConfirmationEmail(recipientEmail, { ...order, razorpayPaymentId: razorpay_payment_id });
      }
    }

    // Admin email
    const [settings] = await db.select().from(storeSettings).limit(1);
    if (settings?.contactEmail) {
      sendAdminNewOrderEmail(settings.contactEmail, order, items);
    }

    return NextResponse.json({
      orderId: order.id,
      accessCode: order.accessCode,
      message: isCod ? 'COD advance payment verified! Order confirmed.' : 'Payment verified successfully! Order confirmed.',
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Payment verify error:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
