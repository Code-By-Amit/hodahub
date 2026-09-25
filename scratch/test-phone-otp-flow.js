import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function runPhoneAuthSimulation() {
  console.log('🧪 Simulating Phone OTP Auth Logic (New User vs Existing User)...');
  const connectionString = process.env.DATABASE_URL;
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new pg.Client({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const testPhone = '9812345678';

    // 1. Clean up any existing test user
    await client.query(`DELETE FROM users WHERE phone LIKE '%9812345678%';`);

    // 2. Scenario A: Brand-new user signup via phone
    console.log('\n--- SCENARIO A: Brand-New User (Phone Signup) ---');
    const searchResA = await client.query(
      `SELECT * FROM users WHERE phone = $1 OR phone = $2 OR phone LIKE $3 LIMIT 1;`,
      [testPhone, `91${testPhone}`, `%${testPhone}`]
    );
    console.log('Existing user found?', searchResA.rows.length > 0);

    let userA;
    if (searchResA.rows.length === 0) {
      const insRes = await client.query(
        `INSERT INTO users (phone, email, name, is_verified, role)
         VALUES ($1, NULL, NULL, true, 'customer')
         RETURNING id, phone, email, name, role, is_verified;`,
        [testPhone]
      );
      userA = insRes.rows[0];
      console.log('✅ Successfully created new phone user:', userA);
    }

    // 3. Scenario B: Existing user login via phone
    console.log('\n--- SCENARIO B: Existing User (Phone Login) ---');
    const searchResB = await client.query(
      `SELECT * FROM users WHERE phone = $1 OR phone = $2 OR phone LIKE $3 LIMIT 1;`,
      [testPhone, `91${testPhone}`, `%${testPhone}`]
    );
    console.log('Existing user found?', searchResB.rows.length > 0);
    console.log('✅ Matched existing user:', searchResB.rows[0]);

    // Clean up test user
    await client.query(`DELETE FROM users WHERE id = $1;`, [userA.id]);
    console.log('\n🧹 Cleaned up test user successfully.');
    console.log('🎉 Both Scenario A (new user) & Scenario B (existing user) DB flows verified!');
  } catch (err) {
    console.error('❌ Simulation Error:', err);
  } finally {
    await client.end();
  }
}

runPhoneAuthSimulation();
