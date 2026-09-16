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

    // Verify OTP matching current logged-in user
    const [matchedUser] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, user.id),
          eq(users.phoneOtp, otp.trim()),
          gt(users.phoneOtpExpiresAt, new Date())
        )
      )
      .limit(1);

    if (!matchedUser) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP. Please try again.' },
        { status: 400 }
      );
    }

    // Mark phone as verified and clear OTP
    const [updatedUser] = await db
      .update(users)
      .set({
        phoneVerified: true,
        phoneOtp: null,
        phoneOtpExpiresAt: null,
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
        phoneVerified: updatedUser.phoneVerified,
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
