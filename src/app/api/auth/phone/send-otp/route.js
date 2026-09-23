import { NextResponse } from 'next/server';
import { formatIndianMobile } from '@/lib/msg91';

/**
 * Deprecated: Phone OTP sending is now handled via MSG91 OTP Widget ExposeMethods on the client.
 */
export async function POST(request) {
  try {
    const { phone } = await request.json();

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    const formattedPhone = formatIndianMobile(phone);

    return NextResponse.json({
      success: true,
      message: 'OTP sending handled via MSG91 OTP Widget SDK.',
      formattedPhone,
    });
  } catch (error) {
    console.error('Send phone OTP error:', error);
    return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 500 });
  }
}
