import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderStatusHistory } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { packOrderSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function POST(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const parseResult = packOrderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        formatZodErrorResponse(parseResult, 'Invalid package details'),
        { status: 400 }
      );
    }

    const { packageWeight, packageLength, packageWidth, packageHeight } = parseResult.data;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot pack a cancelled order' }, { status: 400 });
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({
        packageWeight: packageWeight.toString(),
        packageLength: packageLength.toString(),
        packageWidth: packageWidth.toString(),
        packageHeight: packageHeight.toString(),
        packedAt: new Date(),
        status: 'packed',
      })
      .where(eq(orders.id, id))
      .returning();

    await db.insert(orderStatusHistory).values({
      orderId: id,
      status: 'packed',
      note: `Order packed: ${packageWeight} kg (${packageLength}x${packageWidth}x${packageHeight} cm)`,
    });

    return NextResponse.json({
      message: 'Order packed successfully!',
      order: updatedOrder,
    });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Admin order packing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to pack order' },
      { status: 500 }
    );
  }
}
