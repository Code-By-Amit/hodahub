import jwt from 'jsonwebtoken';
import { randomInt } from 'crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function generateTokens(user) {
  const payload = {
    id: user.id,
    sessionVersion: user.sessionVersion || 0,
    email: user.email || null,
    phone: user.phone || null,
    role: user.role,
    name: user.name || 'User',
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    return null;
  }
}

export function setAuthCookies(response, { accessToken, refreshToken }) {
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  });

  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}

export function clearAuthCookies(response) {
  response.cookies.set('access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}

export async function getAuthUser(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  let userObj = null;
  let tokenSessionVersion = 0;

  if (token) {
    const decoded = verifyAccessToken(token);
    if (decoded) {
      tokenSessionVersion = decoded.sessionVersion || 0;
      userObj = {
        id: decoded.id,
        email: decoded.email || null,
        phone: decoded.phone || null,
        role: decoded.role,
        name: decoded.name || 'User',
      };
    }
  }

  // Attempt refresh token fallback
  if (!userObj) {
    const refreshToken = cookieStore.get('refresh_token')?.value;
    if (refreshToken) {
      const refreshDecoded = verifyRefreshToken(refreshToken);
      if (refreshDecoded) {
        tokenSessionVersion = refreshDecoded.sessionVersion || 0;
        userObj = {
          id: refreshDecoded.id,
          email: refreshDecoded.email || null,
          phone: refreshDecoded.phone || null,
          role: refreshDecoded.role,
          name: refreshDecoded.name || 'User',
        };
      }
    }
  }

  if (!userObj) return null;

  // Always sync latest user profile & role from DB so role promotions/demotions take effect immediately
  try {
    const [dbUser] = await db
      .select({ id: users.id, email: users.email, phone: users.phone, role: users.role, name: users.name, sessionVersion: users.sessionVersion })
      .from(users)
      .where(eq(users.id, userObj.id))
      .limit(1);

    if (dbUser && dbUser.sessionVersion === tokenSessionVersion) {
      userObj = {
        id: dbUser.id,
        sessionVersion: dbUser.sessionVersion,
        email: dbUser.email || null,
        phone: dbUser.phone || null,
        role: dbUser.role,
        name: dbUser.name || 'User',
      };
    } else {
      return null;
    }
  } catch { return null; }

  return userObj;
}

export async function requireAuth(request) {
  const user = await getAuthUser(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requireAdmin(request) {
  const user = await requireAuth(request);
  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }
  return user;
}

export function generateOTP() {
  return randomInt(100000, 1000000).toString();
}
