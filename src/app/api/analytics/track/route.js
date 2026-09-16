import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { pageViews } from '@/lib/db/schema';
import crypto from 'crypto';

export async function POST(req) {
  try {
    const body = await req.json();
    const { path, userAgent = '' } = body;

    if (!path || path.startsWith('/admin') || path.startsWith('/api')) {
      return NextResponse.json({ success: false });
    }

    const cookieStore = await cookies();
    let visitorId = cookieStore.get('hh_visitor_id')?.value;
    let newCookieSet = false;

    if (!visitorId) {
      visitorId = crypto.randomUUID();
      newCookieSet = true;
    }

    // Determine device type simple heuristic
    let device = 'desktop';
    const ua = userAgent.toLowerCase();
    if (ua.includes('ipad') || ua.includes('tablet') || (ua.includes('android') && !ua.includes('mobile'))) {
      device = 'tablet';
    } else if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('ipod') || ua.includes('android')) {
      device = 'mobile';
    }

    try {
      await db.insert(pageViews).values({
        visitorId,
        path: path.split('?')[0], // strip query string for clean page path grouping
        userAgent,
        device,
        referrer: req.headers.get('referer') || null,
      });
    } catch (dbErr) {
      // Safe fallback insert if production DB table hasn't migrated userAgent/device columns yet
      try {
        await db.insert(pageViews).values({
          visitorId,
          path: path.split('?')[0],
          referrer: req.headers.get('referer') || null,
        });
      } catch { }
    }

    const response = NextResponse.json({ success: true });

    if (newCookieSet) {
      response.cookies.set('hh_visitor_id', visitorId, {
        maxAge: 365 * 24 * 60 * 60,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });
    }

    return response;
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
