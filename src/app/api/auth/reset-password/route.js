import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { resetPasswordSchema } from '@/lib/validations';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(`reset-password:${ip}`, 10, 15 * 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many reset attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = resetPasswordSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Invalid request data' },
        { status: 400 }
      );
    }

    const { email, otp, newPassword } = result.data;
    const cleanEmail = email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (!user || !user.resetOtp || !user.resetOtpExpiresAt) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset request. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(user.resetOtpExpiresAt) < new Date()) {
      await db
        .update(users)
        .set({ resetOtp: null, resetOtpExpiresAt: null, resetOtpAttempts: 0 })
        .where(eq(users.id, user.id));
      return NextResponse.json(
        { error: 'Reset code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check attempt limits (5-attempt lockout)
    if (user.resetOtpAttempts >= 5) {
      await db
        .update(users)
        .set({ resetOtp: null, resetOtpExpiresAt: null, resetOtpAttempts: 0 })
        .where(eq(users.id, user.id));
      return NextResponse.json(
        { error: 'Too many failed attempts. Reset code locked. Please request a new code.' },
        { status: 429 }
      );
    }

    // Verify OTP match
    if (user.resetOtp !== otp.trim()) {
      await db
        .update(users)
        .set({ resetOtpAttempts: user.resetOtpAttempts + 1 })
        .where(eq(users.id, user.id));

      const remaining = 5 - (user.resetOtpAttempts + 1);
      return NextResponse.json(
        { error: `Invalid reset code. ${remaining} attempt(s) remaining.` },
        { status: 400 }
      );
    }

    // Hash new password and clear reset fields
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({
        passwordHash,
        resetOtp: null,
        resetOtpExpiresAt: null,
        resetOtpAttempts: 0,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
