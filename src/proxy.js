import { NextResponse } from 'next/server';
import {
  verifyAccessToken,
  verifyRefreshToken,
  generateTokens,
  setAuthCookies,
} from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Protected routes requiring user login
const protectedRoutes = ['/orders', '/profile'];

// Admin routes requiring admin role
const adminRoutes = ['/admin'];

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!isAdminRoute && !isProtectedRoute) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  let decodedUser = null;
  let responseToReturn = NextResponse.next();

  if (accessToken) {
    decodedUser = verifyAccessToken(accessToken);
  }

  // If access token is missing or expired, attempt refresh token fallback
  if (!decodedUser && refreshToken) {
    const refreshPayload = verifyRefreshToken(refreshToken);
    if (refreshPayload) {
      try {
        // Verify user still exists in DB and fetch current role
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, refreshPayload.id))
          .limit(1);

        if (dbUser) {
          decodedUser = {
            id: dbUser.id,
            email: dbUser.email,
            role: dbUser.role,
            name: dbUser.name,
          };
          const newTokens = generateTokens(decodedUser);
          setAuthCookies(responseToReturn, newTokens);
        }
      } catch {
        // Fallback to token payload if DB query fails during transient issue
        decodedUser = {
          id: refreshPayload.id,
          email: refreshPayload.email,
          role: refreshPayload.role,
          name: refreshPayload.name,
        };
        const newTokens = generateTokens(decodedUser);
        setAuthCookies(responseToReturn, newTokens);
      }
    }
  }

  // Redirect unauthenticated users to login
  if (!decodedUser) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Restrict admin routes to admin users only
  if (isAdminRoute && decodedUser.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return responseToReturn;
}

export const config = {
  matcher: ['/admin/:path*', '/orders/:path*', '/profile/:path*'],
};
