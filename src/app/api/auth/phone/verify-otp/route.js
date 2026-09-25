import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, or, like } from 'drizzle-orm';
import { generateTokens, setAuthCookies } from '@/lib/auth';
import { formatIndianMobile, verifyMSG91AccessToken } from '@/lib/msg91';

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, accessToken, reqId, otp } = body;

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

    const formattedPhone = formatIndianMobile(clean10);

    // Verify MSG91 Access Token server-side if token is present
    if (accessToken) {
      const verifyResult = await verifyMSG91AccessToken(accessToken, formattedPhone);
      if (!verifyResult.success) {
        return NextResponse.json(
          { error: verifyResult.message || 'MSG91 OTP verification failed server-side' },
          { status: 400 }
        );
      }
    }

    // Search for existing user account by phone number
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

    // If user does not exist, create minimal phone-only user account
    if (!matchedUser) {
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
    }

    // Automatically associate past guest orders matching phone with this account
    try {
      const { orders } = await import('@/lib/db/schema');
      const { isNull, sql, and: andOrm } = await import('drizzle-orm');
      await db
        .update(orders)
        .set({ userId: matchedUser.id })
        .where(
          andOrm(
            isNull(orders.userId),
            sql`RIGHT(REGEXP_REPLACE(COALESCE(${orders.guestPhone}, ''), '[^0-9]', 'g'), 10) = ${clean10}`
          )
        );
    } catch (e) {
      console.warn('[Phone OTP Verify Route] Note on linking guest orders:', e.message || e);
    }

    const userPayload = {
      id: matchedUser.id,
      name: matchedUser.name || 'Customer',
      email: matchedUser.email || null,
      phone: matchedUser.phone || clean10,
      role: matchedUser.role,
    };

    // Issue JWT access and refresh tokens
    const tokens = generateTokens(userPayload);

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully!',
      user: userPayload,
    });

    setAuthCookies(response, tokens);
    return response;
  } catch (error) {
    console.error('Verify MSG91 phone OTP server error:', error.stack || error);
    return NextResponse.json({ error: error.message || 'Failed to verify OTP. Please try again.' }, { status: 500 });
  }
}
