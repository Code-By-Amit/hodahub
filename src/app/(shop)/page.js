import { db } from '@/lib/db';
import { products, categories } from '@/lib/db/schema';
import { desc, eq, asc, and, gt } from 'drizzle-orm';
import CategoryQuickNav from '@/components/storefront/CategoryQuickNav';
import BannerCarousel from '@/components/storefront/BannerCarousel';
import TrustBadges from '@/components/storefront/TrustBadges';
import NewArrivals from '@/components/storefront/NewArrivals';
import BestSellers from '@/components/storefront/BestSellers';
import FlashSale from '@/components/storefront/FlashSale';

export const metadata = {
  title: "HodaHub — Official Online Store",
  description: 'Shop quality products delivered directly to your doorstep. Free shipping on eligible orders.',
};

export const revalidate = 60;


async function getHomepageData() {
  try {
    const availableCondition = and(
      eq(products.isActive, true),
      eq(products.isOutOfStock, false),
      gt(products.stock, 0)
    );

    const [allCategories, newArrivals, bestSellers] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.name)).limit(12),
      db.select().from(products)
        .where(availableCondition)
        .orderBy(desc(products.createdAt))
        .limit(12),
      db.select().from(products)
        .where(availableCondition)
        .orderBy(desc(products.reviewCount))
        .limit(8),
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
      <div className="border-t border-warm-200 mt-8">
        <TrustBadges />
      </div>
    </>
  );
}
