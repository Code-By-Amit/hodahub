import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderStatusHistory } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const awbNumber = (body.awbNumber || '').toString().trim();
    const courierProvider = (body.courierProvider || 'delhivery').toString().trim();

    if (!awbNumber) {
      return NextResponse.json({ error: 'Tracking / AWB Number is required' }, { status: 400 });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot add tracking number to a cancelled order' }, { status: 400 });
    }

    const newStatus = ['pending', 'confirmed', 'packed'].includes(order.status) ? 'shipped' : order.status;

    const [updatedOrder] = await db
      .update(orders)
      .set({
        awbNumber,
        courierProvider,
        courierStatus: order.courierStatus || 'Manifested',
        courierStatusUpdatedAt: new Date(),
        status: newStatus,
      })
      .where(eq(orders.id, id))
      .returning();

    await db.insert(orderStatusHistory).values({
      orderId: id,
      status: newStatus,
      note: `Tracking number manually entered (AWB: ${awbNumber})`,
    });

    return NextResponse.json({
      message: 'Tracking number saved successfully!',
      order: updatedOrder,
    });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Manual AWB entry error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save tracking number' },
      { status: 500 }
    );
  }
}
