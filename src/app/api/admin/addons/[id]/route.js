import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addons, productAddons } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { productAddonSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function GET(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const [addon] = await db
      .select({
        id: addons.id,
        name: addons.name,
        price: addons.price,
        isFree: addons.isFree,
        imageUrl: addons.imageUrl,
        isActive: addons.isActive,
        createdAt: addons.createdAt,
        updatedAt: addons.updatedAt,
        productCount: sql`count(${productAddons.productId})::int`,
      })
      .from(addons)
      .leftJoin(productAddons, eq(addons.id, productAddons.addonId))
      .where(eq(addons.id, id))
      .groupBy(addons.id)
      .limit(1);

    if (!addon) return NextResponse.json({ error: 'Add-on not found' }, { status: 404 });

    return NextResponse.json({ addon });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to fetch add-on' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const parseResult = productAddonSchema.partial().safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        formatZodErrorResponse(parseResult, 'Invalid add-on data'),
        { status: 400 }
      );
    }

    const { name, price, isFree, imageUrl, isActive } = parseResult.data;

    const [updatedAddon] = await db
      .update(addons)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(price !== undefined && { price: isFree ? '0.00' : (price || 0).toString() }),
        ...(isFree !== undefined && { isFree: isFree === true }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(isActive !== undefined && { isActive: isActive !== false }),
        updatedAt: new Date(),
      })
      .where(eq(addons.id, id))
      .returning();

    if (!updatedAddon) return NextResponse.json({ error: 'Add-on not found' }, { status: 404 });

    return NextResponse.json({ addon: updatedAddon });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to update add-on' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    // Delete product links first, then delete library addon
    await db.delete(productAddons).where(eq(productAddons.addonId, id));
    const [deleted] = await db.delete(addons).where(eq(addons.id, id)).returning();

    if (!deleted) return NextResponse.json({ error: 'Add-on not found' }, { status: 404 });

    return NextResponse.json({ message: 'Add-on deleted successfully' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to delete add-on' }, { status: 500 });
  }
}
