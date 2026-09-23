import { NextResponse } from 'next/server';
import { getMSG91WidgetConfig } from '@/lib/msg91';

export async function GET() {
  try {
    const config = getMSG91WidgetConfig();

    return NextResponse.json({
      success: true,
      widgetId: config.widgetId,
      tokenAuth: config.tokenAuth || 'DEV_STUB_WIDGET_TOKEN',
      isConfigured: config.isConfigured,
    });
  } catch (error) {
    console.error('MSG91 Widget token error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve MSG91 OTP widget token' },
      { status: 500 }
    );
  }
}
