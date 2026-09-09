import { NextResponse } from 'next/server';
import {
  verifyAccessToken,
  verifyRefreshToken,
  generateTokens,
  setAuthCookies,
} from '@/lib/auth';

// Routes that require authentication
const protectedRoutes = ['/checkout', '/orders'];

// Routes that require admin role
const adminRoutes = ['/admin'];

export function proxy(request) {
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

  // If access token is missing or expired, attempt refresh
  if (!decodedUser && refreshToken) {
    const refreshPayload = verifyRefreshToken(refreshToken);
    if (refreshPayload) {
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

  // If still unauthenticated, redirect to login
  if (!decodedUser) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin role requirement
  if (isAdminRoute && decodedUser.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return responseToReturn;
}

export const config = {
  matcher: ['/admin/:path*', '/checkout', '/orders/:path*'],
};
