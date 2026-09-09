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
