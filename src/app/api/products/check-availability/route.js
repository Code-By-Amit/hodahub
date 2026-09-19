import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const rawIds = body.productIds || body.items?.map((i) => i.productId) || [];

    const productIds = rawIds.filter((id) => typeof id === 'string' && id.trim().length > 0);

    if (!productIds.length) {
      return NextResponse.json({ results: {}, unavailableProductIds: [], unavailableItems: [] });
    }

    const dbProducts = await db
      .select({
        id: products.id,
        name: products.name,
        stock: products.stock,
        isOutOfStock: products.isOutOfStock,
        isActive: products.isActive,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    const results = {};
    const unavailableProductIds = [];
    const unavailableItems = [];

    for (const id of productIds) {
      const prod = productMap.get(id);
      if (!prod || !prod.isActive || prod.isOutOfStock || prod.stock <= 0) {
        unavailableProductIds.push(id);
        unavailableItems.push({
          id,
          name: prod ? prod.name : 'Unknown Product',
          reason: !prod
            ? 'No longer exists'
            : !prod.isActive
            ? 'No longer available'
            : 'Out of stock',
        });
        results[id] = { available: false, name: prod?.name || 'Product' };
      } else {
        results[id] = { available: true, stock: prod.stock, name: prod.name };
      }
    }

    return NextResponse.json({
      results,
      unavailableProductIds,
      unavailableItems,
    });
  } catch (error) {
    console.error('Check availability error:', error);
    return NextResponse.json(
      { error: 'Failed to check product availability' },
      { status: 500 }
    );
  }
}
