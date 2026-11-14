import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isValidRazorpaySignature } from '@/lib/payment-claim';
import { confirmPaymentAtomic } from '@/lib/order-lifecycle';
import { notifyPaidOrder } from '@/lib/order-notifications';

export async function POST(request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = await request.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return NextResponse.json({ error: 'Missing payment parameters' }, { status: 400 });
    if (!process.env.RAZORPAY_KEY_SECRET) return NextResponse.json({ error: 'Payment verification unavailable' }, { status: 503 });
    if (!isValidRazorpaySignature({ razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature, keySecret: process.env.RAZORPAY_KEY_SECRET })) return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    const [order] = await db.select().from(orders).where(eq(orders.razorpayOrderId, razorpay_order_id)).limit(1);
    if (!order || (orderId && order.id !== orderId)) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    const razorpay = new Razorpay({ key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id || Number(payment.amount) !== Math.round(Number(order.totalAmount) * 100) || payment.currency !== 'INR') return NextResponse.json({ error: 'Payment does not match this order' }, { status: 409 });
    if (payment.status !== 'captured') return NextResponse.json({ error: 'Payment is still processing. Check your order before attempting another payment.' }, { status: 409 });
    const result = await confirmPaymentAtomic(razorpay_order_id, razorpay_payment_id, 'Captured payment confirmed through server verification.');
    if (result.outcome === 'reconciliation') return NextResponse.json({ error: 'Your payment needs support review. Do not pay again; contact us with your order number.' }, { status: 409 });
    if (result.outcome === 'missing') return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (result.outcome === 'confirmed') await notifyPaidOrder(result.order);
    return NextResponse.json({ orderId: order.id, accessCode: order.accessCode, message: 'Payment confirmed.' });
  } catch (error) {
    console.error('Payment verification failed:', error);
    return NextResponse.json({ error: 'Unable to verify payment. Check your order before paying again.' }, { status: 500 });
  }
}
