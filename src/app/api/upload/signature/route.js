import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uploadType } = await request.json();

    let folder = 'reviews';
    if (uploadType === 'product-image') {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      folder = 'products';
    } else if (uploadType === 'category-image') {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      folder = 'categories';
    } else if (uploadType === 'review-media') {
      folder = 'reviews';
    } else if (uploadType === 'avatar' || uploadType === 'profile-image') {
      folder = 'avatars';
    } else {
      return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Cloudinary configuration missing on server' }, { status: 500 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    // Cloudinary signature requires parameters sorted alphabetically: folder=...&timestamp=...
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    return NextResponse.json({
      signature,
      timestamp,
      folder,
      apiKey,
      cloudName,
    });
  } catch (error) {
    console.error('Signature generation error:', error);
    return NextResponse.json({ error: 'Failed to generate upload signature' }, { status: 500 });
  }
}
