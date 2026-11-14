import { NextResponse } from 'next/server';
import { checkPincodeServiceability } from '@/lib/delhivery';
import { lookupPincode } from '@/lib/pincode';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pincode = searchParams.get('pincode');

    if (!pincode || pincode.trim().length !== 6 || !/^\d{6}$/.test(pincode.trim())) {
      return NextResponse.json(
        { serviceable: false, error: 'Please enter a valid 6-digit pincode' },
        { status: 400 }
      );
    }

    const cleanPin = pincode.trim();

    // Call Delhivery Serviceability API
    const delhiveryResult = await checkPincodeServiceability(cleanPin);

    // Also get Post Office info from India Post API as backup for city/district/state if missing
    let locationInfo = '';
    try {
      const postRes = await lookupPincode(cleanPin);
      if (postRes?.city || postRes?.state) {
        locationInfo = `${postRes.city}, ${postRes.state}`;
      }
    } catch {}

    const cityName = delhiveryResult.city || locationInfo;
    const estText = delhiveryResult.estimatedDays
      ? `Est. ${delhiveryResult.estimatedDays}`
      : 'Delivery time confirmed after dispatch';

    const locationDisplay = cityName ? ` to ${cityName}` : '';
    const message = delhiveryResult.serviceable === true ? `Delivery available${locationDisplay} (${estText})` : delhiveryResult.serviceable === false ? 'Delivery is unavailable for this pincode.' : 'Please contact us to confirm delivery to this pincode.';

    return NextResponse.json({
      serviceable: delhiveryResult.serviceable,
      pincode: cleanPin,
      city: delhiveryResult.city || null,
      state: delhiveryResult.state || null,
      estimatedDays: delhiveryResult.estimatedDays || null,
      codAvailable: delhiveryResult.serviceable === true && delhiveryResult.codAvailable === true,
      message,
    });
  } catch (error) {
    console.error('[Pincode Check API Error]:', error);
    return NextResponse.json({
      serviceable: null,
      codAvailable: false,
      message: 'Delivery availability could not be verified. Please contact support.',
    }, { status: 503 });
  }
}
