import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { happyCustomers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { happyCustomerUpdateSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';
import { extractCloudinaryPublicId } from '@/lib/happy-customers';
import { destroyCloudinaryAsset } from '@/lib/cloudinary';

export async function PUT(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const parseResult = happyCustomerUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(formatZodErrorResponse(parseResult, 'Invalid screenshot data'), { status: 400 });
    }

    const payload = parseResult.data;
    const [existing] = await db.select().from(happyCustomers).where(eq(happyCustomers.id, id));
    if (!existing) {
      return NextResponse.json({ error: 'Customer screenshot not found' }, { status: 404 });
    }

    const nextImageUrl = payload.imageUrl !== undefined ? payload.imageUrl : existing.imageUrl;
    const imageChanged = nextImageUrl !== existing.imageUrl;

    const [updated] = await db
      .update(happyCustomers)
      .set({
        imageUrl: nextImageUrl,
        cloudinaryAssetId: imageChanged ? extractCloudinaryPublicId(nextImageUrl) : existing.cloudinaryAssetId,
        caption:
          payload.caption !== undefined ? (payload.caption ? payload.caption.trim() : null) : existing.caption,
        isActive: payload.isActive ?? existing.isActive,
        sortOrder: payload.sortOrder !== undefined ? Number(payload.sortOrder || 0) : existing.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(happyCustomers.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Customer screenshot not found' }, { status: 404 });
    }

    if (imageChanged) {
      await destroyCloudinaryAsset(existing.cloudinaryAssetId || extractCloudinaryPublicId(existing.imageUrl));
    }

    try {
      revalidatePath('/', 'layout');
    } catch {}

    return NextResponse.json({ happyCustomer: updated, message: 'Customer screenshot updated' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Update happy customer error:', error);
    return NextResponse.json({ error: 'Failed to update customer screenshot' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const [deleted] = await db
      .delete(happyCustomers)
      .where(eq(happyCustomers.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Customer screenshot not found' }, { status: 404 });
    }

    await destroyCloudinaryAsset(deleted.cloudinaryAssetId || extractCloudinaryPublicId(deleted.imageUrl));

    try {
      revalidatePath('/', 'layout');
    } catch {}

    return NextResponse.json({ message: 'Customer screenshot deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Delete happy customer error:', error);
    return NextResponse.json({ error: 'Failed to delete customer screenshot' }, { status: 500 });
  }
}
