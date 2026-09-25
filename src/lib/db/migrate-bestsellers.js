import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

async function runBestSellersMigration() {
  console.log('🔄 Starting Best Sellers Columns Migration...');

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
    console.log('🔗 Adding `is_best_seller` and `units_sold` columns to `products` table...');
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS units_sold INTEGER NOT NULL DEFAULT 0;
    `);

    console.log('🎉 Best Sellers Migration Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runBestSellersMigration();
