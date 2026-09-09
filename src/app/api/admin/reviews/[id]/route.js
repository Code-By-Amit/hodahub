import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
    if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [updated] = await db.update(reviews).set({ isHidden: !review.isHidden }).where(eq(reviews.id, id)).returning();
    return NextResponse.json({ review: updated });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    await db.delete(reviews).where(eq(reviews.id, id));
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden')
      return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
