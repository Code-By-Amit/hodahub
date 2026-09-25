import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { brands } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { brandSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const list = await db.select().from(brands).orderBy(asc(brands.name));
    return NextResponse.json({ brands: list });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const parseResult = brandSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        formatZodErrorResponse(parseResult, 'Invalid brand data'),
        { status: 400 }
      );
    }

    const { name, slug, logoUrl } = body;

    const [brand] = await db
      .insert(brands)
      .values({
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        logoUrl: logoUrl || null,
      })
      .returning();

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/products');
      revalidatePath('/search');
    } catch {}

    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    console.error('Create brand error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create brand' }, { status: 500 });
  }
}
