import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, generateOTP } from '@/lib/auth';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    const ip = getClientIP(request);
    const rateLimit = await checkRateLimit(`phone_otp:${user.id}:${ip}`, 3, 300);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please wait 5 minutes before trying again.' },
        { status: 429 }
      );
    }

    // 1. Check if user phone is already verified
    const [existingUser] = await db
      .select({
        phone: users.phone,
        passwordHash: users.passwordHash,
        isVerified: users.isVerified,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const isPhoneAuth = Boolean(existingUser?.phone && (!existingUser?.passwordHash || !existingUser?.email));
    const alreadyVerified = Boolean(existingUser?.phone && (existingUser?.isVerified || isPhoneAuth));

    if (alreadyVerified) {
      return NextResponse.json(
        { error: 'Phone number is already verified' },
        { status: 400 }
      );
    }

    const { phone } = await request.json();

    if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save phone and OTP details using valid schema columns
    await db
      .update(users)
      .set({
        phone: cleanPhone,
        otp: otp,
        otpExpiresAt: otpExpiresAt,
      })
      .where(eq(users.id, user.id));

    // Never leak OTP in production logs or responses
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Dev Only] Phone OTP generated for user ${user.id} (${cleanPhone}): ${otp}`);
    }

    return NextResponse.json({
      message: 'OTP sent successfully to your mobile number.',
      ...(process.env.NODE_ENV === 'development' && { demoOtp: otp }),
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Send phone OTP error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
