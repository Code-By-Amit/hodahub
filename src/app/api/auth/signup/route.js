import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateOTP } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

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

    const { name, email, password } = await request.json();

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

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

        await db
          .update(users)
          .set({ otp, otpExpiresAt, name, passwordHash: await bcrypt.hash(password, 10) })
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

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
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
