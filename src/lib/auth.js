import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function generateTokens(user) {
  const payload = { id: user.id, email: user.email, role: user.role, name: user.name };

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

  if (token) {
    const decoded = verifyAccessToken(token);
    if (decoded) {
      userObj = { id: decoded.id, email: decoded.email, role: decoded.role, name: decoded.name };
    }
  }

  // Attempt refresh token fallback
  if (!userObj) {
    const refreshToken = cookieStore.get('refresh_token')?.value;
    if (refreshToken) {
      const refreshDecoded = verifyRefreshToken(refreshToken);
      if (refreshDecoded) {
        userObj = { id: refreshDecoded.id, email: refreshDecoded.email, role: refreshDecoded.role, name: refreshDecoded.name };
      }
    }
  }

  if (!userObj) return null;

  // Auto-heal: If email, role, or name are missing (e.g., from older tokens), fetch from DB
  if (!userObj.email || !userObj.role || !userObj.name) {
    try {
      const [dbUser] = await db.select().from(users).where(eq(users.id, userObj.id)).limit(1);
      if (dbUser) {
        userObj = { id: dbUser.id, email: dbUser.email, role: dbUser.role, name: dbUser.name };
        const newTokens = generateTokens(userObj);
        try {
          cookieStore.set('access_token', newTokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 15 * 60,
          });
          cookieStore.set('refresh_token', newTokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60,
          });
        } catch {}
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }

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
  return Math.floor(100000 + Math.random() * 900000).toString();
}
