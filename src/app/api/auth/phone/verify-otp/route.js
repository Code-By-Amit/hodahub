import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, orders } from '@/lib/db/schema';
import { eq, or, like, isNull, sql, and } from 'drizzle-orm';
import { generateTokens, setAuthCookies } from '@/lib/auth';
import { verifyMSG91AccessToken } from '@/lib/msg91-server';

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { accessToken, phone } = body || {};

    if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
      return NextResponse.json(
        { error: 'MSG91 access token is required' },
        { status: 400 }
      );
    }

    // Verify MSG91 Access Token server-side strictly & enforce phone binding
    const verifyResult = await verifyMSG91AccessToken(accessToken.trim(), phone);

    if (!verifyResult.success || !verifyResult.mobile) {
      return NextResponse.json(
        { error: verifyResult.error || 'OTP verification failed. Invalid or expired token.' },
        { status: 400 }
      );
    }

    const clean10 = verifyResult.mobile;
    const formatted12 = verifyResult.formattedMobile || `91${clean10}`;

    // --- DB Lookup: find existing user by phone ---
    let matchedUser = null;
    try {
      const rows = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.phone, clean10),
            eq(users.phone, formatted12),
            like(users.phone, `%${clean10}`)
          )
        )
        .limit(1);

      matchedUser = rows[0] || null;
    } catch (lookupErr) {
      console.error('[Phone OTP Verify API] DB lookup error:', lookupErr instanceof Error ? lookupErr.message : lookupErr);
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
            name: 'User',
            isVerified: true,
            role: 'customer',
          })
          .returning();

        matchedUser = inserted[0] || null;
      } catch (insertErr) {
        console.error('[Phone OTP Verify API] User insert failed:', insertErr instanceof Error ? insertErr.message : insertErr);
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
      await db
        .update(orders)
        .set({ userId: matchedUser.id })
        .where(
          and(
            isNull(orders.userId),
            sql`RIGHT(REGEXP_REPLACE(COALESCE(${orders.guestPhone}, ''), '[^0-9]', '', 'g'), 10) = ${clean10}`
          )
        );
    } catch (e) {
      console.warn('[Phone OTP Verify API] Guest order linking skipped:', e instanceof Error ? e.message : e);
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
    const errMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('[Phone OTP Verify API Unexpected error]:', errMessage);
    return NextResponse.json(
      { error: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}
