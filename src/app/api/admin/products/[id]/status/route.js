import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { productStatusToggleSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function PATCH(request, { params }) {
  try {
    await requireAdmin(request);
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const result = productStatusToggleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        formatZodErrorResponse(result, 'Invalid status payload'),
        { status: 400 }
      );
    }

    const updateFields = {};
    if (typeof body.isActive === 'boolean') {
      updateFields.isActive = body.isActive;
    }
    if (typeof body.isOutOfStock === 'boolean') {
      updateFields.isOutOfStock = body.isOutOfStock;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No valid status fields provided' }, { status: 400 });
    }

    const [updatedProduct] = await db
      .update(products)
      .set(updateFields)
      .where(eq(products.id, id))
      .returning();

    if (!updatedProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/products');
      revalidatePath('/categories');
    } catch {}

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Update product status error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update product status' }, { status: 500 });
  }
}
