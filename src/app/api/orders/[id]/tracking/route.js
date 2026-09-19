import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, shipmentTrackingEvents } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { trackDelhiveryShipment } from '@/lib/delhivery';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.awbNumber) {
      return NextResponse.json({
        status: order.status || 'Pending',
        courierProvider: order.courierProvider || 'delhivery',
        awbNumber: null,
        events: [],
      });
    }

    // Live track fetch
    const trackingInfo = await trackDelhiveryShipment(order.awbNumber);

    // Update courier status on order
    if (trackingInfo.status && trackingInfo.status !== order.courierStatus) {
      await db
        .update(orders)
        .set({
          courierStatus: trackingInfo.status,
          courierStatusUpdatedAt: new Date(),
        })
        .where(eq(orders.id, id));
    }

    // Cache new tracking events
    if (Array.isArray(trackingInfo.events) && trackingInfo.events.length > 0) {
      const existingEvents = await db
        .select()
        .from(shipmentTrackingEvents)
        .where(eq(shipmentTrackingEvents.orderId, id));

      for (const evt of trackingInfo.events) {
        const isDuplicate = existingEvents.some(
          (e) =>
            e.status === evt.status &&
            e.location === evt.location &&
            new Date(e.eventTimestamp).getTime() === new Date(evt.eventTimestamp).getTime()
        );

        if (!isDuplicate) {
          await db.insert(shipmentTrackingEvents).values({
            orderId: id,
            status: evt.status,
            location: evt.location || null,
            remark: evt.remark || null,
            eventTimestamp: evt.eventTimestamp ? new Date(evt.eventTimestamp) : new Date(),
          });
        }
      }
    }

    // Retrieve cached timeline
    const cachedEvents = await db
      .select()
      .from(shipmentTrackingEvents)
      .where(eq(shipmentTrackingEvents.orderId, id))
      .orderBy(asc(shipmentTrackingEvents.eventTimestamp));

    return NextResponse.json({
      courierProvider: order.courierProvider || 'delhivery',
      awbNumber: order.awbNumber,
      courierStatus: trackingInfo.status || order.courierStatus || 'In Transit',
      events: cachedEvents.length > 0 ? cachedEvents : trackingInfo.events || [],
    });
  } catch (error) {
    console.error('Tracking API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipment tracking details' },
      { status: 500 }
    );
  }
}
