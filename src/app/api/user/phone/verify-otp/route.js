import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and, ne, isNotNull } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { verifyMSG91AccessToken } from '@/lib/msg91-server';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    const limit = await checkRateLimit('verify-profile-phone:' + user.id, 5, 300);
    if (!limit.success) return NextResponse.json({ error: 'Too many verification attempts.' }, { status: 429 });
    const { accessToken, phone } = await request.json();
    const verified = await verifyMSG91AccessToken(accessToken, phone);
    if (!verified.success || !verified.mobile) return NextResponse.json({ error: verified.error || 'Phone verification failed.' }, { status: 400 });
    const e164 = '+91' + verified.mobile;
    const [existing] = await db.select({ id: users.id }).from(users).where(and(eq(users.phone, e164), isNotNull(users.phoneVerifiedAt), ne(users.id, user.id))).limit(1);
    if (existing) return NextResponse.json({ error: 'This phone is already linked to another account. Please contact support.' }, { status: 409 });
    const [updated] = await db.update(users).set({ phone: e164, phoneVerifiedAt: new Date() }).where(eq(users.id, user.id)).returning({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, avatarUrl: users.avatarUrl });
    return NextResponse.json({ success: true, user: { ...updated, phoneVerified: true }, message: 'Phone verified successfully.' });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Unable to verify this phone. Please try again or contact support.' }, { status: 409 });
  }
}
