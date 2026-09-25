import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { products, categories, brands, productAddons } from '@/lib/db/schema';
import { desc, sql, ilike, or, and, eq, lte, gt } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const categoryFilter = searchParams.get('category') || '';
    const brandFilter = searchParams.get('brand') || '';
    const activeFilter = searchParams.get('active') || '';
    const stockFilter = searchParams.get('stock') || '';
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(or(ilike(products.name, `%${search}%`), ilike(products.slug, `%${search}%`)));
    }
    if (categoryFilter) {
      conditions.push(eq(products.categoryId, categoryFilter));
    }
    if (brandFilter) {
      conditions.push(eq(products.brandId, brandFilter));
    }
    if (activeFilter === 'active') {
      conditions.push(eq(products.isActive, true));
    } else if (activeFilter === 'inactive') {
      conditions.push(eq(products.isActive, false));
    }
    if (stockFilter === 'in_stock') {
      conditions.push(and(eq(products.isOutOfStock, false), gt(products.stock, 0)));
    } else if (stockFilter === 'out_of_stock') {
      conditions.push(or(eq(products.isOutOfStock, true), lte(products.stock, 0)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        discountPrice: products.discountPrice,
        stock: products.stock,
        isOutOfStock: products.isOutOfStock,
        images: products.images,
        specifications: products.specifications,
        isActive: products.isActive,
        showOnHome: products.showOnHome,
        codAvailable: products.codAvailable,
        isBestSeller: products.isBestSeller,
        unitsSold: products.unitsSold,
        productLink: products.productLink,
        ratingAvg: products.ratingAvg,
        reviewCount: products.reviewCount,
        createdAt: products.createdAt,
        categoryId: products.categoryId,
        categoryName: categories.name,
        brand: products.brand,
        brandId: products.brandId,
        brandName: brands.name,
      })
      .from(products)
      .leftJoin(categories, sql`${products.categoryId} = ${categories.id}`)
      .leftJoin(brands, sql`${products.brandId} = ${brands.id}`)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(products)
      .leftJoin(categories, sql`${products.categoryId} = ${categories.id}`)
      .leftJoin(brands, sql`${products.brandId} = ${brands.id}`)
      .where(where);

    return NextResponse.json({
      products: list,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    console.error('Fetch products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

import { productSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const parseResult = productSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        formatZodErrorResponse(parseResult, 'Invalid product data'),
        { status: 400 }
      );
    }

    const { name, slug, description, brand, price, discountPrice, categoryId, brandId, stock, isOutOfStock, images, specifications, isActive, showOnHome, codAvailable, isBestSeller, productLink, addonIds, addonLinks } = body;

    const numStock = Number(stock || 0);
    const [product] = await db
      .insert(products)
      .values({
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        description: description || null,
        brand: brand ? brand.trim() : null,
        price: price.toString(),
        discountPrice: discountPrice ? discountPrice.toString() : null,
        categoryId: categoryId,
        brandId: brandId || null,
        stock: numStock,
        isOutOfStock: isOutOfStock !== undefined ? Boolean(isOutOfStock) : numStock <= 0,
        images: images || [],
        specifications: specifications || [],
        isActive: isActive !== false,
        showOnHome: showOnHome !== false,
        codAvailable: codAvailable !== false,
        isBestSeller: Boolean(isBestSeller),
        productLink: productLink || null,
      })
      .returning();

    const linksToProcess = Array.isArray(addonLinks)
      ? addonLinks
      : Array.isArray(addonIds)
      ? addonIds.map((aid) => ({ addonId: aid }))
      : [];

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
            productId: product.id,
            addonId,
            priceOverride,
            isFreeOverride,
          };
        })
      );
    }

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/products');
      revalidatePath('/categories');
    } catch {}

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    console.error('Create product error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
  }
}
