import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storeSettings } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth';
import { storeSettingsSchema } from '@/lib/validations';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await requireAdmin(request);
    const [settings] = await db.select().from(storeSettings).limit(1);

    if (!settings) {
      // Return default configuration if not initialized yet
      return NextResponse.json({
        settings: {
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
          orderExpirationMinutes: 15,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const result = storeSettingsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Invalid settings data' },
        { status: 400 }
      );
    }

    const data = result.data;

    const [existing] = await db.select().from(storeSettings).limit(1);

    const setPayload = {
      storeName: data.storeName,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      whatsappNumber: data.whatsappNumber || null,
      address: data.address || null,
      businessHours: data.businessHours || null,
      instagramUrl: data.instagramUrl || null,
      facebookUrl: data.facebookUrl || null,
      twitterUrl: data.twitterUrl || null,
      youtubeUrl: data.youtubeUrl || null,
      codEnabled: data.codEnabled,
      shippingFee: data.shippingFee.toString(),
      minFreeShipping: data.minFreeShipping.toString(),
      codAdvanceAmount: data.codAdvanceAmount.toString(),
      orderExpirationMinutes: data.orderExpirationMinutes || 15,
      updatedAt: new Date(),
    };

    let updated;
    if (existing) {
      [updated] = await db
        .update(storeSettings)
        .set(setPayload)
        .where(eq(storeSettings.id, existing.id))
        .returning();
    } else {
      [updated] = await db
        .insert(storeSettings)
        .values(setPayload)
        .returning();
    }

    return NextResponse.json({ settings: updated, message: 'Store settings updated successfully!' });
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
