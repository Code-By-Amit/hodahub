import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, orderStatusHistory, products, addresses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { checkPincodeServiceability, createDelhiveryShipment } from '@/lib/delhivery';

export async function POST(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot create shipment for a cancelled order' }, { status: 400 });
    }

    // Block shipment creation if order is not packed with real weight & dimensions
    const hasPackageDetails =
      order.packageWeight &&
      parseFloat(order.packageWeight) > 0 &&
      order.packageLength &&
      parseFloat(order.packageLength) > 0 &&
      order.packageWidth &&
      parseFloat(order.packageWidth) > 0 &&
      order.packageHeight &&
      parseFloat(order.packageHeight) > 0;

    if (!hasPackageDetails) {
      return NextResponse.json(
        { error: 'Order must be packed with weight and dimensions before creating a shipment.' },
        { status: 400 }
      );
    }

    const items = await db
      .select({
        id: orderItems.id,
        quantity: orderItems.quantity,
        priceAtPurchase: orderItems.priceAtPurchase,
        productName: products.name,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));

    let shippingAddr = order.shippingAddress;
    if (!shippingAddr && order.addressId) {
      const [addr] = await db.select().from(addresses).where(eq(addresses.id, order.addressId)).limit(1);
      shippingAddr = addr;
    }

    const pincode = shippingAddr?.pincode;

    // 1. Pincode Serviceability Check
    const serviceCheck = await checkPincodeServiceability(pincode);
    if (!serviceCheck.serviceable) {
      return NextResponse.json(
        { error: `Pincode ${pincode || 'address'} is not serviceable by Delhivery. Please arrange manual delivery.` },
        { status: 400 }
      );
    }

    // 2. Shipment Creation Call using real weight and dimensions
    const shipmentResult = await createDelhiveryShipment({
      orderId: order.id,
      shippingAddress: shippingAddr,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      items,
      guestName: order.guestName,
      guestPhone: order.guestPhone,
      packageWeight: order.packageWeight,
      packageLength: order.packageLength,
      packageWidth: order.packageWidth,
      packageHeight: order.packageHeight,
    });

    if (!shipmentResult.success) {
      return NextResponse.json(
        { error: shipmentResult.error || 'Failed to create shipment with Delhivery' },
        { status: 400 }
      );
    }

    const awbNumber = shipmentResult.awbNumber;
    const courierStatus = shipmentResult.status || 'Manifested';

    // 3. Update Order record
    const [updatedOrder] = await db
      .update(orders)
      .set({
        courierProvider: 'delhivery',
        awbNumber,
        courierStatus,
        courierStatusUpdatedAt: new Date(),
        status: 'shipped',
      })
      .where(eq(orders.id, id))
      .returning();

    // 4. Sync with internal order status history
    await db.insert(orderStatusHistory).values({
      orderId: id,
      status: 'shipped',
      note: `Shipment created via Delhivery (AWB: ${awbNumber}) [Env: ${shipmentResult.environment || 'staging'}]`,
    });

    return NextResponse.json({
      message: 'Shipment created successfully!',
      order: updatedOrder,
      shipment: shipmentResult,
    });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Admin shipment creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create shipment' },
      { status: 500 }
    );
  }
}
