import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const list = await db.select({
      id: users.id, name: users.name, email: users.email,
      role: users.role, isVerified: users.isVerified, createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);

    const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(users);
    return NextResponse.json({ users: list, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { error: 'Email and a password of at least 6 characters are required' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const targetRole = role === 'admin' ? 'admin' : 'customer';

    // Check if user with email already exists
    const [existing] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, cleanEmail))
      .limit(1);

    if (existing) {
      // If user exists, update their role to the requested targetRole
      const [updated] = await db
        .update(users)
        .set({ role: targetRole, isVerified: true })
        .where(eq(users.id, existing.id))
        .returning();

      return NextResponse.json({
        user: updated,
        message: `Existing user's role updated to ${targetRole}`,
      });
    }

    const bcrypt = (await import('bcryptjs')).default;
    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        name: name ? name.trim() : 'Admin User',
        email: cleanEmail,
        passwordHash,
        role: targetRole,
        isVerified: true,
      })
      .returning();

    return NextResponse.json(
      { user: newUser, message: `New ${targetRole} account created successfully!` },
      { status: 201 }
    );
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Create admin user error:', error);
    return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await requireAdmin(request);
    const { userId, role } = await request.json();
    if (!userId || !role || !['customer', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid userId and role ("customer" or "admin") are required' },
        { status: 400 }
      );
    }

    const [user] = await db.update(users).set({ role }).where(eq(users.id, userId)).returning();
    return NextResponse.json({ user });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
