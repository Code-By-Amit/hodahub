import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateOTP } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(`resend-otp:${ip}`, 3, 15 * 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many OTP resend requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Throttle: check if OTP was sent less than 60 seconds ago
    if (user.otpExpiresAt) {
      const otpSentAt = new Date(user.otpExpiresAt.getTime() - 10 * 60 * 1000);
      const secondsSinceSent = (Date.now() - otpSentAt.getTime()) / 1000;
      if (secondsSinceSent < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceSent);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before requesting a new OTP` },
          { status: 429 }
        );
      }
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db
      .update(users)
      .set({ otp, otpExpiresAt })
      .where(eq(users.id, user.id));

    await sendOTPEmail(email, otp);

    return NextResponse.json({
      message: 'OTP sent successfully!',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
