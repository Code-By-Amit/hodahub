import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request) {
  try {
    const authUser = await getAuthUser(request);

    if (!authUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const [dbUser] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isVerified: users.isVerified,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    const finalUser = dbUser || authUser;
    return NextResponse.json({
      user: {
        ...finalUser,
        name: finalUser.name || 'User',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }
}
