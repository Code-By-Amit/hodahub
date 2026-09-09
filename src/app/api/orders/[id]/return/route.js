import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderStatusHistory } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { returnOrderSchema } from '@/lib/validations';

export async function POST(request, { params }) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    const result = returnOrderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Reason is required' },
        { status: 400 }
      );
    }

    const { reason } = result.data;

    // Fetch order
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, user.id)))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Return request check
    if (order.status !== 'delivered') {
      return NextResponse.json(
        { error: 'Return request can only be submitted for delivered orders' },
        { status: 400 }
      );
    }

    if (order.returnStatus !== 'none') {
      return NextResponse.json(
        { error: `Return request already submitted (Current status: ${order.returnStatus})` },
        { status: 400 }
      );
    }

    // Update return status
    await db
      .update(orders)
      .set({
        returnStatus: 'requested',
        returnReason: reason,
      })
      .where(eq(orders.id, order.id));

    // Record history
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      status: order.status,
      note: `Return/Refund requested by customer. Reason: ${reason}`,
    });

    return NextResponse.json({
      message: 'Return request submitted successfully! Admin will review your request.',
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Return order error:', error);
    return NextResponse.json({ error: 'Failed to submit return request' }, { status: 500 });
  }
}
