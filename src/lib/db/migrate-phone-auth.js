import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

async function runPhoneAuthMigration() {
  console.log('🔄 Starting Phone Auth Database Migration...');

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
    // 1. Make `users.email` nullable
    console.log('👤 Updating `users` table: making `email` column nullable...');
    await client.query(`
      ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    `);

    // 2. Ensure unique constraint/index on `users.phone`
    console.log('📱 Adding unique constraint/index on `users.phone` if not exists...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx ON users(phone) WHERE phone IS NOT NULL;
    `);

    // 3. Create `phone_otps` table
    console.log('🔐 Creating `phone_otps` table for OTP rate limiting & verification...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS phone_otps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) NOT NULL,
        otp_hash TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
        daily_count INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS phone_otps_phone_idx ON phone_otps(phone);
    `);

    // 4. Add rate limit settings columns to `store_settings`
    console.log('⚙️ Adding `max_otp_requests_per_day` and `otp_resend_cooldown_seconds` to `store_settings`...');
    await client.query(`
      ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS max_otp_requests_per_day INTEGER NOT NULL DEFAULT 4;
    `);
    await client.query(`
      ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS otp_resend_cooldown_seconds INTEGER NOT NULL DEFAULT 45;
    `);

    console.log('🎉 Phone Auth Migration Completed Successfully!');
  } catch (error) {
    console.error('❌ Migration Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runPhoneAuthMigration();
