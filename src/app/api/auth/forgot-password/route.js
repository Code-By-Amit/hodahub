import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateOTP } from '@/lib/auth';
import { sendPasswordResetEmail } from '@/lib/email';
import { forgotPasswordSchema } from '@/lib/validations';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = forgotPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const cleanEmail = email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (!user) {
      // Don't reveal if email exists for security privacy
      return NextResponse.json({
        message: 'If an account exists with this email, a password reset code has been sent.',
      });
    }

    const resetOtp = generateOTP();
    const resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await db
      .update(users)
      .set({
        resetOtp,
        resetOtpExpiresAt,
        resetOtpAttempts: 0,
      })
      .where(eq(users.id, user.id));

    await sendPasswordResetEmail(cleanEmail, resetOtp);

    return NextResponse.json({
      message: 'Password reset code sent to your email.',
      email: cleanEmail,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
