import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ error: 'Phone verification now uses the secure OTP widget. Refresh your profile page and try again.' }, { status: 410 });
}
