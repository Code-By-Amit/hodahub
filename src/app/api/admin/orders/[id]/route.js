import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, orderItems, orderStatusHistory, products, addresses, users, orderItemAddons } from '@/lib/db/schema';
import { eq, asc, inArray } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const rawItems = await db.select({
      id: orderItems.id, quantity: orderItems.quantity, priceAtPurchase: orderItems.priceAtPurchase,
      savedProductName: orderItems.productName, savedProductImage: orderItems.productImage,
      productName: products.name, productSlug: products.slug, productImages: products.images,
      productLink: products.productLink,
    }).from(orderItems)
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

    const history = await db.select().from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, id)).orderBy(asc(orderStatusHistory.changedAt));

    let address = null;
    if (order.addressId) {
      const [a] = await db.select().from(addresses).where(eq(addresses.id, order.addressId)).limit(1);
      address = a;
    }
    if (!address && order.shippingAddress) {
      address = order.shippingAddress;
    }

    let customer = null;
    if (order.userId) {
      const [u] = await db.select({ name: users.name, email: users.email, phone: users.phone }).from(users).where(eq(users.id, order.userId)).limit(1);
      customer = u ? { ...u, isGuest: false } : null;
    } else if (order.guestEmail || order.guestName) {
      customer = {
        name: order.guestName || 'Guest Customer',
        email: order.guestEmail,
        phone: order.guestPhone,
        isGuest: true,
      };
    }

    return NextResponse.json({ order, items, history, address, customer });
  } catch (error) {
    console.error('Fetch admin order by ID error:', error);
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to fetch admin order', details: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const { status, note } = await request.json();

    if (!status) return NextResponse.json({ error: 'Status required' }, { status: 400 });

    const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await db.insert(orderStatusHistory).values({
      orderId: id, status, note: note || null,
    });

    return NextResponse.json({ order });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
