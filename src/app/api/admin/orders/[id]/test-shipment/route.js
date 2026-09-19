import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, products, addresses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { checkPincodeServiceability, createDelhiveryShipment } from '@/lib/delhivery';

export async function POST(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot test shipment for a cancelled order' }, { status: 400 });
    }

    // Source weight & dimensions from body (transient state) or saved order
    const packageWeight = body.packageWeight || order.packageWeight;
    const packageLength = body.packageLength || order.packageLength;
    const packageWidth = body.packageWidth || order.packageWidth;
    const packageHeight = body.packageHeight || order.packageHeight;

    if (!packageWeight || !packageLength || !packageWidth || !packageHeight) {
      return NextResponse.json(
        { error: 'Package details (weight and dimensions) are required to test shipment.' },
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

    // 1. Pincode Serviceability Check (forced staging)
    const serviceCheck = await checkPincodeServiceability(pincode, true);

    // 2. Perform Staging Shipment Dry-Run (forceStaging = true)
    const shipmentResult = await createDelhiveryShipment(
      {
        orderId: order.id,
        shippingAddress: shippingAddr,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        items,
        guestName: order.guestName,
        guestPhone: order.guestPhone,
        packageWeight,
        packageLength,
        packageWidth,
        packageHeight,
      },
      true // forceStaging = true (ALWAYS staging)
    );

    // CRITICAL: We do NOT write awbNumber, status, or history to the DB because this is ONLY a test!

    return NextResponse.json({
      success: shipmentResult.success,
      message: shipmentResult.success
        ? 'Staging dry-run test shipment succeeded!'
        : shipmentResult.error || 'Staging dry-run test shipment failed',
      testResponse: shipmentResult,
      serviceability: serviceCheck,
      isTest: true,
      environment: 'staging',
    });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Admin test shipment dry-run error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute test shipment dry-run' },
      { status: 500 }
    );
  }
}
