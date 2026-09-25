import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, orderStatusHistory, products, addresses, orderItemAddons } from '@/lib/db/schema';
import { eq, desc, asc, inArray } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = await getAuthUser(request);
    const { id } = await params;

    const [order] = await db.select().from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const accessCode = searchParams.get('accessCode');

    // Security check: enforce authorization for both registered and guest orders
    if (order.userId) {
      if (!user || (user.id !== order.userId && user.role !== 'admin')) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
    } else {
      // Guest order protection: require matching accessCode token, matching email session, or admin role
      const isAuthorizedGuest =
        (accessCode && order.accessCode && accessCode === order.accessCode) ||
        (user && user.email === order.guestEmail) ||
        (user && user.role === 'admin');

      if (!isAuthorizedGuest) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
    }

    // Get items with product info (prioritize saved orderItems values with product join fallbacks)
    const rawItems = await db
      .select({
        id: orderItems.id,
        quantity: orderItems.quantity,
        priceAtPurchase: orderItems.priceAtPurchase,
        savedProductName: orderItems.productName,
        savedProductImage: orderItems.productImage,
        productName: products.name,
        productSlug: products.slug,
        productImages: products.images,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));

    const itemIds = rawItems.map((i) => i.id);
    let allAddons = [];
    if (itemIds.length > 0) {
      try {
        allAddons = await db.select().from(orderItemAddons).where(inArray(orderItemAddons.orderItemId, itemIds));
      } catch (addonErr) {
        console.warn('Fallback fetching orderItemAddons without quantity:', addonErr.message);
        try {
          allAddons = await db.select({
            id: orderItemAddons.id,
            orderItemId: orderItemAddons.orderItemId,
            addonId: orderItemAddons.addonId,
            name: orderItemAddons.name,
            priceAtPurchase: orderItemAddons.priceAtPurchase,
            imageUrl: orderItemAddons.imageUrl,
            createdAt: orderItemAddons.createdAt,
          }).from(orderItemAddons).where(inArray(orderItemAddons.orderItemId, itemIds));
          allAddons = allAddons.map((a) => ({ ...a, quantity: 1 }));
        } catch {
          allAddons = [];
        }
      }
    }

    const items = rawItems.map((item) => {
      const img = item.savedProductImage || (Array.isArray(item.productImages) && item.productImages.length > 0 ? item.productImages[0] : null);
      return {
        ...item,
        productName: item.savedProductName || item.productName || 'Product',
        productImage: img,
        addons: allAddons.filter((a) => a.orderItemId === item.id) || [],
      };
    });

    // Get status history
    const history = await db.select().from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, id))
      .orderBy(asc(orderStatusHistory.changedAt));

    // Get address (with fallback to order.shippingAddress)
    let address = null;
    if (order.addressId) {
      const [addr] = await db.select().from(addresses).where(eq(addresses.id, order.addressId)).limit(1);
      address = addr;
    }
    if (!address && order.shippingAddress) {
      address = order.shippingAddress;
    }

    return NextResponse.json({ order, items, history, address });
  } catch (error) {
    console.error('Fetch customer order by ID error:', error);
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to fetch order', details: error.message }, { status: 500 });
  }
}
