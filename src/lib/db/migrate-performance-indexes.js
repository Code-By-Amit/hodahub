import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

async function runPerformanceIndexesMigration() {
  console.log('🔄 Starting Performance Indexes Migration...');

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
    console.log('⚡ Creating optimized database indexes...');
    
    // 1. Reviews foreign keys and filter indexes
    await client.query(`CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON reviews (product_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON reviews (user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS reviews_is_hidden_idx ON reviews (is_hidden);`);
    await client.query(`CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON reviews (created_at);`);

    // 2. Products active and timestamp indexes
    await client.query(`CREATE INDEX IF NOT EXISTS products_is_active_idx ON products (is_active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS products_created_at_idx ON products (created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS products_active_home_idx ON products (is_active, show_on_home);`);

    // 3. Orders status and chronological sorting indexes
    await client.query(`CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS orders_payment_status_idx ON orders (payment_status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at);`);

    // 4. Category relations hierarchy lookup index
    await client.query(`CREATE INDEX IF NOT EXISTS category_relations_parent_id_idx ON category_relations (parent_id);`);

    console.log('🎉 Performance Indexes Migration Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runPerformanceIndexesMigration();
