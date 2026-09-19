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

    const { phone } = await request.json();

    if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save phone and OTP details
    await db
      .update(users)
      .set({
        phone: cleanPhone,
        phoneVerified: false,
        phoneOtp: otp,
        phoneOtpExpiresAt: otpExpiresAt,
      })
      .where(eq(users.id, user.id));

    // TODO: Wire real SMS provider (e.g. MSG91, Fast2SMS, Twilio) here when SMS API key is configured.
    // Resend (used for email OTP) is an email-only service and cannot deliver SMS messages.
    // Currently, OTP is logged to the server console for testing/development.
    console.log(`[SMS OTP SERVICE STUB] Phone OTP generated for user ${user.email} (${cleanPhone}): ${otp}`);

    return NextResponse.json({
      message: 'OTP generated. (Dev mode: Check server console for OTP code)',
      // In dev mode when no SMS provider key is configured, return demo flag
      demoOtp: process.env.NODE_ENV === 'development' ? otp : undefined,
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Send phone OTP error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
