import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, categories, productAddons, addons } from '@/lib/db/schema';
import { eq, or, and } from 'drizzle-orm';

import { resolveAddonPricing } from '@/lib/addon-utils';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const decodedSlug = decodeURIComponent(slug);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    const whereCondition = isUuid
      ? or(eq(products.id, slug), eq(products.slug, slug))
      : or(eq(products.slug, slug), eq(products.slug, decodedSlug));

    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        discountPrice: products.discountPrice,
        categoryId: products.categoryId,
        stock: products.stock,
        isOutOfStock: products.isOutOfStock,
        images: products.images,
        ratingAvg: products.ratingAvg,
        reviewCount: products.reviewCount,
        isActive: products.isActive,
        codAvailable: products.codAvailable,
        specifications: products.specifications,
        createdAt: products.createdAt,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(whereCondition)
      .limit(1);

    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Fetch active add-ons for product from shared library with per-product link overrides
    const rawAddonLinks = await db
      .select({
        id: addons.id,
        name: addons.name,
        price: addons.price,
        isFree: addons.isFree,
        imageUrl: addons.imageUrl,
        isActive: addons.isActive,
        priceOverride: productAddons.priceOverride,
        isFreeOverride: productAddons.isFreeOverride,
      })
      .from(productAddons)
      .innerJoin(addons, eq(productAddons.addonId, addons.id))
      .where(and(eq(productAddons.productId, product.id), eq(addons.isActive, true)));

    const resolvedAddons = rawAddonLinks.map((item) =>
      resolveAddonPricing(item, { priceOverride: item.priceOverride, isFreeOverride: item.isFreeOverride })
    );

    const isUnavailable = product.isOutOfStock || product.stock <= 0;

    return NextResponse.json({
      product: {
        ...product,
        isOutOfStock: isUnavailable,
        addons: resolvedAddons || [],
      },
    });
  } catch (error) {
    console.error('Product detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
