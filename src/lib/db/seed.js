import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { eq } from 'drizzle-orm';
import { categories as categoriesTable, products as productsTable } from './schema.js';

// Load .env.local before DB initialization
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

// ============================================================================
// 1. FILL IN YOUR REAL CATEGORIES AND PRODUCTS HERE
// ============================================================================

const categories = [
  // Example:
  // { name: "Electronics", slug: "electronics", imageUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661" },
];

const products = [
  // Example:
  // {
  //   name: "Wireless Headphones",
  //   slug: "wireless-headphones",
  //   description: "High quality noise-canceling wireless headphones.",
  //   price: 99.99,
  //   discountPrice: 79.99,
  //   categorySlug: "electronics",
  //   stock: 50,
  //   images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e"],
  // },
];

// ============================================================================
// 2. IDEMPOTENT SEED EXECUTION LOGIC
// ============================================================================

async function seed() {
  console.log('🌱 Starting database seeding...');

  // Dynamically import db after env vars are loaded
  const { db } = await import('./index.js');

  let categoriesSeeded = 0;
  let categoriesUpdated = 0;
  let productsSeeded = 0;
  let productsUpdated = 0;

  // Map category slug to DB ID for product foreign key resolution
  const categoryMap = new Map();

  // Load existing categories from DB into map first
  const existingCategories = await db.select().from(categoriesTable);
  for (const cat of existingCategories) {
    categoryMap.set(cat.slug, cat.id);
  }

  // 1. Seed Categories
  for (const cat of categories) {
    if (!cat.slug || !cat.name) continue;

    const existing = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, cat.slug))
      .limit(1);

    if (existing.length > 0) {
      // Update existing category
      const [updated] = await db
        .update(categoriesTable)
        .set({
          name: cat.name,
          imageUrl: cat.imageUrl || null,
        })
        .where(eq(categoriesTable.slug, cat.slug))
        .returning();
      categoryMap.set(cat.slug, updated.id);
      categoriesUpdated++;
    } else {
      // Insert new category
      const [inserted] = await db
        .insert(categoriesTable)
        .values({
          name: cat.name,
          slug: cat.slug,
          imageUrl: cat.imageUrl || null,
        })
        .returning();
      categoryMap.set(cat.slug, inserted.id);
      categoriesSeeded++;
    }
  }

  // 2. Seed Products
  for (const prod of products) {
    if (!prod.slug || !prod.name) continue;

    const categoryId = prod.categorySlug ? categoryMap.get(prod.categorySlug) || null : null;
    const priceVal = String(prod.price ?? 0);
    const discountVal = prod.discountPrice !== null && prod.discountPrice !== undefined ? String(prod.discountPrice) : null;

    const existing = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.slug, prod.slug))
      .limit(1);

    if (existing.length > 0) {
      // Update existing product
      await db
        .update(productsTable)
        .set({
          name: prod.name,
          description: prod.description || null,
          price: priceVal,
          discountPrice: discountVal,
          categoryId,
          stock: prod.stock ?? 0,
          images: Array.isArray(prod.images) ? prod.images : [],
          isActive: true,
        })
        .where(eq(productsTable.slug, prod.slug));
      productsUpdated++;
    } else {
      // Insert new product
      await db.insert(productsTable).values({
        name: prod.name,
        slug: prod.slug,
        description: prod.description || null,
        price: priceVal,
        discountPrice: discountVal,
        categoryId,
        stock: prod.stock ?? 0,
        images: Array.isArray(prod.images) ? prod.images : [],
        ratingAvg: '0',
        reviewCount: 0,
        isActive: true,
      });
      productsSeeded++;
    }
  }

  console.log('✅ Seeding complete!');
  console.log(`📊 Summary:`);
  console.log(`   Categories: ${categoriesSeeded} created, ${categoriesUpdated} updated`);
  console.log(`   Products:   ${productsSeeded} created, ${productsUpdated} updated`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed with error:', err);
  process.exit(1);
});
