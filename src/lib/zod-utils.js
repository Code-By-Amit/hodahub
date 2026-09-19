/**
 * Flattens Zod error issues array into a key-value object map of field names to message strings.
 * Compatible with both Zod v3 and Zod v4 (issues / errors property).
 *
 * @param {Object} error - ZodError object returned by safeParse()
 * @returns {Record<string, string>} Object mapping field paths (e.g. "email", "address.pincode") to error messages
 */
export function flattenZodErrors(error) {
  const issues = error?.issues || error?.errors;
  if (!issues || !Array.isArray(issues) || issues.length === 0) {
    return {};
  }

  return issues.reduce((acc, issue) => {
    const fieldPath = issue.path && issue.path.length > 0 ? issue.path.join('.') : '_form';
    // Keep first error message for each field path if multiple exist
    if (!acc[fieldPath]) {
      acc[fieldPath] = issue.message;
    }
    return acc;
  }, {});
}

/**
 * Standardizes API error JSON responses for safeParse failures.
 * Returns HTTP 400 with { error: summaryMessage, errors: fieldErrorMap }
 *
 * @param {Object} result - Result of Zod schema safeParse()
 * @param {string} fallbackMessage - Default fallback error message string
 * @returns {Record<string, any>} Response object containing error summary and field errors map
 */
export function formatZodErrorResponse(result, fallbackMessage = 'Validation failed') {
  const errors = flattenZodErrors(result?.error);
  const firstMessage = Object.values(errors)[0] || fallbackMessage;
  return {
    error: firstMessage,
    errors,
  };
}

/**
 * Generates a clean WhatsApp deep link (wa.me) URL.
 * Strips non-digit characters (+, spaces, dashes) and ensures leading country code.
 *
 * @param {string} phone - Phone number string (E.164 or plain)
 * @param {string} text - Message body to pre-fill
 * @returns {string} WhatsApp URL string (e.g. "https://wa.me/919876543210?text=...")
 */
export function toWhatsAppLink(phone, text = '') {
  if (!phone || typeof phone !== 'string') return '#';
  let digits = phone.trim().replace(/\D/g, '');
  if (!digits) return '#';

  // If user entered 10 digits without country code, default to 91 (India)
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  const encodedText = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${encodedText}`;
}
