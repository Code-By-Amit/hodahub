/**
 * MSG91 OTP Widget Integration Helper (Client-Safe)
 * Integration Type: Web SDK → Custom UI → ExposeMethods
 *
 * This file contains strictly client-safe utility functions.
 * Server-only verification logic is located in '@/lib/msg91-server'.
 */

/**
 * Format Indian mobile number to 12-digit string starting with 91 (e.g. 919876543210)
 * @param {string|number} phone
 * @returns {string} 12-digit mobile number with 91 prefix
 */
export function formatIndianMobile(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }
  if (digits.length > 10) {
    return `91${digits.slice(-10)}`;
  }
  return digits;
}

/**
 * Extract clean 10-digit Indian mobile number
 * @param {string|number} phone
 * @returns {string} 10-digit mobile number string (e.g. "9876543210")
 */
export function extract10DigitMobile(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.slice(-10);
}

/**
 * Get MSG91 Widget client-safe configuration.
 * Exposes ONLY Widget ID and Widget Token Auth (Client-safe tokens).
 * NEVER returns or falls back to MSG91_AUTH_KEY.
 * @returns {{ widgetId: string, tokenAuth: string, isConfigured: boolean }}
 */
export function getMSG91WidgetConfig() {
  const widgetId = (process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || '').trim();
  const tokenAuth = (process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH || '').trim();

  const isConfigured = Boolean(
    widgetId &&
    tokenAuth &&
    tokenAuth !== 'your_msg91_widget_token_auth_here' &&
    tokenAuth !== 'your_msg91_auth_key_here'
  );

  return {
    widgetId,
    tokenAuth,
    isConfigured,
  };
}
