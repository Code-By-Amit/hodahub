import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { brands, products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { brandSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

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

    const { name, slug, logoUrl } = body;

    const [updated] = await db
      .update(brands)
      .set({
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        logoUrl: logoUrl || null,
      })
      .where(eq(brands.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    try {
      revalidatePath('/', 'layout');
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

    // Disassociate products belonging to this brand
    await db.update(products).set({ brandId: null }).where(eq(products.brandId, id));

    const [deleted] = await db.delete(brands).where(eq(brands.id, id)).returning();
    if (!deleted) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    try {
      revalidatePath('/', 'layout');
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
