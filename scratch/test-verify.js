import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { db } = await import('../src/lib/db/index.js');
  const { users, orders } = await import('../src/lib/db/schema.js');
  const { eq, or, like, isNull, sql, and: andOrm } = await import('drizzle-orm');
  const { verifyMSG91AccessToken } = await import('../src/lib/msg91.js');

  console.log('--- TEST 1: MSG91 TOKEN VERIFICATION ---');
  const tokenTest1 = await verifyMSG91AccessToken('OTP verified success', '919876543210');
  console.log('Result for "OTP verified success":', tokenTest1);

  const tokenTest2 = await verifyMSG91AccessToken('DEV_STUB_TOKEN_12345', '919876543210');
  console.log('Result for DEV_STUB_TOKEN:', tokenTest2);

  console.log('\n--- TEST 2: DB USER QUERY & GUEST ORDERS UPDATE ---');
  const clean10 = '9876543210';
  const formattedPhone = '919876543210';

  let [matchedUser] = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.phone, clean10),
        eq(users.phone, formattedPhone),
        like(users.phone, `%${clean10}`)
      )
    )
    .limit(1);

  console.log('Matched User:', matchedUser);

  if (!matchedUser) {
    console.log('Creating minimal user account...');
    [matchedUser] = await db
      .insert(users)
      .values({
        phone: clean10,
        email: null,
        name: null,
        isVerified: true,
        role: 'customer',
      })
      .returning();
    console.log('Created User:', matchedUser);
  }

  console.log('Updating guest orders...');
  try {
    await db
      .update(orders)
      .set({ userId: matchedUser.id })
      .where(
        andOrm(
          isNull(orders.userId),
          sql`RIGHT(REGEXP_REPLACE(COALESCE(${orders.guestPhone}, ''), '[^0-9]', '', 'g'), 10) = ${clean10}`
        )
      );
    console.log('Guest orders updated successfully!');
  } catch (err) {
    console.error('Error updating guest orders:', err);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Main exception:', err);
  process.exit(1);
});
