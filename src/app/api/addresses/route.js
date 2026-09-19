import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { addresses } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const list = await db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.createdAt));
    return NextResponse.json({ addresses: list });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const { label, line1, line2, city, state, pincode, phone } = body;

    if (!line1 || !city || !state || !pincode) {
      return NextResponse.json({ error: 'Address, city, state, and pincode are required' }, { status: 400 });
    }

    const cleanPincode = String(pincode).trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      return NextResponse.json({ error: 'Pincode must be a valid 6-digit number' }, { status: 400 });
    }

    let cleanPhone = null;
    if (phone) {
      cleanPhone = String(phone).replace(/\D/g, '');
      if (!/^\d{10}$/.test(cleanPhone)) {
        return NextResponse.json({ error: 'Phone number must be a valid 10-digit mobile number' }, { status: 400 });
      }
    }

    const [address] = await db.insert(addresses).values({
      userId: user.id,
      label: label || null,
      line1,
      line2: line2 || null,
      city,
      state,
      pincode,
      phone: phone || null,
    }).returning();

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 });
  }
}
