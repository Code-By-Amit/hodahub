import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, products, orderStatusHistory } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';
import { canAccessOrder } from '@/lib/order-access';
import { cancelOrderSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';
import { sendOrderStatusEmail } from '@/lib/email';
import { cancelOrderAtomic } from '@/lib/order-lifecycle';

export async function POST(request, { params }) {
  try {
    const user = await getAuthUser(request);
    const accessCode = new URL(request.url).searchParams.get('accessCode');
    const { id } = await params;
    const body = await request.json();

    const result = cancelOrderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        formatZodErrorResponse(result, 'Reason is required'),
        { status: 400 }
      );
    }

    const { reason } = result.data;

    // Fetch order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order || !canAccessOrder(user, order, accessCode)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Cancellation check
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return NextResponse.json(
        { error: `Cannot cancel order in '${order.status}' status. Only pending or confirmed orders can be cancelled.` },
        { status: 400 }
      );
    }

    await cancelOrderAtomic(order.id, reason, { user, accessCode });

    // Send Status Email
    await sendOrderStatusEmail(user?.email || order.guestEmail, { ...order, status: 'cancelled' }, 'cancelled', reason);

    return NextResponse.json({
      message: 'Order cancelled successfully! Stock has been restored.',
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Cancel order error:', error);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
