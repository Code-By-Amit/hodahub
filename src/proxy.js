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
    // Order endpoints still enforce ownership or the scoped guest access code.
    if (/^\/orders\/[^/]+(?:\/invoice)?\/?$/.test(pathname)) return NextResponse.next();
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
        if (decodedUser) {
            try {
                const [current] = await db.select({ role: users.role, sessionVersion: users.sessionVersion }).from(users).where(eq(users.id, decodedUser.id)).limit(1);
                if (!current || current.sessionVersion !== (decodedUser.sessionVersion || 0)) decodedUser = null;
                else decodedUser.role = current.role;
            } catch { decodedUser = null; }
        }
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

                if (dbUser && dbUser.sessionVersion === (refreshPayload.sessionVersion || 0)) {
                    decodedUser = {
                        id: dbUser.id,
                        sessionVersion: dbUser.sessionVersion,
                        email: dbUser.email,
                        role: dbUser.role,
                        name: dbUser.name,
                    };
                    const newTokens = generateTokens(decodedUser);
                    setAuthCookies(responseToReturn, newTokens);
                }
            } catch {
                decodedUser = null;
            }
        }
    }

    // Redirect unauthenticated users to login
    if (!decodedUser) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
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
