import { routeHandler, ApiResponse } from '@/lib/route-handler';
import { db } from '@/lib/db';
import { happyCustomers } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export const GET = routeHandler({
  auth: false,
  handler: async () => {
    const published = await db
      .select({ id: happyCustomers.id, imageUrl: happyCustomers.imageUrl, caption: happyCustomers.caption })
      .from(happyCustomers)
      .where(eq(happyCustomers.isActive, true))
      .orderBy(asc(happyCustomers.sortOrder), asc(happyCustomers.createdAt));

    return ApiResponse.success({ happyCustomers: published });
  },
});
