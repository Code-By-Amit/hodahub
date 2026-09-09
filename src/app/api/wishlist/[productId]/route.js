import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { wishlistItems } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function DELETE(req, { params }) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await params;

    await db
      .delete(wishlistItems)
      .where(
        and(
          eq(wishlistItems.userId, auth.id),
          eq(wishlistItems.productId, productId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
