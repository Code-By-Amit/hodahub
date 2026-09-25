const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    const category = 'mens-sunglasses';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
    console.log('Is category string a valid UUID?:', isUuid);

    const queryStr = isUuid
      ? "SELECT id, name, slug FROM categories WHERE slug = $1 OR id = $1;"
      : "SELECT id, name, slug FROM categories WHERE slug = $1;";

    const res = await pool.query(queryStr, [category]);
    console.log('Category Query Result:', res.rows);

    if (res.rows[0]) {
      const catId = res.rows[0].id;
      const prodsRes = await pool.query("SELECT id, name, category_id, price FROM products WHERE category_id = $1 LIMIT 5;", [catId]);
      console.log(`Products in category '${category}':`, prodsRes.rows);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
run();
