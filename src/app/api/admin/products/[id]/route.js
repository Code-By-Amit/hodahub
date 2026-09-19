import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { products, productAddons } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const addons = await db.select().from(productAddons).where(eq(productAddons.productId, id));

    return NextResponse.json({ product: { ...product, addons: addons || [] } });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { name, slug, description, price, discountPrice, categoryId, stock, images, specifications, isActive, codAvailable, productLink, addons } = body;

    if (categoryId !== undefined && !categoryId) {
      return NextResponse.json({ error: 'Category selection is required' }, { status: 400 });
    }

    const [product] = await db.update(products).set({
      ...(name && { name }),
      ...(slug && { slug: slug.toLowerCase().replace(/\s+/g, '-') }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price: price.toString() }),
      ...(discountPrice !== undefined && { discountPrice: discountPrice ? discountPrice.toString() : null }),
      ...(categoryId && { categoryId }),
      ...(stock !== undefined && { stock }),
      ...(images !== undefined && { images }),
      ...(specifications !== undefined && { specifications }),
      ...(isActive !== undefined && { isActive }),
      ...(codAvailable !== undefined && { codAvailable }),
      ...(productLink !== undefined && { productLink: productLink || null }),
    }).where(eq(products.id, id)).returning();

    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (Array.isArray(addons)) {
      await db.delete(productAddons).where(eq(productAddons.productId, id));
      if (addons.length > 0) {
        await db.insert(productAddons).values(
          addons.map((a) => ({
            productId: id,
            name: a.name,
            price: (a.price || 0).toString(),
            isFree: a.isFree === true,
            imageUrl: a.imageUrl || null,
            isActive: a.isActive !== false,
          }))
        );
      }
    }

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/products');
      revalidatePath('/categories');
    } catch {}

    const updatedAddons = await db.select().from(productAddons).where(eq(productAddons.productId, id));

    return NextResponse.json({ product: { ...product, addons: updatedAddons } });
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
