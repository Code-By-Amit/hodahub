import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storeSettings } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [settings] = await db.select().from(storeSettings).limit(1);

    const defaultSettings = {
      storeName: 'HodaHub',
      contactEmail: '',
      contactPhone: '',
      whatsappNumber: '',
      address: '',
      businessHours: '',
      instagramUrl: '',
      facebookUrl: '',
      twitterUrl: '',
      youtubeUrl: '',
      codEnabled: true,
      shippingFee: '0.00',
      minFreeShipping: '50.00',
      codAdvanceAmount: '99.00',
      maxOtpRequestsPerDay: 4,
      otpResendCooldownSeconds: 45,
    };

    if (!settings) {
      return NextResponse.json({ settings: defaultSettings });
    }

    return NextResponse.json({
      settings: {
        storeName: settings.storeName || defaultSettings.storeName,
        contactEmail: settings.contactEmail || '',
        contactPhone: settings.contactPhone || '',
        whatsappNumber: settings.whatsappNumber || '',
        address: settings.address || '',
        businessHours: settings.businessHours || '',
        instagramUrl: settings.instagramUrl || '',
        facebookUrl: settings.facebookUrl || '',
        twitterUrl: settings.twitterUrl || '',
        youtubeUrl: settings.youtubeUrl || '',
        codEnabled: settings.codEnabled ?? defaultSettings.codEnabled,
        shippingFee: settings.shippingFee ?? defaultSettings.shippingFee,
        minFreeShipping: settings.minFreeShipping ?? defaultSettings.minFreeShipping,
        codAdvanceAmount: settings.codAdvanceAmount ?? defaultSettings.codAdvanceAmount,
        maxOtpRequestsPerDay: settings.maxOtpRequestsPerDay ?? defaultSettings.maxOtpRequestsPerDay,
        otpResendCooldownSeconds: settings.otpResendCooldownSeconds ?? defaultSettings.otpResendCooldownSeconds,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}
