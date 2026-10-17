import { db } from '@/lib/db';
import { products, brands, categories } from '@/lib/db/schema';
import { eq, gt, and, or, inArray, desc } from 'drizzle-orm';
import { categoryService } from './category.service';
import { AppError } from '@/lib/errors';

// 60-second in-memory cache for derived brands
let cachedBrandsData = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Derives unique brands from active, in-stock products with deterministic slugs,
 * product counts, and tile images (brand logo or first image of the best active product).
 */
async function deriveAllBrands(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedBrandsData && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedBrandsData;
  }

  const conditions = [
    eq(products.isActive, true),
    eq(products.isOutOfStock, false),
    gt(products.stock, 0),
  ];

  const productRows = await db
    .select({
      id: products.id,
      brandText: products.brand,
      images: products.images,
      isBestSeller: products.isBestSeller,
      unitsSold: products.unitsSold,
      ratingAvg: products.ratingAvg,
      createdAt: products.createdAt,
      brandRelId: brands.id,
      brandRelName: brands.name,
      brandRelSlug: brands.slug,
      brandLogoUrl: brands.logoUrl,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(...conditions))
    .orderBy(
      desc(products.isBestSeller),
      desc(products.unitsSold),
      desc(products.ratingAvg),
      desc(products.createdAt)
    );

  // Map of rawName -> brand accumulator
  const brandMap = new Map();

  for (const row of productRows) {
    const rawName = row.brandRelName || (row.brandText ? row.brandText.trim() : null);
    if (!rawName) continue;

    if (!brandMap.has(rawName)) {
      const firstImage = Array.isArray(row.images) && row.images.length > 0 ? row.images[0] : null;
      brandMap.set(rawName, {
        name: rawName,
        productCount: 1,
        logoUrl: row.brandLogoUrl || null,
        bestProductImage: firstImage || null,
        dbSlug: row.brandRelSlug || null,
      });
    } else {
      const existing = brandMap.get(rawName);
      existing.productCount += 1;
      if (!existing.logoUrl && row.brandLogoUrl) {
        existing.logoUrl = row.brandLogoUrl;
      }
      if (!existing.bestProductImage && Array.isArray(row.images) && row.images.length > 0) {
        existing.bestProductImage = row.images[0];
      }
    }
  }

  // Sort raw brands alphabetically by exact stored name
  const sortedRawList = Array.from(brandMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Compute deterministic slugs, handling collisions
  const slugCounts = new Map();
  const brandsList = [];
  const slugToBrandMap = new Map();

  for (const item of sortedRawList) {
    let baseSlug = item.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!baseSlug) {
      baseSlug = 'brand';
    }

    let finalSlug = baseSlug;
    if (slugCounts.has(baseSlug)) {
      const count = slugCounts.get(baseSlug) + 1;
      slugCounts.set(baseSlug, count);
      finalSlug = `${baseSlug}-${count}`;
    } else {
      slugCounts.set(baseSlug, 1);
    }

    const brandRecord = {
      name: item.name,
      slug: finalSlug,
      productCount: item.productCount,
      image: item.logoUrl || item.bestProductImage || null,
    };

    brandsList.push(brandRecord);
    slugToBrandMap.set(finalSlug, brandRecord);
    // Also index baseSlug if different for fallback
    if (finalSlug !== baseSlug && !slugToBrandMap.has(baseSlug)) {
      slugToBrandMap.set(baseSlug, brandRecord);
    }
  }

  cachedBrandsData = { brandsList, slugToBrandMap };
  lastCacheTime = now;
  return cachedBrandsData;
}

export const brandService = {
  /**
   * Escape regex helper
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  /**
   * GET paginated and filtered brands list
   */
  async getBrands({ q = '', page, limit, category } = {}) {
    // If category filter is supplied, compute category-scoped brands
    if (category) {
      const conditions = [
        eq(products.isActive, true),
        eq(products.isOutOfStock, false),
        gt(products.stock, 0),
      ];

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
      const categoryCondition = isUuid
        ? or(eq(categories.slug, category), eq(categories.id, category))
        : eq(categories.slug, category);

      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(categoryCondition)
        .limit(1);

      if (cat) {
        const descendantIds = await categoryService.getDescendantCategoryIds(cat.id);
        conditions.push(inArray(products.categoryId, descendantIds));
      }

      const rows = await db
        .select({
          brandText: products.brand,
          brandRelName: brands.name,
          brandRelSlug: brands.slug,
          brandLogoUrl: brands.logoUrl,
          images: products.images,
        })
        .from(products)
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(and(...conditions));

      const scopedMap = new Map();
      for (const r of rows) {
        const rawName = r.brandRelName || (r.brandText ? r.brandText.trim() : null);
        if (!rawName) continue;
        if (!scopedMap.has(rawName)) {
          const firstImg = Array.isArray(r.images) && r.images.length > 0 ? r.images[0] : null;
          scopedMap.set(rawName, {
            name: rawName,
            productCount: 1,
            logoUrl: r.brandLogoUrl || null,
            bestProductImage: firstImg,
          });
        } else {
          scopedMap.get(rawName).productCount += 1;
        }
      }

      // Map to full slug-assigned brands from cache
      const { brandsList } = await deriveAllBrands();
      const slugLookup = new Map(brandsList.map((b) => [b.name, b.slug]));

      let resultList = Array.from(scopedMap.values()).map((b) => ({
        name: b.name,
        slug: slugLookup.get(b.name) || b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        productCount: b.productCount,
        image: b.logoUrl || b.bestProductImage || null,
      })).sort((a, b) => a.name.localeCompare(b.name));

      if (q && q.trim()) {
        const sanitized = q.trim().slice(0, 100);
        const re = new RegExp(this.escapeRegex(sanitized), 'i');
        resultList = resultList.filter((b) => re.test(b.name));
      }

      return {
        brands: resultList,
        pagination: {
          page: 1,
          limit: resultList.length,
          total: resultList.length,
          totalPages: 1,
        },
      };
    }

    const { brandsList } = await deriveAllBrands();
    let filtered = [...brandsList];

    if (q && q.trim()) {
      const sanitized = q.trim().slice(0, 100);
      const re = new RegExp(this.escapeRegex(sanitized), 'i');
      filtered = filtered.filter((b) => re.test(b.name));
    }

    // If neither page nor limit is explicitly specified, return all items
    if (page === undefined && limit === undefined) {
      return {
        brands: filtered,
        pagination: {
          page: 1,
          limit: filtered.length,
          total: filtered.length,
          totalPages: 1,
        },
      };
    }

    const parsedPage = Math.max(1, parseInt(page || '1', 10));
    const parsedLimit = Math.min(48, Math.max(1, parseInt(limit || '24', 10)));
    const total = filtered.length;
    const totalPages = Math.ceil(total / parsedLimit) || 1;

    const offset = (parsedPage - 1) * parsedLimit;
    const paginatedBrands = filtered.slice(offset, offset + parsedLimit);

    return {
      brands: paginatedBrands,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages,
      },
    };
  },

  /**
   * GET single brand detail by slug
   */
  async getBrandBySlug(slug) {
    if (!slug) throw AppError.badRequest('Slug is required');
    const { slugToBrandMap } = await deriveAllBrands();
    const brand = slugToBrandMap.get(slug);
    if (!brand) {
      throw AppError.notFound('Brand not found');
    }
    return brand;
  },

  /**
   * Invalidate brand cache
   */
  invalidateCache() {
    cachedBrandsData = null;
    lastCacheTime = 0;
  },
};

export default brandService;
