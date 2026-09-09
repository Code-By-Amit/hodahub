import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { wishlistItems, products } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        discountPrice: products.discountPrice,
        images: products.images,
        ratingAvg: products.ratingAvg,
        reviewCount: products.reviewCount,
        stock: products.stock,
        codAvailable: products.codAvailable,
        wishlistCreatedAt: wishlistItems.createdAt,
      })
      .from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .where(eq(wishlistItems.userId, auth.id))
      .orderBy(desc(wishlistItems.createdAt));

    return NextResponse.json({ items: rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { productId, productIds } = body;

    // Handle single item add
    if (productId) {
      await db
        .insert(wishlistItems)
        .values({
          userId: auth.id,
          productId,
        })
        .onConflictDoNothing({
          target: [wishlistItems.userId, wishlistItems.productId],
        });
      return NextResponse.json({ success: true });
    }

    // Handle bulk guest merge
    if (Array.isArray(productIds) && productIds.length > 0) {
      const recordsToInsert = productIds
        .filter(Boolean)
        .map((pid) => ({
          userId: auth.id,
          productId: pid,
        }));

      if (recordsToInsert.length > 0) {
        await db
          .insert(wishlistItems)
          .values(recordsToInsert)
          .onConflictDoNothing({
            target: [wishlistItems.userId, wishlistItems.productId],
          });
      }
      return NextResponse.json({ success: true, count: recordsToInsert.length });
    }

    return NextResponse.json({ error: 'Missing productId or productIds' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
