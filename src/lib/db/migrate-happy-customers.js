import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

async function runHappyCustomersMigration() {
  console.log('🔄 Starting Happy Customers Gallery Migration...');

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
    console.log('📸 Creating `happy_customers` table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS happy_customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        image_url TEXT NOT NULL,
        cloudinary_asset_id VARCHAR(255),
        caption VARCHAR(500),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS happy_customers_is_active_idx ON happy_customers(is_active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS happy_customers_sort_order_idx ON happy_customers(sort_order);`);

    console.log('🎉 Happy Customers Gallery Migration Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runHappyCustomersMigration();
