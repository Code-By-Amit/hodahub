import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

async function runBrandsMigration() {
  console.log('🔄 Starting Brands Table & Brand ID Column Migration...');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL missing in environment');
    process.exit(1);
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new pg.Client({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    console.log('📦 Creating `brands` table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        logo_url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log('🔗 Adding `brand_id` column to `products` table...');
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;
    `);

    console.log('⚡ Creating index on `products(brand_id)`...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS products_brand_id_idx ON products(brand_id);
    `);

    console.log('🎉 Brands Migration Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runBrandsMigration();
