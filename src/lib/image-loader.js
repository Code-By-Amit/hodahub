'use client';

// Cloudinary handles resizing and compression; other sources are served as-is.
export default function imageLoader({ src, width }) {
  let url;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') return src;

  const match = url.pathname.match(/^\/([^/]+)\/image\/upload\/(.+)$/);
  if (!match || match[2].startsWith('s--')) return src;

  url.pathname = `/${match[1]}/image/upload/f_auto,q_auto,c_limit,w_${width}/${match[2]}`;
  return url.toString();
}
