import { db } from '@/lib/db';
import { products, orders, orderItems, categories, brands } from '@/lib/db/schema';
import { eq, and, gt, desc, or, sql, inArray, ne } from 'drizzle-orm';

/**
 * Fetch Best Seller products.
 * Primary signal: Real completed order sales (non-cancelled, paid or confirmed/shipped orders).
 * Admin override: products with isBestSeller = true pin to top.
 * Fallback: Newest active products when sales volume is low.
 */
export async function getBestSellerProducts(limit = 8) {
  try {
    const availableCondition = and(
      eq(products.isActive, true),
      eq(products.showOnHome, true),
      eq(products.isOutOfStock, false),
      gt(products.stock, 0)
    );

    // Subquery: sum valid completed sales per product across non-cancelled, paid/confirmed orders
    const validSalesSubquery = db
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

    const result = await db
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
        brandId: products.brandId,
        brandName: brands.name,
        brandSlug: brands.slug,
        stock: products.stock,
        isOutOfStock: products.isOutOfStock,
        images: products.images,
        ratingAvg: products.ratingAvg,
        reviewCount: products.reviewCount,
        isActive: products.isActive,
        isBestSeller: products.isBestSeller,
        unitsSold: products.unitsSold,
        codAvailable: products.codAvailable,
        productLink: products.productLink,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(validSalesSubquery, eq(products.id, validSalesSubquery.productId))
      .where(availableCondition)
      .orderBy(
        desc(products.isBestSeller),
        desc(sql`GREATEST(${products.unitsSold}, COALESCE(${validSalesSubquery.totalSales}, 0))`),
        desc(products.createdAt),
        desc(products.id)
      )
      .limit(limit);

    return result;
  } catch (error) {
    console.error('Error fetching best seller products:', error);
    return [];
  }
}
