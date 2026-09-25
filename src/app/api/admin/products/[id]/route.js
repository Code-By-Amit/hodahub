import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { products, productAddons, addons } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { resolveAddonPricing } from '@/lib/addon-utils';

export async function GET(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const rawLinks = await db
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
      .where(eq(productAddons.productId, id));

    const resolvedAddons = rawLinks.map((item) =>
      resolveAddonPricing(item, { priceOverride: item.priceOverride, isFreeOverride: item.isFreeOverride })
    );

    const addonLinks = rawLinks.map((item) => ({
      addonId: item.id,
      priceOverride: item.priceOverride !== null ? Number(item.priceOverride) : null,
      isFreeOverride: item.isFreeOverride,
    }));

    const addonIds = rawLinks.map((a) => a.id);

    return NextResponse.json({
      product: {
        ...product,
        addonIds,
        addonLinks,
        addons: resolvedAddons,
      },
    });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

import { productSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function PUT(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const parseResult = productSchema.partial().safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        formatZodErrorResponse(parseResult, 'Invalid product data'),
        { status: 400 }
      );
    }

    const {
      name,
      slug,
      description,
      brand,
      price,
      discountPrice,
      categoryId,
      brandId,
      stock,
      isOutOfStock,
      images,
      specifications,
      isActive,
      showOnHome,
      codAvailable,
      isBestSeller,
      productLink,
      addonIds,
      addonLinks,
    } = body;

    const [product] = await db
      .update(products)
      .set({
        ...(name && { name }),
        ...(slug && { slug: slug.toLowerCase().replace(/\s+/g, '-') }),
        ...(description !== undefined && { description }),
        ...(brand !== undefined && { brand: brand ? brand.trim() : null }),
        ...(price !== undefined && { price: price.toString() }),
        ...(discountPrice !== undefined && { discountPrice: discountPrice ? discountPrice.toString() : null }),
        ...(categoryId && { categoryId }),
        ...(brandId !== undefined && { brandId: brandId || null }),
        ...(stock !== undefined && {
          stock: Number(stock),
          isOutOfStock: isOutOfStock !== undefined ? Boolean(isOutOfStock) : Number(stock) <= 0,
        }),
        ...(isOutOfStock !== undefined && stock === undefined && { isOutOfStock: Boolean(isOutOfStock) }),
        ...(images !== undefined && { images }),
        ...(specifications !== undefined && { specifications }),
        ...(isActive !== undefined && { isActive }),
        ...(showOnHome !== undefined && { showOnHome }),
        ...(codAvailable !== undefined && { codAvailable }),
        ...(isBestSeller !== undefined && { isBestSeller: Boolean(isBestSeller) }),
        ...(productLink !== undefined && { productLink: productLink || null }),
      })
      .where(eq(products.id, id))
      .returning();

    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const linksToProcess = Array.isArray(addonLinks)
      ? addonLinks
      : Array.isArray(addonIds)
      ? addonIds.map((aid) => ({ addonId: aid }))
      : null;

    if (linksToProcess) {
      await db.delete(productAddons).where(eq(productAddons.productId, id));
      if (linksToProcess.length > 0) {
        await db.insert(productAddons).values(
          linksToProcess.map((link) => {
            const addonId = typeof link === 'string' ? link : link.addonId;
            const priceOverride =
              typeof link === 'object' && link.priceOverride !== undefined && link.priceOverride !== null && link.priceOverride !== ''
                ? link.priceOverride.toString()
                : null;
            const isFreeOverride =
              typeof link === 'object' && link.isFreeOverride !== undefined && link.isFreeOverride !== null
                ? Boolean(link.isFreeOverride)
                : null;

            return {
              productId: id,
              addonId,
              priceOverride,
              isFreeOverride,
            };
          })
        );
      }
    }

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/products');
      revalidatePath('/categories');
    } catch {}

    const rawLinks = await db
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
      .where(eq(productAddons.productId, id));

    const resolvedAddons = rawLinks.map((item) =>
      resolveAddonPricing(item, { priceOverride: item.priceOverride, isFreeOverride: item.isFreeOverride })
    );

    const updatedAddonLinks = rawLinks.map((item) => ({
      addonId: item.id,
      priceOverride: item.priceOverride !== null ? Number(item.priceOverride) : null,
      isFreeOverride: item.isFreeOverride,
    }));

    const updatedAddonIds = rawLinks.map((a) => a.id);

    return NextResponse.json({
      product: {
        ...product,
        addonIds: updatedAddonIds,
        addonLinks: updatedAddonLinks,
        addons: resolvedAddons,
      },
    });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    await db.delete(products).where(eq(products.id, id));

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/products');
      revalidatePath('/categories');
    } catch {}

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
