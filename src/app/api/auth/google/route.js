import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const origin = request.headers.get('origin') || request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${origin}/api/auth/google/callback`;

    if (!clientId || clientId === 'your_google_client_id_here') {
      return NextResponse.json(
        { error: 'GOOGLE_CLIENT_ID is not configured in environment variables' },
        { status: 500 }
      );
    }

    const scope = 'openid email profile';
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(
      scope
    )}&access_type=offline&prompt=consent`;

    return NextResponse.redirect(googleAuthUrl);
  } catch (error) {
    console.error('Google OAuth initiate error:', error);
    return NextResponse.json({ error: 'Failed to initiate Google sign in' }, { status: 500 });
  }
}
