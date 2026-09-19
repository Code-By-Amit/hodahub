'use client';

/**
 * Renders an inline field error message below form inputs
 *
 * @param {Object} props
 * @param {string} [props.message] - Error message string to render
 * @param {string} [props.className] - Optional extra CSS class names
 */
export default function FieldError({ message, className = '' }) {
  if (!message) return null;

  return (
    <p className={`text-[11px] text-red-500 font-medium mt-1 leading-tight flex items-center gap-1 ${className}`}>
      <span>{message}</span>
    </p>
  );
}
