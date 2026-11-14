import { NextResponse } from 'next/server';
import { clearAuthCookies, getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(request) {
  const user = await getAuthUser(request);
  if (user) await db.update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, user.id));
  const response = NextResponse.json({ message: 'Signed out on all devices.' });
  return clearAuthCookies(response);
}
