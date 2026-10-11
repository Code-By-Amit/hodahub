import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, addresses } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { updateProfileSchema } from '@/lib/validations';
import { formatZodErrorResponse } from '@/lib/zod-utils';

export async function GET(request) {
  try {
    const authUser = await requireAuth(request);

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isVerified: users.isVerified,
        avatarUrl: users.avatarUrl,
        passwordHash: users.passwordHash,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, user.id))
      .orderBy(desc(addresses.createdAt));

    const isPhoneAuth = Boolean(user.phone && (!user.passwordHash || !user.email));
    const phoneVerified = Boolean(user.phone && (user.isVerified || isPhoneAuth));

    const userWithDefaults = {
      id: user.id,
      name: user.name || null,
      email: user.email || null,
      phone: user.phone || null,
      role: user.role,
      isVerified: Boolean(user.isVerified),
      phoneVerified,
      isPhoneAuth,
      avatarUrl: user.avatarUrl || null,
      createdAt: user.createdAt,
    };

    return NextResponse.json({ user: userWithDefaults, addresses: userAddresses });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const authUser = await requireAuth(request);
    const body = await request.json();

    const result = updateProfileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        formatZodErrorResponse(result, 'Invalid profile data'),
        { status: 400 }
      );
    }

    const { name, phone, avatarUrl } = result.data;

    // Check existing user phone status
    const [existing] = await db
      .select({
        phone: users.phone,
        passwordHash: users.passwordHash,
        isVerified: users.isVerified,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    const isPhoneAuth = Boolean(existing?.phone && (!existing?.passwordHash || !existing?.email));
    const alreadyPhoneVerified = Boolean(existing?.phone && (existing?.isVerified || isPhoneAuth));

    const updateFields = {
      name: name.trim(),
    };

    // If user is already phone verified or phone-auth, keep their verified phone unchanged
    if (alreadyPhoneVerified) {
      updateFields.phone = existing.phone;
    } else if (phone !== undefined) {
      updateFields.phone = phone ? phone.trim() : null;
    }

    if (avatarUrl !== undefined) {
      updateFields.avatarUrl = avatarUrl ? avatarUrl.trim() : null;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateFields)
      .where(eq(users.id, authUser.id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        isVerified: users.isVerified,
        avatarUrl: users.avatarUrl,
      });

    const userWithDefaults = {
      ...updatedUser,
      name: updatedUser.name || null,
      phoneVerified: alreadyPhoneVerified,
      isPhoneAuth,
    };

    return NextResponse.json({ user: userWithDefaults, message: 'Profile updated successfully!' });
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
