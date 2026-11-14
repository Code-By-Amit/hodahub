import { db } from '@/lib/db';
import { products, categories } from '@/lib/db/schema';
import { desc, eq, asc, and, gt, sql } from 'drizzle-orm';
import CategoryQuickNav from '@/components/storefront/CategoryQuickNav';
import BannerCarousel from '@/components/storefront/BannerCarousel';
import ShopByBrand from '@/components/storefront/ShopByBrand';
import TrustBadges from '@/components/storefront/TrustBadges';
import NewArrivals from '@/components/storefront/NewArrivals';
import BestSellers from '@/components/storefront/BestSellers';
import FlashSale from '@/components/storefront/FlashSale';
import HappyCustomers from '@/components/storefront/HappyCustomers';

export const metadata = {
  title: "HodaHub — Official Online Store",
  description: 'Shop quality products delivered directly to your doorstep. Free shipping on eligible orders.',
};

export const revalidate = 60;


import { getBestSellerProducts } from '@/lib/best-sellers';
import { brandService } from '@/services/brand.service';
import { logServerError } from '@/lib/error-handler';

async function getHomepageData() {
  try {
    const availableCondition = and(
      eq(products.isActive, true),
      eq(products.showOnHome, true),
      eq(products.isOutOfStock, false),
      gt(products.stock, 0)
    );

    const [allCategories, newArrivals, bestSellers, brandRes] = await Promise.all([
      db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          imageUrl: categories.imageUrl,
        })
        .from(categories)
        .orderBy(
          sql`CASE WHEN COALESCE("categories"."sort_order", 0) > 0 THEN COALESCE("categories"."sort_order", 0) ELSE 999999 END ASC`,
          asc(categories.name)
        )
        .limit(12),
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          price: products.price,
          discountPrice: products.discountPrice,
          images: products.images,
          ratingAvg: products.ratingAvg,
          reviewCount: products.reviewCount,
          stock: products.stock,
          isOutOfStock: products.isOutOfStock,
          codAvailable: products.codAvailable,
          createdAt: products.createdAt,
        })
        .from(products)
        .where(availableCondition)
        .orderBy(desc(products.createdAt), desc(products.id))
        .limit(10),
      getBestSellerProducts(10),
      brandService.getBrands().catch(() => ({ brands: [] })),
    ]);

    return {
      categories: allCategories,
      newArrivals,
      bestSellers,
      brands: brandRes?.brands || [],
    };
  } catch (error) {
    logServerError('Homepage (Server Component)', error);
    return { categories: [], newArrivals: [], bestSellers: [], brands: [] };
  }
}

export default async function HomePage() {
  const { categories: cats, newArrivals, bestSellers, brands } = await getHomepageData();

  return (
    <>
      <CategoryQuickNav categories={cats} />
      <BannerCarousel />
      <NewArrivals products={newArrivals} />
      <BestSellers products={bestSellers} />
      <ShopByBrand brands={brands} />
      <HappyCustomers />
      <FlashSale />
      <div className="border-t border-warm-200 mt-8">
        <TrustBadges />
      </div>
    </>
  );
}
