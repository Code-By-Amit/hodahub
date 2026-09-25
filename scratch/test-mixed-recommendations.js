import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testMixedRecommendations() {
  console.log('🧪 Testing Mixed Category "You May Also Like" Recommendations...');

  const connectionString = process.env.DATABASE_URL;
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new pg.Client({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    // Pick a sample product
    const prodRes = await client.query(`SELECT id, name, category_id FROM products WHERE is_active = true LIMIT 1;`);
    if (prodRes.rows.length === 0) return;
    const activeProd = prodRes.rows[0];
    console.log(`Target Product: [${activeProd.name}] (Cat ID: ${activeProd.category_id})`);

    // 1. Fetch same category/brand products (up to 4)
    const sameCatRes = await client.query(`
      SELECT p.id, p.name, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true AND p.is_out_of_stock = false AND p.stock > 0
        AND p.id != $1 AND p.category_id = $2
      LIMIT 4;
    `, [activeProd.id, activeProd.category_id]);

    // 2. Fetch different category products (up to 6)
    const diffCatRes = await client.query(`
      SELECT p.id, p.name, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true AND p.is_out_of_stock = false AND p.stock > 0
        AND p.id != $1 AND (p.category_id IS NULL OR p.category_id != $2)
      ORDER BY p.is_best_seller DESC, p.created_at DESC
      LIMIT 6;
    `, [activeProd.id, activeProd.category_id]);

    const sameItems = sameCatRes.rows;
    const diffItems = diffCatRes.rows;

    console.log(`Found ${sameItems.length} same-category items, ${diffItems.length} different-category items.`);

    // 3. Interleave and blend
    const blended = [];
    const maxLen = Math.max(sameItems.length, diffItems.length);
    const seenIds = new Set([activeProd.id]);

    for (let i = 0; i < maxLen; i++) {
      if (i < sameItems.length && !seenIds.has(sameItems[i].id)) {
        seenIds.add(sameItems[i].id);
        blended.push(sameItems[i]);
      }
      if (i < diffItems.length && !seenIds.has(diffItems[i].id)) {
        seenIds.add(diffItems[i].id);
        blended.push(diffItems[i]);
      }
      if (blended.length >= 6) break;
    }

    console.log(`\n✅ Blended "You May Also Like" Feed (${blended.length} items):`);
    blended.forEach((item, idx) => {
      console.log(`${idx + 1}. [${item.name}] — Category: ${item.category_name || 'Uncategorized'}`);
    });

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

testMixedRecommendations();
