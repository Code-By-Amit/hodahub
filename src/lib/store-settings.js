import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { storeSettings } from '@/lib/db/schema';

/**
 * Server-side helper to fetch cached store settings.
 * Revalidated every 3600 seconds (1 hour) or immediately when admin updates settings.
 */
export const getCachedStoreSettings = unstable_cache(
  async () => {
    try {
      const [settings] = await db.select().from(storeSettings).limit(1);
      const defaultEmail = process.env.FROM_EMAIL || 'support@hodahub.in';

      return {
        storeName: settings?.storeName || 'HodaHub',
        contactEmail: settings?.contactEmail?.trim() || defaultEmail,
        contactPhone: settings?.contactPhone || '',
        whatsappNumber: settings?.whatsappNumber || '',
        address: settings?.address || '',
        businessHours: settings?.businessHours || '',
        instagramUrl: settings?.instagramUrl || '',
        facebookUrl: settings?.facebookUrl || '',
        twitterUrl: settings?.twitterUrl || '',
        youtubeUrl: settings?.youtubeUrl || '',
        codEnabled: settings?.codEnabled ?? true,
        shippingFee: settings?.shippingFee ?? '0.00',
        minFreeShipping: settings?.minFreeShipping ?? '50.00',
        codAdvanceAmount: settings?.codAdvanceAmount ?? '99.00',
        maxOtpRequestsPerDay: settings?.maxOtpRequestsPerDay ?? 4,
        otpResendCooldownSeconds: settings?.otpResendCooldownSeconds ?? 45,
      };
    } catch (error) {
      console.error('[getCachedStoreSettings Error]:', error);
      return {
        storeName: 'HodaHub',
        contactEmail: process.env.FROM_EMAIL || 'support@hodahub.in',
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
    }
  },
  ['store-settings-cache'],
  { revalidate: 3600, tags: ['store-settings'] }
);
