/**
 * Formats a numeric price or amount as INR (₹).
 * Examples:
 *   formatCurrency(499)     => "₹499"
 *   formatCurrency(499.5)   => "₹499.50"
 *   formatCurrency(12500)   => "₹12,500"
 *   formatCurrency("99.99") => "₹99.99"
 *
 * @param {number|string} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  const num = Number(amount || 0);
  if (isNaN(num)) return '₹0';
  const hasDecimal = num % 1 !== 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Checks if a media URL represents a video (Cloudinary video URL, video extension, or video MIME indicator).
 * Works reliably even for Cloudinary URLs without explicit file extensions or with query parameters.
 *
 * @param {string} url
 * @returns {boolean}
 */
export function isVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const lowercaseUrl = url.toLowerCase();
  return (
    lowercaseUrl.includes('/video/upload/') ||
    lowercaseUrl.includes('/video/') ||
    lowercaseUrl.includes('resource_type=video') ||
    Boolean(lowercaseUrl.match(/\.(mp4|webm|mov|avi|mkv|m3u8|flv|wmv)($|\?|#)/i))
  );
}

