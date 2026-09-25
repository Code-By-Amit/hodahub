import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testBestSellersQuery() {
  console.log('🧪 Testing Sales-Based Best Sellers Query...');

  const connectionString = process.env.DATABASE_URL;
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new pg.Client({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const query = `
      WITH valid_sales AS (
        SELECT 
          oi.product_id, 
          COALESCE(SUM(oi.quantity), 0)::int AS total_sales
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled' 
          AND o.payment_status != 'failed'
          AND (o.payment_status = 'paid' OR o.status IN ('confirmed', 'packed', 'shipped', 'delivered'))
        GROUP BY oi.product_id
      )
      SELECT 
        p.id, 
        p.name, 
        p.is_best_seller, 
        p.units_sold, 
        COALESCE(vs.total_sales, 0) AS real_order_sales,
        GREATEST(p.units_sold, COALESCE(vs.total_sales, 0)) AS combined_sales,
        p.created_at
      FROM products p
      LEFT JOIN valid_sales vs ON p.id = vs.product_id
      WHERE p.is_active = true 
        AND p.is_out_of_stock = false 
        AND p.stock > 0
      ORDER BY 
        p.is_best_seller DESC, 
        GREATEST(p.units_sold, COALESCE(vs.total_sales, 0)) DESC, 
        p.created_at DESC, 
        p.id DESC
      LIMIT 8;
    `;

    const res = await client.query(query);
    console.log(`✅ Returned ${res.rows.length} Best Seller products:`);
    res.rows.forEach((row, idx) => {
      console.log(
        `${idx + 1}. [${row.name}] | Pinned: ${row.is_best_seller} | Real Sales: ${row.real_order_sales} | Table units_sold: ${row.units_sold} | Combined: ${row.combined_sales}`
      );
    });

  } catch (err) {
    console.error('❌ Query Error:', err);
  } finally {
    await client.end();
  }
}

testBestSellersQuery();
