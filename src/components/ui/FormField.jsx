'use client';

import React from 'react';
import FieldError from './FieldError';

/**
 * Standard Accessible FormField wrapper
 *
 * @param {Object} props
 * @param {string} [props.id] - Input element id
 * @param {string} props.label - Field label
 * @param {boolean} [props.required=false] - Whether field is required
 * @param {string} [props.error] - Validation error message
 * @param {string} [props.helperText] - Supplementary hint
 * @param {React.ReactNode} [props.badge] - Optional badge in header
 * @param {React.ReactNode} props.children - Input or select element
 * @param {string} [props.className=''] - Container CSS classes
 */
export default function FormField({
  id,
  label,
  required = false,
  error,
  helperText,
  badge,
  children,
  className = '',
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-[10px] font-semibold text-warm-700 uppercase tracking-wider"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {badge}
      </div>
      {children}
      {helperText && !error && (
        <p className="text-[10px] text-warm-500">{helperText}</p>
      )}
      <FieldError message={error} />
    </div>
  );
}

/**
 * Read-Only Field component with optional icon and badge
 *
 * @param {Object} props
 * @param {string} props.label - Field label
 * @param {string} props.value - Read-only display value
 * @param {React.ReactNode} [props.icon] - Optional leading icon
 * @param {React.ReactNode} [props.badge] - Optional trailing badge
 * @param {string} [props.helperText] - Subtext hint
 * @param {string} [props.className=''] - Container CSS classes
 */
export function ReadOnlyField({
  label,
  value,
  icon,
  badge,
  helperText,
  className = '',
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-semibold text-warm-700 uppercase tracking-wider">
          {label}
        </label>
        {badge}
      </div>
      <div className="relative">
        {icon && (
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-warm-400 w-3.5 h-3.5 flex items-center justify-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type="text"
          value={value || '—'}
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          className={`w-full ${
            icon ? 'pl-8' : 'px-3'
          } pr-3 py-1.5 bg-warm-50 border border-warm-200 rounded-md text-[11px] text-warm-700 font-medium cursor-not-allowed select-text outline-none`}
        />
      </div>
      {helperText && (
        <p className="text-[10px] text-warm-500">{helperText}</p>
      )}
    </div>
  );
}
