import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, orderStatusHistory, products, storeSettings } from '@/lib/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';
import {
  CLAIMABLE_PAYMENT_STATUSES,
  describeOrphanedPayment,
  isPaymentAlreadySettled,
  isValidRazorpaySignature,
  nextOrderStatus,
} from '@/lib/payment-claim';
import { sendOrderConfirmationEmail, sendPaymentConfirmationEmail, sendAdminNewOrderEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } =
      await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing required payment parameters' }, { status: 400 });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('[PAYMENT VERIFY] RAZORPAY_KEY_SECRET is not configured');
      return NextResponse.json({ error: 'Payment verification is unavailable' }, { status: 500 });
    }

    // Verify HMAC Signature
    const signatureMatches = isValidRazorpaySignature({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
    });

    if (!signatureMatches) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Resolve the order from the signed Razorpay order id. The client-supplied orderId is never
    // trusted to choose which order gets confirmed — otherwise a signature for a cheap order
    // could be replayed against a different, more expensive one.
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.razorpayOrderId, razorpay_order_id))
      .limit(1);

    if (!order) {
      // A payment retry replaces orders.razorpay_order_id, so a payment completed in an older
      // checkout tab verifies correctly but matches no row. Fail closed, but record it — the
      // customer has paid and the order is still pending.
      console.error(
        describeOrphanedPayment({
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          claimedOrderId: orderId,
          reason: 'no order row carries this razorpay_order_id',
        })
      );
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (orderId && order.id !== orderId) {
      console.error(
        describeOrphanedPayment({
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          claimedOrderId: orderId,
          reason: `claimed order ${order.id} does not match`,
        })
      );
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This order has been cancelled. Please contact support.' },
        { status: 400 }
      );
    }

    const alreadyProcessedResponse = NextResponse.json({
      orderId: order.id,
      accessCode: order.accessCode,
      message: 'Payment already verified! Order confirmed.',
    });

    if (isPaymentAlreadySettled(order)) {
      return alreadyProcessedResponse;
    }

    const isCod = order.paymentMethod === 'cod';
    const confirmedStatus = nextOrderStatus(order);

    // Atomic claim: exactly one concurrent request may transition this order out of unpaid.
    const [updated] = await db
      .update(orders)
      .set(
        isCod
          ? {
              status: confirmedStatus,
              paymentStatus: 'pending',
              codAdvancePaymentId: razorpay_payment_id,
              codAdvancePaidAt: new Date(),
            }
          : {
              status: confirmedStatus,
              paymentStatus: 'paid',
              razorpayPaymentId: razorpay_payment_id,
            }
      )
      .where(
        and(
          eq(orders.id, order.id),
          isCod
            ? isNull(orders.codAdvancePaidAt)
            : inArray(orders.paymentStatus, CLAIMABLE_PAYMENT_STATUSES)
        )
      )
      .returning();

    if (!updated) {
      return alreadyProcessedResponse;
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
