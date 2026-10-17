import { db } from '@/lib/db';
import { products, categories, brands, productAddons, orders, orderItems } from '@/lib/db/schema';
import { eq, desc, asc, ilike, and, gte, lte, gt, sql, or, inArray, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { categoryService } from './category.service';

export const productService = {
  /**
   * Storefront: Fetch paginated and filtered products with parallelized count
   */
  async getProducts({
    page = 1,
    limit = 12,
    sort = 'newest',
    category,
    brand,
    search,
    minPrice,
    maxPrice,
    minRating,
  } = {}) {
    const offset = (page - 1) * limit;

    const conditions = [
      eq(products.isActive, true),
      eq(products.isOutOfStock, false),
      gt(products.stock, 0),
    ];

    if (category) {
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
    }

    if (brand) {
      const selectedBrands = brand.split(',').map((b) => b.trim()).filter(Boolean);
      if (selectedBrands.length > 0) {
        const matchingBrandRows = await db
          .select({ id: brands.id })
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

      const [matchingBrandRows, matchingCategoryRows] = await Promise.all([
        db.select({ id: brands.id }).from(brands).where(ilike(brands.name, searchPattern)),
        db.select({ id: categories.id }).from(categories).where(ilike(categories.name, searchPattern)),
      ]);

      const matchingBrandIds = matchingBrandRows.map((b) => b.id);
      const matchedCategoryIds = new Set(matchingCategoryRows.map((c) => c.id));

      if (matchedCategoryIds.size > 0) {
        const allRelations = await categoryService.getCategoryRelations();
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

    if (minRating) {
      const parsedRating = parseFloat(minRating);
      if (!isNaN(parsedRating)) {
        conditions.push(gte(products.ratingAvg, parsedRating));
      }
    }

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
        orderBy = [
          desc(
            sql`CASE WHEN ${products.discountPrice} IS NOT NULL THEN (${products.price} - ${products.discountPrice}) / ${products.price} ELSE 0 END`
          ),
          desc(products.id),
        ];
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

    // Parallelize data query and count query
    const [productList, [{ count }]] = await Promise.all([
      query.where(whereClause).orderBy(...orderBy).limit(limit).offset(offset),
      db.select({ count: sql`count(*)::int` }).from(products).where(whereClause),
    ]);

    const sanitizedProducts = productList.map((p) => {
      const { productLink, ...rest } = p;
      return {
        ...rest,
        brand: p.brand || p.brandName || null,
      };
    });

    return {
      products: sanitizedProducts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    };
  },

  /**
   * Admin: List products with filters and optimized count
   */
  async getAdminProducts({
    page = 1,
    limit = 20,
    search = '',
    categoryFilter = '',
    brandFilter = '',
    activeFilter = '',
    stockFilter = '',
  } = {}) {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (search) {
      conditions.push(or(ilike(products.name, `%${search}%`), ilike(products.slug, `%${search}%`)));
    }
    if (categoryFilter) {
      conditions.push(eq(products.categoryId, categoryFilter));
    }
    if (brandFilter) {
      conditions.push(eq(products.brandId, brandFilter));
    }
    if (activeFilter === 'active') {
      conditions.push(eq(products.isActive, true));
    } else if (activeFilter === 'inactive') {
      conditions.push(eq(products.isActive, false));
    }
    if (stockFilter === 'in_stock') {
      conditions.push(and(eq(products.isOutOfStock, false), gt(products.stock, 0)));
    } else if (stockFilter === 'out_of_stock') {
      conditions.push(or(eq(products.isOutOfStock, true), lte(products.stock, 0)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Parallelize list and count queries. Note count does not need left joins on categories/brands
    const [list, [{ count }]] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          price: products.price,
          discountPrice: products.discountPrice,
          stock: products.stock,
          isOutOfStock: products.isOutOfStock,
          images: products.images,
          specifications: products.specifications,
          isActive: products.isActive,
          showOnHome: products.showOnHome,
          codAvailable: products.codAvailable,
          isBestSeller: products.isBestSeller,
          unitsSold: products.unitsSold,
          productLink: products.productLink,
          ratingAvg: products.ratingAvg,
          reviewCount: products.reviewCount,
          createdAt: products.createdAt,
          categoryId: products.categoryId,
          categoryName: categories.name,
          brand: products.brand,
          brandId: products.brandId,
          brandName: brands.name,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(where)
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql`count(*)::int` }).from(products).where(where),
    ]);

    return {
      products: list,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    };
  },

  /**
   * Admin: Optimistic status toggle for active, showOnHome, and outOfStock
   */
  async toggleStatus(id, updateFields) {
    const validFields = {};
    if (typeof updateFields.isActive === 'boolean') {
      validFields.isActive = updateFields.isActive;
    }
    if (typeof updateFields.showOnHome === 'boolean') {
      validFields.showOnHome = updateFields.showOnHome;
    }
    if (typeof updateFields.isOutOfStock === 'boolean') {
      validFields.isOutOfStock = updateFields.isOutOfStock;
    }

    if (Object.keys(validFields).length === 0) {
      const error = new Error('No valid status fields provided');
      error.status = 400;
      throw error;
    }

    const [updatedProduct] = await db
      .update(products)
      .set(validFields)
      .where(eq(products.id, id))
      .returning();

    if (!updatedProduct) {
      const error = new Error('Product not found');
      error.status = 404;
      throw error;
    }

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/products');
      revalidatePath('/categories');
    } catch {}

    return updatedProduct;
  },

  /**
   * Admin: Create product with optional addon links
   */
  async createProduct(body) {
    const {
      name,
      slug,
      description,
      brand,
      price,
      discountPrice,
      categoryId,
      brandId,
      stock,
      isOutOfStock,
      images,
      specifications,
      isActive,
      showOnHome,
      codAvailable,
      isBestSeller,
      productLink,
      addonIds,
      addonLinks,
    } = body;

    const numStock = Number(stock || 0);
    const [product] = await db
      .insert(products)
      .values({
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        description: description || null,
        brand: brand ? brand.trim() : null,
        price: price.toString(),
        discountPrice: discountPrice ? discountPrice.toString() : null,
        categoryId: categoryId,
        brandId: brandId || null,
        stock: numStock,
        isOutOfStock: isOutOfStock !== undefined ? Boolean(isOutOfStock) : numStock <= 0,
        images: images || [],
        specifications: specifications || [],
        isActive: isActive !== false,
        showOnHome: showOnHome !== false,
        codAvailable: codAvailable !== false,
        isBestSeller: Boolean(isBestSeller),
        productLink: productLink || null,
      })
      .returning();

    const linksToProcess = Array.isArray(addonLinks)
      ? addonLinks
      : Array.isArray(addonIds)
      ? addonIds.map((aid) => ({ addonId: aid }))
      : [];

    if (linksToProcess.length > 0) {
      await db.insert(productAddons).values(
        linksToProcess.map((link) => {
          const addonId = typeof link === 'string' ? link : link.addonId;
          const priceOverride =
            typeof link === 'object' &&
            link.priceOverride !== undefined &&
            link.priceOverride !== null &&
            link.priceOverride !== ''
              ? link.priceOverride.toString()
              : null;
          const isFreeOverride =
            typeof link === 'object' && link.isFreeOverride !== undefined && link.isFreeOverride !== null
              ? Boolean(link.isFreeOverride)
              : null;

          return {
            productId: product.id,
            addonId,
            priceOverride,
            isFreeOverride,
          };
        })
      );
    }

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/products');
      revalidatePath('/categories');
    } catch {}

    return product;
  },

  /**
   * Admin: Delete product by ID
   */
  async deleteProduct(id) {
    const [deleted] = await db.delete(products).where(eq(products.id, id)).returning();
    if (!deleted) {
      const error = new Error('Product not found');
      error.status = 404;
      throw error;
    }

    try {
      revalidatePath('/', 'layout');
      revalidatePath('/products');
      revalidatePath('/categories');
    } catch {}

    return deleted;
  },
};
