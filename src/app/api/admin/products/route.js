import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { products, categories } from '@/lib/db/schema';
import { desc, sql, ilike, or } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';


export async function GET(request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    let where = undefined;
    if (search) {
      where = or(ilike(products.name, `%${search}%`), ilike(products.slug, `%${search}%`));
    }

    const list = await db.select({
      id: products.id, name: products.name, slug: products.slug,
      price: products.price, discountPrice: products.discountPrice,
      stock: products.stock, images: products.images, specifications: products.specifications, isActive: products.isActive,
      codAvailable: products.codAvailable, productLink: products.productLink,
      ratingAvg: products.ratingAvg, reviewCount: products.reviewCount,
      createdAt: products.createdAt, categoryId: products.categoryId,
      categoryName: categories.name,
    }).from(products)
      .leftJoin(categories, sql`${products.categoryId} = ${categories.id}`)
      .where(where).orderBy(desc(products.createdAt)).limit(limit).offset(offset);

    const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(products).where(where);

    return NextResponse.json({ products: list, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { name, slug, description, price, discountPrice, categoryId, stock, images, specifications, isActive, codAvailable, productLink } = body;

    if (!name || !slug || !price) return NextResponse.json({ error: 'Name, slug, and price are required' }, { status: 400 });

    const [product] = await db.insert(products).values({
      name, slug: slug.toLowerCase().replace(/\s+/g, '-'),
      description: description || null,
      price: price.toString(),
      discountPrice: discountPrice ? discountPrice.toString() : null,
      categoryId: categoryId || null,
      stock: stock || 0,
      images: images || [],
      specifications: specifications || [],
      isActive: isActive !== false,
      codAvailable: codAvailable !== false,
      productLink: productLink || null,
    }).returning();

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
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
