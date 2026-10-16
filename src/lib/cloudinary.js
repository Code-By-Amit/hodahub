/**
 * Server-side Cloudinary REST calls without the vendor SDK (the project has no cloudinary dependency).
 */
export async function destroyCloudinaryAsset(publicId) {
  if (!publicId) return false;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('[Cloudinary] Destroy skipped: server credentials missing');
    return false;
  }

  const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ public_id: publicId }).toString(),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.result !== 'ok') {
      console.error(
        `[Cloudinary] Destroy failed for "${publicId}": status ${res.status}, result ${data.result || data.error?.message}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[Cloudinary] Destroy request error for "${publicId}":`, error.message);
    return false;
  }
}
