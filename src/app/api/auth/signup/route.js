import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateOTP } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

import { signupSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function POST(request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(`signup:${ip}`, 5, 60 * 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    const parseResult = signupSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        formatZodErrorResponse(parseResult, 'Invalid signup details'),
        { status: 400 }
      );
    }

    const { name, email, password, phone } = parseResult.data;

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingUser.length > 0) {
      const user = existingUser[0];
      // If user exists but not verified, resend OTP
      if (!user.isVerified) {
        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        const userName = name && typeof name === 'string' && name.trim() ? name.trim() : null;

        await db
          .update(users)
          .set({ otp, otpExpiresAt, ...(userName && { name: userName }), passwordHash: await bcrypt.hash(password, 10) })
          .where(eq(users.id, user.id));

        await sendOTPEmail(email, otp);

        return NextResponse.json({
          message: 'OTP sent to your email. Please verify to continue.',
          email: email.toLowerCase().trim(),
          requiresVerification: true,
        });
      }

      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const userName = name && typeof name === 'string' && name.trim() ? name.trim() : null;

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        name: userName,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'customer',
        isVerified: false,
        otp,
        otpExpiresAt,
      })
      .returning();

    // Send OTP email
    await sendOTPEmail(email, otp);

    return NextResponse.json({
      message: 'Account created! OTP sent to your email. Please verify to continue.',
      email: newUser.email,
      requiresVerification: true,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
