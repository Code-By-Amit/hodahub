import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, accounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateTokens, setAuthCookies } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    const origin = request.headers.get('origin') || request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${origin}/api/auth/google/callback`;

    if (errorParam || !code) {
      return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret || clientId === 'your_google_client_id_here') {
      return NextResponse.redirect(`${origin}/login?error=google_not_configured`);
    }

    // 1. Exchange code for access_token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Google token exchange failed:', tokenData);
      return NextResponse.redirect(`${origin}/login?error=google_token_error`);
    }

    // 2. Fetch user profile from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email) {
      console.error('Google profile fetch failed:', profile);
      return NextResponse.redirect(`${origin}/login?error=google_profile_error`);
    }

    const { email, sub: providerAccountId, name, picture } = profile;

    let targetUser = null;

    // 3. Check if accounts row exists
    const [existingAccount] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.provider, 'google'), eq(accounts.providerAccountId, providerAccountId)))
      .limit(1);

    if (existingAccount) {
      const [u] = await db.select().from(users).where(eq(users.id, existingAccount.userId)).limit(1);
      targetUser = u;
    }

    if (!targetUser) {
      // 4. Check if user with matching email already exists
      const [existingUserByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUserByEmail) {
        targetUser = existingUserByEmail;

        // Link Google account
        await db.insert(accounts).values({
          userId: targetUser.id,
          provider: 'google',
          providerAccountId,
        });

        // Update avatarUrl if empty
        if (!targetUser.avatarUrl && picture) {
          await db
            .update(users)
            .set({ avatarUrl: picture, isVerified: true })
            .where(eq(users.id, targetUser.id));
        }
      } else {
        // 5. Create new user & link account
        const [newUser] = await db
          .insert(users)
          .values({
            email: email.toLowerCase(),
            name: name || email.split('@')[0],
            avatarUrl: picture || null,
            isVerified: true,
            role: 'customer',
          })
          .returning();

        targetUser = newUser;

        await db.insert(accounts).values({
          userId: targetUser.id,
          provider: 'google',
          providerAccountId,
        });
      }
    }

    // 6. Issue tokens & set auth cookies
    const tokenPayload = {
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      name: targetUser.name,
    };

    const tokens = generateTokens(tokenPayload);
    const response = NextResponse.redirect(`${origin}/`);
    setAuthCookies(response, tokens);

    return response;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${origin}/login?error=google_callback_failed`);
  }
}
