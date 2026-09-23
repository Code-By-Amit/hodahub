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

export async function PATCH(request) {
  try {
    await requireAdmin(request);
    const { userId, role } = await request.json();
    if (!userId || !role || !['customer', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Valid userId and role ("customer" or "admin") are required' }, { status: 400 });
    }

    const [user] = await db.update(users).set({ role }).where(eq(users.id, userId)).returning();
    return NextResponse.json({ user });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
