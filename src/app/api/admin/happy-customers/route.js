import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { happyCustomers } from '@/lib/db/schema';
import { asc, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { happyCustomerSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';
import { extractCloudinaryPublicId } from '@/lib/happy-customers';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const list = await db
      .select()
      .from(happyCustomers)
      .orderBy(asc(happyCustomers.sortOrder), desc(happyCustomers.createdAt));

    return NextResponse.json({ happyCustomers: list });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch customer screenshots' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const parseResult = happyCustomerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(formatZodErrorResponse(parseResult, 'Invalid screenshot data'), { status: 400 });
    }

    const { imageUrl, caption, isActive, sortOrder } = parseResult.data;

    const [created] = await db
      .insert(happyCustomers)
      .values({
        imageUrl,
        cloudinaryAssetId: extractCloudinaryPublicId(imageUrl),
        caption: caption ? caption.trim() : null,
        isActive: isActive ?? true,
        sortOrder: Number(sortOrder || 0),
        updatedAt: new Date(),
      })
      .returning();

    try {
      revalidatePath('/', 'layout');
    } catch {}

    return NextResponse.json(
      { happyCustomer: created, message: 'Customer screenshot added' },
      { status: 201 }
    );
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Create happy customer error:', error);
    return NextResponse.json({ error: 'Failed to create customer screenshot' }, { status: 500 });
  }
}
