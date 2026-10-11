import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import pg from 'pg';

async function backfillPhones() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is missing');
    process.exit(1);
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const client = new pg.Client({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to DB for phone normalization backfill...');

  try {
    // 1. Fetch users with non-null phone numbers
    const res = await client.query(`
      SELECT id, name, email, phone, is_verified 
      FROM users 
      WHERE phone IS NOT NULL AND phone != '';
    `);

    console.log(`Found ${res.rows.length} users with phone numbers.`);

    let updatedCount = 0;
    for (const row of res.rows) {
      const raw = row.phone.trim();
      const digits = raw.replace(/\D/g, '');
      const clean10 = digits.slice(-10);

      if (clean10 && clean10.length === 10) {
        const e164 = `+91${clean10}`;
        if (raw !== e164) {
          await client.query(`
            UPDATE users 
            SET phone = $1, is_verified = true 
            WHERE id = $2;
          `, [e164, row.id]);
          console.log(`Updated user ${row.id} (${row.name || 'unnamed'}): "${raw}" -> "${e164}"`);
          updatedCount++;
        }
      }
    }

    console.log(`Backfill complete. ${updatedCount} user record(s) normalized to E.164 (+91XXXXXXXXXX).`);
  } catch (err) {
    console.error('Backfill error:', err);
  } finally {
    await client.end();
  }
}

backfillPhones().catch(console.error);
