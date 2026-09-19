import { NextResponse } from 'next/server';
import { cleanupAbandonedOrders } from '@/lib/order-cleanup';

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  // If CRON_SECRET is configured in environment, enforce Authorization Bearer token header check
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return false;
    }
  }
  return true;
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await cleanupAbandonedOrders();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({
    message: `Cleanup completed. ${result.cleanedCount} abandoned pending order(s) cancelled and stock restored.`,
    cleanedCount: result.cleanedCount,
    expirationMinutes: result.expirationMinutes,
  });
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await cleanupAbandonedOrders();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({
    message: `Cleanup completed. ${result.cleanedCount} abandoned pending order(s) cancelled and stock restored.`,
    cleanedCount: result.cleanedCount,
    expirationMinutes: result.expirationMinutes,
  });
}
