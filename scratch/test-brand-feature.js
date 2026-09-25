import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../src/lib/db/index.js';
import { products, brands } from '../src/lib/db/schema.js';
import { eq, or, inArray, gt, and } from 'drizzle-orm';
import { productSchema } from '../src/lib/validations.js';

async function testBrandFeature() {
  console.log('--- Testing Brand Validation ---');
  const validPayload = {
    name: 'Test Brand Watch',
    slug: 'test-brand-watch',
    description: 'A nice watch',
    brand: 'Casio',
    price: 199.99,
    categoryId: '12345678-1234-1234-1234-123456789012',
    stock: 10,
  };
  const parseRes = productSchema.safeParse(validPayload);
  console.log('Validation success:', parseRes.success);
  if (!parseRes.success) {
    console.error('Validation errors:', parseRes.error);
  }

  console.log('\n--- Testing Dynamic Brands Retrieval ---');
  const brandRows = await db
    .select({
      brandText: products.brand,
      brandRelName: brands.name,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(eq(products.isActive, true), eq(products.isOutOfStock, false), gt(products.stock, 0)));

  const distinctBrandsSet = new Set();
  for (const r of brandRows) {
    const bName = (r.brandText || r.brandRelName || '').trim();
    if (bName) distinctBrandsSet.add(bName);
  }
  console.log('Distinct Active Brands found in DB:', Array.from(distinctBrandsSet));

  process.exit(0);
}

testBrandFeature().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
