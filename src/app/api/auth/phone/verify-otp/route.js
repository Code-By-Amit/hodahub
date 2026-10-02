import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, or, like } from 'drizzle-orm';
import { generateTokens, setAuthCookies } from '@/lib/auth';
import { formatIndianMobile, verifyMSG91AccessToken } from '@/lib/msg91';

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, accessToken } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    const digitsOnly = phone.replace(/\D/g, '');
    const clean10 = digitsOnly.slice(-10);

    if (clean10.length !== 10 || !/^[6-9]\d{9}$/.test(clean10)) {
      return NextResponse.json(
        { error: 'Please enter a valid 10-digit Indian mobile number' },
        { status: 400 }
      );
    }

    const formattedPhone = formatIndianMobile(clean10); // e.g. "919328404471"

    // Verify MSG91 Access Token server-side if token is present
    if (accessToken) {
      const verifyResult = await verifyMSG91AccessToken(accessToken, formattedPhone);
      if (!verifyResult.success) {
        return NextResponse.json(
          { error: verifyResult.message || 'OTP verification failed. Please try again.' },
          { status: 400 }
        );
      }
    }

    // --- DB Lookup: find existing user by phone ---
    let matchedUser = null;
    try {
      const rows = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.phone, clean10),        // stored as "9328404471"
            eq(users.phone, formattedPhone), // stored as "919328404471"
            like(users.phone, `%${clean10}`) // ends with the 10-digit number
          )
        )
        .limit(1);
      matchedUser = rows[0] ?? null;
    } catch (lookupErr) {
      console.error('[Phone OTP Verify] DB lookup failed:', lookupErr?.stack || lookupErr);
      return NextResponse.json(
        { error: 'Failed to look up your account. Please try again.' },
        { status: 500 }
      );
    }

    // --- Create new user if not found ---
    if (!matchedUser) {
      try {
        const inserted = await db
          .insert(users)
          .values({
            phone: clean10,
            // email is intentionally omitted — Postgres allows multiple NULLs in unique columns
            name: 'User',
            isVerified: true,
            role: 'customer',
          })
          .returning();
        matchedUser = inserted[0] ?? null;
      } catch (insertErr) {
        console.error('[Phone OTP Verify] User insert failed:', insertErr?.stack || insertErr);
        return NextResponse.json(
          { error: 'Failed to create your account. Please try again.' },
          { status: 500 }
        );
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { error: 'Unable to authenticate. Please try again.' },
        { status: 500 }
      );
    }

    // Automatically associate past guest orders matching this phone number
    try {
      const { orders } = await import('@/lib/db/schema');
      const { isNull, sql, and: andOrm } = await import('drizzle-orm');
      await db
        .update(orders)
        .set({ userId: matchedUser.id })
        .where(
          andOrm(
            isNull(orders.userId),
            sql`RIGHT(REGEXP_REPLACE(COALESCE(${orders.guestPhone}, ''), '[^0-9]', '', 'g'), 10) = ${clean10}`
          )
        );
    } catch (e) {
      // Non-fatal: just log and continue
      console.warn('[Phone OTP Verify] Guest order linking skipped:', e?.message || e);
    }

    const displayName =
      matchedUser.name && matchedUser.name !== 'Customer' ? matchedUser.name : 'User';

    const userPayload = {
      id: matchedUser.id,
      name: displayName,
      email: matchedUser.email || null,
      phone: matchedUser.phone || clean10,
      role: matchedUser.role,
    };

    const tokens = generateTokens(userPayload);

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully!',
      user: userPayload,
    });

    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    console.error('[Phone OTP Verify] Unexpected error:', error?.stack || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}
