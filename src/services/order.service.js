import { db } from '@/lib/db';
import { orders, users, orderItems, products, orderStatusHistory } from '@/lib/db/schema';
import { desc, sql, eq } from 'drizzle-orm';

export const orderService = {
  /**
   * Admin: List orders with parallelized count query and status filtering
   */
  async getAdminOrders({ page = 1, limit = 20, status = '' } = {}) {
    const offset = (page - 1) * limit;

    let where = undefined;
    if (status === 'payment_pending') {
      where = eq(orders.paymentStatus, 'pending');
    } else if (status) {
      where = eq(orders.status, status);
    }

    // Parallelize list and count queries
    const [list, [{ count }]] = await Promise.all([
      db
        .select({
          id: orders.id,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          paymentMethod: orders.paymentMethod,
          totalAmount: orders.totalAmount,
          createdAt: orders.createdAt,
          couponCode: orders.couponCode,
          guestName: orders.guestName,
          guestEmail: orders.guestEmail,
          guestPhone: orders.guestPhone,
          userName: users.name,
          userEmail: users.email,
          userPhone: users.phone,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(where)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql`count(*)::int` }).from(orders).where(where),
    ]);

    return {
      orders: list,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1,
      },
    };
  },

  /**
   * Admin: Quick update payment status (e.g. mark paid)
   */
  async updatePaymentStatus(orderId, paymentStatus) {
    const [updated] = await db
      .update(orders)
      .set({ paymentStatus })
      .where(eq(orders.id, orderId))
      .returning();

    if (!updated) {
      const error = new Error('Order not found');
      error.status = 404;
      throw error;
    }

    await db.insert(orderStatusHistory).values({
      orderId,
      status: updated.status,
      note: `Payment status updated to ${paymentStatus} by admin.`,
    });

    return updated;
  },
};
