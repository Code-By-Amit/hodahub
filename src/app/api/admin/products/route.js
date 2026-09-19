import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { products, categories, productAddons } from '@/lib/db/schema';
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
        codAvailable: products.codAvailable,
        productLink: products.productLink,
        ratingAvg: products.ratingAvg,
        reviewCount: products.reviewCount,
        createdAt: products.createdAt,
        categoryId: products.categoryId,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, sql`${products.categoryId} = ${categories.id}`)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(products)
      .leftJoin(categories, sql`${products.categoryId} = ${categories.id}`)
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

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { name, slug, description, price, discountPrice, categoryId, stock, images, specifications, isActive, codAvailable, productLink, addons } = body;

    if (!name || !slug || !price) {
      return NextResponse.json({ error: 'Name, slug, and price are required' }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json({ error: 'Category selection is required' }, { status: 400 });
    }

    const [product] = await db
      .insert(products)
      .values({
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        description: description || null,
        price: price.toString(),
        discountPrice: discountPrice ? discountPrice.toString() : null,
        categoryId: categoryId,
        stock: stock || 0,
        images: images || [],
        specifications: specifications || [],
        isActive: isActive !== false,
        codAvailable: codAvailable !== false,
        productLink: productLink || null,
      })
      .returning();

    if (Array.isArray(addons) && addons.length > 0) {
      await db.insert(productAddons).values(
        addons.map((a) => ({
          productId: product.id,
          name: a.name,
          price: (a.price || 0).toString(),
          isFree: a.isFree === true,
          imageUrl: a.imageUrl || null,
          isActive: a.isActive !== false,
        }))
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
