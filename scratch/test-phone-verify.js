import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testPhoneAuth() {
  console.log('🔍 Testing Database Connection and Users table schema for phone auth...');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL missing');
    process.exit(1);
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new pg.Client({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    console.log('1. Checking `users` table columns...');
    const colsRes = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    console.log('Users columns:', colsRes.rows);

    console.log('\n2. Testing SELECT query by phone...');
    const testPhone = '9876543210';
    const selRes = await client.query(`
      SELECT * FROM users WHERE phone = $1 OR phone = $2 OR phone LIKE $3 LIMIT 1;
    `, [testPhone, `91${testPhone}`, `%${testPhone}`]);
    console.log('Select result count:', selRes.rows.length);

    console.log('\n3. Testing INSERT for new phone user...');
    const dummyPhone = '999' + Math.floor(1000000 + Math.random() * 9000000);
    const insRes = await client.query(`
      INSERT INTO users (phone, email, name, is_verified, role)
      VALUES ($1, NULL, NULL, true, 'customer')
      RETURNING id, phone, email, name, role, is_verified;
    `, [dummyPhone]);
    console.log('Inserted user successfully:', insRes.rows[0]);

    // Clean up dummy user
    await client.query(`DELETE FROM users WHERE id = $1;`, [insRes.rows[0].id]);
    console.log('Cleaned up dummy user.');

    console.log('\n✅ Database test passed cleanly!');
  } catch (error) {
    console.error('❌ Database test error:', error);
  } finally {
    await client.end();
  }
}

testPhoneAuth();
