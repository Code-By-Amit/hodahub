import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storeSettings } from '@/lib/db/schema';
import { contactSchema } from '@/lib/validations';
import { sendContactFormEmail } from '@/lib/email';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = await checkRateLimit(`contact:${ip}`, 3, 10 * 60);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: 'Too many messages sent. Please wait before submitting again.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = contactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Invalid form data' },
        { status: 400 }
      );
    }

    const [settings] = await db.select().from(storeSettings).limit(1);
    const storeContactEmail = settings?.contactEmail?.trim();

    if (!storeContactEmail) {
      console.warn('[Contact Form] Store contact email is not configured in store_settings. Cannot route customer inquiry.');
      return NextResponse.json(
        { error: 'Contact form is temporarily unavailable.' },
        { status: 503 }
      );
    }

    await sendContactFormEmail(storeContactEmail, result.data);

    return NextResponse.json({
      message: 'Thank you for reaching out! Your message has been sent to our team.',
    });
  } catch (error) {
    console.error('Contact form API error:', error);
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 });
  }
}
