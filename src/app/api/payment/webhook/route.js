import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { confirmPaymentAtomic, recordPaymentFailure } from '@/lib/order-lifecycle';
import { notifyPaidOrder } from '@/lib/order-notifications';

export async function POST(request) {
  try {
    const raw = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 });
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (!/^[a-f0-9]{64}$/.test(signature) || !crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    const payload = JSON.parse(raw);
    const payment = payload.payload?.payment?.entity;
    const gatewayOrder = payload.payload?.order?.entity;
    const gatewayId = payment?.order_id || gatewayOrder?.id;
    if (!gatewayId) return NextResponse.json({ received: true });
    if (payload.event === 'payment.failed') {
      await recordPaymentFailure(gatewayId);
      return NextResponse.json({ received: true });
    }
    if (!['payment.captured', 'order.paid'].includes(payload.event)) return NextResponse.json({ received: true });
    const [order] = await db.select().from(orders).where(eq(orders.razorpayOrderId, gatewayId)).limit(1);
    if (!order) {
      console.error('[PAYMENT RECONCILIATION] Unknown gateway order', gatewayId);
      return NextResponse.json({ error: 'Unmatched payment; retry required' }, { status: 409 });
    }
    const amount = payment?.amount ?? gatewayOrder?.amount_paid;
    const currency = payment?.currency ?? gatewayOrder?.currency;
    if (Number(amount) !== Math.round(Number(order.totalAmount) * 100) || currency !== 'INR') return NextResponse.json({ error: 'Payment amount or currency mismatch' }, { status: 409 });
    const result = await confirmPaymentAtomic(gatewayId, payment?.id, 'Captured payment confirmed by signed webhook.');
    if (result.outcome === 'confirmed') await notifyPaidOrder(result.order);
    return NextResponse.json({ received: true, reconciliationRequired: result.outcome === 'reconciliation' });
  } catch (error) {
    console.error('Payment webhook failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
