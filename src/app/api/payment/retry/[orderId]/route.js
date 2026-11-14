import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { db } from '@/lib/db';
import { orders } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';
import { canAccessOrder } from '@/lib/order-access';

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
    const user = await getAuthUser(request);
    const accessCode = new URL(request.url).searchParams.get('accessCode');
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Fetch order from DB
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

    if (!order || !canAccessOrder(user, order, accessCode)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validate ownership
    if (!canAccessOrder(user, order, accessCode)) {
      return NextResponse.json({ error: 'Unauthorized order access' }, { status: 403 });
    }

    // Validate eligibility for payment retry
    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot pay for a cancelled order' }, { status: 400 });
    }

    if (['paid', 'refunded'].includes(order.paymentStatus)) {
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

    if (order.inventoryReleased || !order.razorpayOrderId) return NextResponse.json({ error: 'This checkout reservation has ended. Please place a new order.' }, { status: 409 });
    const rzpOrder = { id: order.razorpayOrderId };

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
