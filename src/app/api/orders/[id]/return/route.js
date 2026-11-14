import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderStatusHistory } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';
import { canAccessOrder } from '@/lib/order-access';
import { exchangeEligibility } from '@/lib/order-rules';
import { returnOrderSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function POST(request, { params }) {
  try {
    const user = await getAuthUser(request);
    const accessCode = new URL(request.url).searchParams.get('accessCode');
    const { id } = await params;
    const body = await request.json();

    const result = returnOrderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        formatZodErrorResponse(result, 'Reason is required'),
        { status: 400 }
      );
    }

    const { reason, evidenceUrl } = result.data;

    // Fetch order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order || !canAccessOrder(user, order, accessCode)) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const eligibilityError = exchangeEligibility(order);
    if (eligibilityError) return NextResponse.json({ error: eligibilityError }, { status: 400 });
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
        returnEvidenceUrl: evidenceUrl,
      })
      .where(eq(orders.id, order.id));

    // Record history
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      status: order.status,
      note: `Exchange requested by customer. Reason: ${reason}`,
    });

    return NextResponse.json({
      message: 'Exchange request submitted. Our team will review your evidence and arrange the next steps.',
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Return order error:', error);
    return NextResponse.json({ error: 'Failed to submit return request' }, { status: 500 });
  }
}
