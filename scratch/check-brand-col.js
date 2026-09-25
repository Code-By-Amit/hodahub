import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from '../src/lib/db/index.js';
import { sql } from 'drizzle-orm';

async function checkColumns() {
  try {
    const res = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products';
    `);
    console.log('Columns in products table:');
    console.log(res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error checking columns:', err);
    process.exit(1);
  }
}

checkColumns();
