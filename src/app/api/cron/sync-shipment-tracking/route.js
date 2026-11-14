import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, shipmentTrackingEvents, orderStatusHistory } from '@/lib/db/schema';
import { eq, and, asc, isNotNull, notInArray } from 'drizzle-orm';
import { trackDelhiveryShipment } from '@/lib/delhivery';
import { courierOrderStatus } from '@/lib/order-rules';

export const dynamic = 'force-dynamic';

/**
 * Map Delhivery courier status to system order status
 */
export async function GET(request) {
  try {
    // Optional CRON Secret check for security in production
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if ((!cronSecret && process.env.NODE_ENV === 'production') || cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
    }

    // Exclude terminal order statuses (delivered, cancelled)
    const activeOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          isNotNull(orders.awbNumber),
          notInArray(orders.status, ['delivered', 'cancelled'])
        )
      ).orderBy(asc(orders.courierStatusUpdatedAt), asc(orders.createdAt)).limit(100);

    if (!activeOrders || activeOrders.length === 0) {
      return NextResponse.json({
        message: 'No active shipments requiring tracking sync.',
        syncedCount: 0,
        updatedCount: 0,
      });
    }

    let updatedCount = 0;
    const syncLogs = [];

    // Process orders sequentially to avoid rate-limiting
    for (const order of activeOrders) {
      try {
        const trackingInfo = await trackDelhiveryShipment(order.awbNumber);

        if (!trackingInfo || !trackingInfo.status || trackingInfo.unavailable) continue;

        // Fetch existing tracking events for this order to prevent duplicates
        const existingEvents = await db
          .select()
          .from(shipmentTrackingEvents)
          .where(eq(shipmentTrackingEvents.orderId, order.id));

        let newEventsAdded = 0;

        // Insert new tracking scan events if not duplicate
        if (trackingInfo.events && Array.isArray(trackingInfo.events)) {
          for (const evt of trackingInfo.events) {
            const isDuplicate = existingEvents.some((ex) => {
              const statusMatch = (ex.status || '').toLowerCase() === (evt.status || '').toLowerCase();
              const locMatch = (ex.location || '').toLowerCase() === (evt.location || '').toLowerCase();
              const timeMatch =
                ex.eventTimestamp && evt.eventTimestamp
                  ? new Date(ex.eventTimestamp).getTime() === new Date(evt.eventTimestamp).getTime()
                  : true;
              return statusMatch && locMatch && timeMatch;
            });

            if (!isDuplicate) {
              await db.insert(shipmentTrackingEvents).values({
                orderId: order.id,
                status: evt.status,
                location: evt.location || null,
                remark: evt.remark || null,
                eventTimestamp: evt.eventTimestamp ? new Date(evt.eventTimestamp) : new Date(),
              });
              newEventsAdded++;
            }
          }
        }

        // Update courier status on order
        const courierStatusChanged = (order.courierStatus || '').toLowerCase() !== (trackingInfo.status || '').toLowerCase();

        if (courierStatusChanged) {
          await db
            .update(orders)
            .set({
              courierStatus: trackingInfo.status,
              courierStatusUpdatedAt: new Date(),
            })
            .where(eq(orders.id, order.id));
        }

        // Check if courier status maps to a new order-level status
        const mappedOrderStatus = courierOrderStatus(trackingInfo.status, order.status);
        let orderStatusChanged = false;

        if (mappedOrderStatus && mappedOrderStatus !== order.status) {
          orderStatusChanged = await db.transaction(async (tx) => {
          const changed = await tx
            .update(orders)
            .set({ status: mappedOrderStatus, ...(mappedOrderStatus === 'delivered' ? { deliveredAt: order.deliveredAt || new Date() } : {}) })
            .where(and(eq(orders.id, order.id), eq(orders.status, order.status), eq(orders.awbNumber, order.awbNumber))).returning({ id: orders.id });
          if (!changed.length) return false;

          await tx.insert(orderStatusHistory).values({
            orderId: order.id,
            status: mappedOrderStatus,
            note: `Status auto-updated to ${mappedOrderStatus} via background tracking sync (${trackingInfo.status})`,
          });
          return true;
          });
        }

        if (courierStatusChanged || orderStatusChanged || newEventsAdded > 0) {
          updatedCount++;
          syncLogs.push({
            orderId: order.id,
            awbNumber: order.awbNumber,
            courierStatus: trackingInfo.status,
            orderStatus: orderStatusChanged ? mappedOrderStatus : order.status,
            newEventsAdded,
          });
        }
      } catch (err) {
        console.error(`Error syncing tracking for order ${order.id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Shipment tracking sync completed for ${activeOrders.length} active shipments.`,
      activeOrdersCount: activeOrders.length,
      updatedCount,
      syncLogs,
    });
  } catch (error) {
    console.error('Shipment tracking sync cron error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync shipment tracking' },
      { status: 500 }
    );
  }
}
