import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { generateTokens, setAuthCookies } from '@/lib/auth';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(`verify-otp:${ip}`, 5, 15 * 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Find user with matching email and valid OTP
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email.toLowerCase().trim()),
          eq(users.otp, otp.toString()),
          gt(users.otpExpiresAt, new Date())
        )
      )
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP. Please try again.' },
        { status: 400 }
      );
    }

    // Mark user as verified, clear OTP fields
    await db
      .update(users)
      .set({
        isVerified: true,
        otp: null,
        otpExpiresAt: null,
      })
      .where(eq(users.id, user.id));

    // Automatically associate past guest orders with this account
    try {
      const { orders } = await import('@/lib/db/schema');
      const { isNull, sql } = await import('drizzle-orm');
      await db
        .update(orders)
        .set({ userId: user.id })
        .where(
          and(
            isNull(orders.userId),
            sql`LOWER(${orders.guestEmail}) = ${user.email.toLowerCase()}`
          )
        );
    } catch (e) {
      console.error('Failed to link guest orders on verify OTP:', e);
    }

    // Generate tokens and set cookies
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
      message: 'Email verified successfully!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });

    return setAuthCookies(response, tokens);
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
