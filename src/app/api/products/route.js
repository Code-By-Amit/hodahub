import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products, categories, brands, categoryRelations, orders, orderItems } from '@/lib/db/schema';
import { eq, desc, asc, ilike, and, gte, lte, gt, sql, or, inArray, ne } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sort = searchParams.get('sort') || 'newest';
    const category = searchParams.get('category');
    const brand = searchParams.get('brand');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [
      eq(products.isActive, true),
      eq(products.isOutOfStock, false),
      gt(products.stock, 0),
    ];

    if (category) {
      // Find category by slug or ID
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(or(eq(categories.slug, category), eq(categories.id, category)))
        .limit(1);
      if (cat) {
        // Collect all descendant subcategory IDs recursively
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

    if (brand) {
      const selectedBrands = brand.split(',').map((b) => b.trim()).filter(Boolean);
      if (selectedBrands.length > 0) {
        // Find matching relational brands if any
        const matchingBrandRows = await db
          .select({ id: brands.id, name: brands.name, slug: brands.slug })
          .from(brands)
          .where(
            or(
              inArray(brands.name, selectedBrands),
              inArray(brands.slug, selectedBrands)
            )
          );
        const matchingBrandIds = matchingBrandRows.map((b) => b.id);

        const brandConds = [inArray(products.brand, selectedBrands)];
        if (matchingBrandIds.length > 0) {
          brandConds.push(inArray(products.brandId, matchingBrandIds));
        }
        conditions.push(or(...brandConds));
      }
    }

    if (search) {
      const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&');
      const searchPattern = `%${sanitizedSearch}%`;

      // 1. Match relational brands by name
      const matchingBrandRows = await db
        .select({ id: brands.id })
        .from(brands)
        .where(ilike(brands.name, searchPattern));
      
      const matchingBrandIds = matchingBrandRows.map((b) => b.id);

      // 2. Match relational categories by name + descendant subcategories
      const matchingCategoryRows = await db
        .select({ id: categories.id })
        .from(categories)
        .where(ilike(categories.name, searchPattern));

      const matchedCategoryIds = new Set(matchingCategoryRows.map((c) => c.id));
      if (matchedCategoryIds.size > 0) {
        const allRelations = await db.select().from(categoryRelations);
        const queue = Array.from(matchedCategoryIds);
        while (queue.length > 0) {
          const currentParentId = queue.shift();
          const children = allRelations.filter((r) => r.parentId === currentParentId);
          for (const child of children) {
            if (!matchedCategoryIds.has(child.categoryId)) {
              matchedCategoryIds.add(child.categoryId);
              queue.push(child.categoryId);
            }
          }
        }
      }

      const searchConditions = [
        ilike(products.name, searchPattern),
        ilike(products.description, searchPattern),
        ilike(products.brand, searchPattern),
      ];

      if (matchingBrandIds.length > 0) {
        searchConditions.push(inArray(products.brandId, matchingBrandIds));
      }

      if (matchedCategoryIds.size > 0) {
        searchConditions.push(inArray(products.categoryId, Array.from(matchedCategoryIds)));
      }

      conditions.push(or(...searchConditions));
    }

    if (minPrice) {
      conditions.push(gte(products.price, minPrice));
    }

    if (maxPrice) {
      conditions.push(lte(products.price, maxPrice));
    }

    const minRating = searchParams.get('minRating');
    if (minRating) {
      const parsedRating = parseFloat(minRating);
      if (!isNaN(parsedRating)) {
        conditions.push(gte(products.ratingAvg, parsedRating));
      }
    }

    // Sort with deterministic secondary tie-breaker
    let orderBy;
    let validSalesSubquery = null;

    switch (sort) {
      case 'price-asc':
        orderBy = [asc(products.price), desc(products.id)];
        break;
      case 'price-desc':
        orderBy = [desc(products.price), desc(products.id)];
        break;
      case 'best-sellers':
        validSalesSubquery = db
          .select({
            productId: orderItems.productId,
            totalSales: sql`COALESCE(SUM(${orderItems.quantity}), 0)::int`.as('total_sales'),
          })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .where(
            and(
              ne(orders.status, 'cancelled'),
              ne(orders.paymentStatus, 'failed'),
              or(
                eq(orders.paymentStatus, 'paid'),
                inArray(orders.status, ['confirmed', 'packed', 'shipped', 'delivered'])
              )
            )
          )
          .groupBy(orderItems.productId)
          .as('valid_sales');

        orderBy = [
          desc(products.isBestSeller),
          desc(sql`GREATEST(${products.unitsSold}, COALESCE(${validSalesSubquery.totalSales}, 0))`),
          desc(products.createdAt),
          desc(products.id),
        ];
        break;
      case 'top-rated':
        orderBy = [desc(products.ratingAvg), desc(products.id)];
        break;
      case 'discount':
        orderBy = [desc(sql`CASE WHEN ${products.discountPrice} IS NOT NULL THEN (${products.price} - ${products.discountPrice}) / ${products.price} ELSE 0 END`), desc(products.id)];
        break;
      case 'oldest':
        orderBy = [asc(products.createdAt), asc(products.id)];
        break;
      case 'newest':
      default:
        orderBy = [desc(products.createdAt), desc(products.id)];
        break;
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    // Fetch products with joined category and brand names
    let query = db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        discountPrice: products.discountPrice,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        brand: products.brand,
        brandId: products.brandId,
        brandName: brands.name,
        brandSlug: brands.slug,
        stock: products.stock,
        isOutOfStock: products.isOutOfStock,
        images: products.images,
        ratingAvg: products.ratingAvg,
        reviewCount: products.reviewCount,
        isActive: products.isActive,
        codAvailable: products.codAvailable,
        specifications: products.specifications,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id));

    if (validSalesSubquery) {
      query = query.leftJoin(validSalesSubquery, eq(products.id, validSalesSubquery.productId));
    }

    const productList = await query
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    // Count total
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(products)
      .where(whereClause);

    // Delete productLink to ensure admin-only field is never exposed publicly
    const sanitizedProducts = productList.map((p) => {
      const { productLink, ...rest } = p;
      return {
        ...rest,
        brand: p.brand || p.brandName || null,
      };
    });

    return NextResponse.json({
      products: sanitizedProducts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
