import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateTokens, setAuthCookies, generateOTP } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

import { loginSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function POST(request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(`login:${ip}`, 5, 15 * 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        formatZodErrorResponse(parseResult, 'Invalid credentials'),
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'This account was created using Google Sign-In. Please sign in with Google.' },
        { status: 400 }
      );
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if verified
    if (!user.isVerified) {
      // Resend OTP
      const otp = generateOTP();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db
        .update(users)
        .set({ otp, otpExpiresAt })
        .where(eq(users.id, user.id));

      await sendOTPEmail(user.email, otp);

      return NextResponse.json(
        {
          error: 'Please verify your email first. A new OTP has been sent.',
          requiresVerification: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    // Automatically associate past guest orders with this account
    try {
      const { orders } = await import('@/lib/db/schema');
      const { isNull, sql, and } = await import('drizzle-orm');
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
      console.error('Failed to link guest orders on login:', e);
    }

    // Generate tokens
    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
      message: 'Login successful!',
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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
