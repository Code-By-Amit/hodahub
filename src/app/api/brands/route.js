import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, brands, categories, categoryRelations } from '@/lib/db/schema';
import { eq, gt, and, or, ilike, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const conditions = [
      eq(products.isActive, true),
      eq(products.isOutOfStock, false),
      gt(products.stock, 0),
    ];

    if (category) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(or(eq(categories.slug, category), eq(categories.id, category)))
        .limit(1);

      if (cat) {
        const allRelations = await db.select().from(categoryRelations);
        const descendantIds = new Set([cat.id]);
        const queue = [cat.id];

        while (queue.length > 0) {
          const currentParentId = queue.shift();
          const children = allRelations.filter((r) => r.parentId === currentParentId);
          for (const child of children) {
            if (!descendantIds.has(child.categoryId)) {
              descendantIds.add(child.categoryId);
              queue.push(child.categoryId);
            }
          }
        }

        conditions.push(inArray(products.categoryId, Array.from(descendantIds)));
      }
    }

    if (search) {
      const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&');
      conditions.push(
        or(
          ilike(products.name, `%${sanitizedSearch}%`),
          ilike(products.description, `%${sanitizedSearch}%`),
          ilike(products.brand, `%${sanitizedSearch}%`)
        )
      );
    }

    // Fetch both relational brand (name + slug) AND free-text brand field
    const brandRows = await db
      .select({
        brandText: products.brand,
        brandRelName: brands.name,
        brandRelSlug: brands.slug, // use actual DB slug, not the name
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(and(...conditions));

    // Build a slug→{name,slug} map.
    // Relational brands: use the real slug (unique). Free-text brands: use text as slug fallback.
    const brandMap = new Map(); // slug -> { name, slug }

    for (const r of brandRows) {
      if (r.brandRelName && r.brandRelSlug) {
        // Relational brand from brands table — use its actual unique slug
        if (!brandMap.has(r.brandRelSlug)) {
          brandMap.set(r.brandRelSlug, { name: r.brandRelName, slug: r.brandRelSlug });
        }
      } else if (r.brandText) {
        const text = r.brandText.trim();
        if (text && !brandMap.has(text)) {
          // Free-text brand has no slug — use the text itself as the identifier
          brandMap.set(text, { name: text, slug: text });
        }
      }
    }

    const sortedBrandsList = Array.from(brandMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({ brands: sortedBrandsList });
  } catch (error) {
    console.error('Brands API error:', error);
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}
