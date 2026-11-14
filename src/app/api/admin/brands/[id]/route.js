import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { brands, products } from '@/lib/db/schema';
import { eq, or, and, isNull } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { brandSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';
import { brandService } from '@/services/brand.service';
import { compareBrandOrder } from '@/lib/brand-order';

export async function GET(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    return NextResponse.json({ brand });
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

    const parseResult = brandSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        formatZodErrorResponse(parseResult, 'Invalid brand data'),
        { status: 400 }
      );
    }

    const { name, slug, logoUrl, sortOrder } = parseResult.data;

    const [updated] = await db
      .update(brands)
      .set({
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        logoUrl: logoUrl || null,
        sortOrder,
      })
      .where(eq(brands.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    brandService.invalidateCache();
    try {
      revalidatePath('/', 'layout');
      revalidatePath('/brands');
      revalidatePath('/products');
      revalidatePath('/search');
    } catch {}

    return NextResponse.json({ brand: updated });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const deleted = await db.transaction(async (tx) => {
      const [brand] = await tx.select().from(brands).where(eq(brands.id, id)).for('update');
      if (!brand) return null;
      await tx.update(products).set({ brandId: null, brand: null }).where(or(eq(products.brandId, id), and(isNull(products.brandId), eq(products.brand, brand.name))));
      const [removed] = await tx.delete(brands).where(eq(brands.id, id)).returning();
      return removed;
    });
    if (!deleted) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    brandService.invalidateCache();
    try {
      revalidatePath('/', 'layout');
      revalidatePath('/brands');
      revalidatePath('/products');
      revalidatePath('/search');
    } catch {}

    return NextResponse.json({ message: 'Brand deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
  }
}
