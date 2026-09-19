import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

async function runMigration() {
  console.log('🔄 Starting Category Relations Migration...');

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
    // 1. Create category_relations table if it doesn't exist
    console.log('📦 Creating category_relations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS category_relations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        parent_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        CONSTRAINT category_parent_unique UNIQUE (category_id, parent_id)
      );
    `);

    // 2. Check if old parent_id column exists on categories table
    const colCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'parent_id';
    `);

    if (colCheck.rows.length > 0) {
      console.log('🚚 Migrating existing categories.parent_id relationships into category_relations...');
      const oldRelations = await client.query(`
        SELECT id, parent_id 
        FROM categories 
        WHERE parent_id IS NOT NULL;
      `);

      let count = 0;
      for (const row of oldRelations.rows) {
        if (row.id && row.parent_id) {
          const res = await client.query(
            `INSERT INTO category_relations (category_id, parent_id)
             VALUES ($1, $2)
             ON CONFLICT (category_id, parent_id) DO NOTHING;`,
            [row.id, row.parent_id]
          );
          if (res.rowCount > 0) count++;
        }
      }
      console.log(`✅ Migrated ${count} existing parent-child category relationships into category_relations.`);

      // Spot check print
      const totalRelations = await client.query(`SELECT COUNT(*)::int AS count FROM category_relations;`);
      console.log(`📊 Spot Check: Total rows in category_relations = ${totalRelations.rows[0].count}`);

      // Drop old parent_id column
      console.log('🗑️ Dropping deprecated categories.parent_id column...');
      await client.query(`ALTER TABLE categories DROP COLUMN IF EXISTS parent_id;`);
    } else {
      console.log('ℹ️ categories.parent_id column already removed/migrated.');
    }

    // 3. Ensure all products have a valid category_id before applying NOT NULL constraint
    const nullCategoryProducts = await client.query(`
      SELECT id, name FROM products WHERE category_id IS NULL;
    `);

    if (nullCategoryProducts.rows.length > 0) {
      console.log(`⚠️ Found ${nullCategoryProducts.rows.length} products without a category. Creating default "General" category...`);
      let generalCat = await client.query(`SELECT id FROM categories WHERE slug = 'general' LIMIT 1;`);
      let generalId = generalCat.rows[0]?.id;
      if (!generalId) {
        const newCat = await client.query(`
          INSERT INTO categories (name, slug) VALUES ('General', 'general') RETURNING id;
        `);
        generalId = newCat.rows[0].id;
      }
      await client.query(`UPDATE products SET category_id = $1 WHERE category_id IS NULL;`, [generalId]);
      console.log(`✅ Assigned default "General" category to uncategorized products.`);
    }

    // 4. Set NOT NULL on products.category_id
    console.log('🔒 Applying NOT NULL constraint on products.category_id...');
    await client.query(`ALTER TABLE products ALTER COLUMN category_id SET NOT NULL;`);

    console.log('🎉 Category Relations Migration Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
