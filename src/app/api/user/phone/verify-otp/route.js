import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    const { otp } = await request.json();

    if (!otp || typeof otp !== 'string') {
      return NextResponse.json({ error: 'OTP is required' }, { status: 400 });
    }

    // 1. If user phone is already verified, return immediately
    const [currentUserRecord] = await db
      .select({
        id: users.id,
        phone: users.phone,
        passwordHash: users.passwordHash,
        isVerified: users.isVerified,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    const isPhoneAuth = Boolean(currentUserRecord?.phone && (!currentUserRecord?.passwordHash || !currentUserRecord?.email));
    if (currentUserRecord?.phone && (currentUserRecord?.isVerified || isPhoneAuth)) {
      return NextResponse.json({
        message: 'Phone number is already verified.',
        user: {
          id: currentUserRecord.id,
          name: currentUserRecord.name,
          email: currentUserRecord.email,
          phone: currentUserRecord.phone,
          phoneVerified: true,
          avatarUrl: currentUserRecord.avatarUrl,
        },
      });
    }

    // 2. Verify OTP matching current logged-in user
    const [matchedUser] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, user.id),
          eq(users.otp, otp.trim()),
          gt(users.otpExpiresAt, new Date())
        )
      )
      .limit(1);

    if (!matchedUser) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP. Please try again.' },
        { status: 400 }
      );
    }

    // 3. Mark user as verified, normalize phone to E.164, and clear OTP
    const cleanDigits = matchedUser.phone ? matchedUser.phone.replace(/\D/g, '').slice(-10) : '';
    const e164Phone = cleanDigits ? `+91${cleanDigits}` : matchedUser.phone;

    const [updatedUser] = await db
      .update(users)
      .set({
        phone: e164Phone,
        isVerified: true,
        otp: null,
        otpExpiresAt: null,
      })
      .where(eq(users.id, user.id))
      .returning();

    return NextResponse.json({
      message: 'Mobile number verified successfully!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        phoneVerified: true,
        avatarUrl: updatedUser.avatarUrl,
      },
    });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Verify phone OTP error:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
