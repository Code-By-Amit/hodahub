import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;
if (razorpayKeyId && razorpayKeySecret) {
  razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });
}

export async function POST(request, { params }) {
  try {
    const user = await requireAuth(request);
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Fetch order from DB
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validate ownership
    if (order.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized order access' }, { status: 403 });
    }

    // Validate eligibility for payment retry
    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot pay for a cancelled order' }, { status: 400 });
    }

    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'This order is already paid' }, { status: 400 });
    }

    if (order.paymentMethod !== 'razorpay') {
      return NextResponse.json({ error: 'Payment retry is only available for online Razorpay orders' }, { status: 400 });
    }

    if (!razorpay) {
      return NextResponse.json(
        { error: 'Razorpay API keys not configured on server' },
        { status: 500 }
      );
    }

    const amountInPaise = Math.round(Number(order.totalAmount) * 100);

    // Create a fresh Razorpay order for the existing order amount
    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `retry_${order.id.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
    });

    // Update existing DB order with new razorpayOrderId (reusing same order row, no stock decrement)
    await db
      .update(orders)
      .set({ razorpayOrderId: rzpOrder.id })
      .where(eq(orders.id, order.id));

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,
      totalAmount: order.totalAmount,
      key: razorpayKeyId,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Please login to retry payment' }, { status: 401 });
    }
    console.error('Payment retry error:', error);
    return NextResponse.json({ error: error.message || 'Failed to initiate payment retry' }, { status: 500 });
  }
}
