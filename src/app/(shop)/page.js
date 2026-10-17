import { db } from '@/lib/db';
import { products, categories } from '@/lib/db/schema';
import { desc, eq, asc, and, gt } from 'drizzle-orm';
import CategoryQuickNav from '@/components/storefront/CategoryQuickNav';
import BannerCarousel from '@/components/storefront/BannerCarousel';
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

async function getHomepageData() {
  try {
    const availableCondition = and(
      eq(products.isActive, true),
      eq(products.showOnHome, true),
      eq(products.isOutOfStock, false),
      gt(products.stock, 0)
    );

    const [allCategories, newArrivals, bestSellers] = await Promise.all([
      db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          imageUrl: categories.imageUrl,
        })
        .from(categories)
        .orderBy(asc(categories.name))
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
        .limit(12),
      getBestSellerProducts(8),
    ]);

    return { categories: allCategories, newArrivals, bestSellers };
  } catch (error) {
    console.error('Homepage data fetch error:', error);
    return { categories: [], newArrivals: [], bestSellers: [] };
  }
}

export default async function HomePage() {
  const { categories: cats, newArrivals, bestSellers } = await getHomepageData();

  return (
    <>
      <CategoryQuickNav categories={cats} />
      <BannerCarousel />
      <NewArrivals products={newArrivals} />
      <BestSellers products={bestSellers} />
      <FlashSale />
      <HappyCustomers />
      <div className="border-t border-warm-200 mt-8">
        <TrustBadges />
      </div>
    </>
  );
}
