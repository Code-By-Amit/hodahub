import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addons, productAddons } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { productAddonSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const activeFilter = searchParams.get('active');

    const query = db
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
      .leftJoin(productAddons, eq(addons.id, productAddons.addonId));

    if (activeFilter === 'true') {
      query.where(eq(addons.isActive, true));
    } else if (activeFilter === 'false') {
      query.where(eq(addons.isActive, false));
    }

    const list = await query
      .groupBy(addons.id)
      .orderBy(desc(addons.createdAt));

    return NextResponse.json({ addons: list });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    console.error('Fetch library addons error:', error);
    return NextResponse.json({ error: 'Failed to fetch add-ons' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const parseResult = productAddonSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        formatZodErrorResponse(parseResult, 'Invalid add-on data'),
        { status: 400 }
      );
    }

    const { name, price, isFree, imageUrl, isActive } = parseResult.data;

    const [newAddon] = await db
      .insert(addons)
      .values({
        name: name.trim(),
        price: isFree ? '0.00' : (price || 0).toString(),
        isFree: isFree === true,
        imageUrl: imageUrl || null,
        isActive: isActive !== false,
      })
      .returning();

    return NextResponse.json({ addon: newAddon }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    console.error('Create library addon error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create add-on' }, { status: 500 });
  }
}
