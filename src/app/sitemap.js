import { db } from '@/lib/db';
import { products, categories } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hodahub.com';

  const staticRoutes = [
    '',
    '/products',
    '/categories',
    '/login',
    '/signup',
    '/contact',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }));

  try {
    // Dynamic products
    const dbProducts = await db
      .select({ slug: products.slug, createdAt: products.createdAt })
      .from(products)
      .where(eq(products.isActive, true));

    const productRoutes = dbProducts.map((p) => ({
      url: `${baseUrl}/products/${p.slug}`,
      lastModified: p.createdAt || new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    // Dynamic categories
    const dbCategories = await db
      .select({ slug: categories.slug, createdAt: categories.createdAt })
      .from(categories);

    const categoryRoutes = dbCategories.map((c) => ({
      url: `${baseUrl}/categories/${c.slug}`,
      lastModified: c.createdAt || new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    return [...staticRoutes, ...productRoutes, ...categoryRoutes];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return staticRoutes;
  }
}
