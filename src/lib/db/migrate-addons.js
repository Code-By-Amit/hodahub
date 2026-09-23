import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

async function runAddonsMigration() {
  console.log('🔄 Starting Add-ons Library Migration...');

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
    // 1. Create `addons` library table if not exists
    console.log('📦 Creating `addons` library table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS addons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        is_free BOOLEAN NOT NULL DEFAULT FALSE,
        image_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Check if old `product_addons` table has a `name` column (old per-product embedded schema)
    const nameColCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'product_addons' AND column_name = 'name';
    `);

    if (nameColCheck.rows.length > 0) {
      console.log('🚚 Migrating existing per-product add-ons into shared `addons` library...');
      
      // Fetch all old product add-ons
      const oldAddons = await client.query(`
        SELECT id, product_id, name, price, is_free, image_url, is_active, created_at 
        FROM product_addons;
      `);

      // Map to track deduplicated library addons: key = name|price|is_free|image_url -> library addon ID
      const libraryMap = new Map();
      const oldToNewIdMap = new Map();

      for (const row of oldAddons.rows) {
        const key = `${row.name.trim().toLowerCase()}|${parseFloat(row.price || 0).toFixed(2)}|${row.is_free ? '1' : '0'}|${(row.image_url || '').trim()}`;
        
        let libraryId = libraryMap.get(key);
        if (!libraryId) {
          const insertRes = await client.query(
            `INSERT INTO addons (name, price, is_free, image_url, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()), NOW())
             RETURNING id;`,
            [
              row.name.trim(),
              row.price || '0.00',
              row.is_free || false,
              row.image_url || null,
              row.is_active !== false,
              row.created_at,
            ]
          );
          libraryId = insertRes.rows[0].id;
          libraryMap.set(key, libraryId);
        }

        oldToNewIdMap.set(row.id, { newLibraryId: libraryId, productId: row.product_id });
      }

      console.log(`✅ Extracted & deduplicated ${libraryMap.size} unique add-ons into \`addons\` library table.`);

      // Create new join table temporary `product_addons_join`
      await client.query(`
        CREATE TABLE IF NOT EXISTS product_addons_join (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          addon_id UUID NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          CONSTRAINT product_addon_unique UNIQUE (product_id, addon_id)
        );
      `);

      let joinCount = 0;
      for (const [, mapping] of oldToNewIdMap.entries()) {
        if (mapping.productId && mapping.newLibraryId) {
          const res = await client.query(
            `INSERT INTO product_addons_join (product_id, addon_id)
             VALUES ($1, $2)
             ON CONFLICT (product_id, addon_id) DO NOTHING;`,
            [mapping.productId, mapping.newLibraryId]
          );
          if (res.rowCount > 0) joinCount++;
        }
      }

      console.log(`✅ Created ${joinCount} product-addon links in join table.`);

      // Update `order_item_addons.addon_id` foreign keys to point to new `addons.id`
      console.log('🔗 Updating `order_item_addons` references...');
      // Remove old FK constraint if present
      await client.query(`
        ALTER TABLE order_item_addons DROP CONSTRAINT IF EXISTS order_item_addons_addon_id_product_addons_id_fk;
      `);

      for (const [oldId, mapping] of oldToNewIdMap.entries()) {
        await client.query(
          `UPDATE order_item_addons SET addon_id = $1 WHERE addon_id = $2;`,
          [mapping.newLibraryId, oldId]
        );
      }

      // Add FK constraint pointing to `addons(id)`
      await client.query(`
        ALTER TABLE order_item_addons 
        ADD CONSTRAINT order_item_addons_addon_id_addons_id_fk 
        FOREIGN KEY (addon_id) REFERENCES addons(id) ON DELETE SET NULL;
      `);

      // Drop old `product_addons` table and rename `product_addons_join`
      console.log('🗑️ Replacing old `product_addons` table with new join table...');
      await client.query(`DROP TABLE product_addons CASCADE;`);
      await client.query(`ALTER TABLE product_addons_join RENAME TO product_addons;`);

      // Re-create indexes
      await client.query(`CREATE INDEX IF NOT EXISTS product_addons_product_id_idx ON product_addons(product_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS product_addons_addon_id_idx ON product_addons(addon_id);`);
    } else {
      console.log('ℹ️ `product_addons` table is already converted to join table structure.');
    }

    // Ensure price_override and is_free_override columns exist
    console.log('🔒 Ensuring `price_override` and `is_free_override` columns exist on `product_addons`...');
    await client.query(`ALTER TABLE product_addons ADD COLUMN IF NOT EXISTS price_override NUMERIC(10, 2);`);
    await client.query(`ALTER TABLE product_addons ADD COLUMN IF NOT EXISTS is_free_override BOOLEAN;`);

    console.log('🎉 Add-ons Library Migration Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runAddonsMigration();
