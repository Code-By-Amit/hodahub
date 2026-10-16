// Shared authorization contract for customer-facing order endpoints.
// Deliberately free of database and Next.js imports so it can be unit tested directly.

export function canAccessOrder(user, order, accessCode) {
  if (!order) return false;
  if (user?.role === 'admin') return true;

  if (order.userId) {
    return !!user && user.id === order.userId;
  }

  if (accessCode && order.accessCode && accessCode === order.accessCode) {
    return true;
  }

  // users.email is nullable (phone-only accounts) and orders.guestEmail is nullable (guest
  // orders created with isGuest without an email). A bare equality would match null === null and
  // grant any email-less caller access to every email-less guest order.
  return !!user?.email && !!order.guestEmail && user.email === order.guestEmail;
}
