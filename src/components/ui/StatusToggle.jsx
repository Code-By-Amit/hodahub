'use client';

import React from 'react';

/**
 * Reusable, accessible status toggle switch with optimistic UI states.
 *
 * @param {Object} props
 * @param {boolean} props.checked - Current boolean state
 * @param {Function} props.onChange - Callback invoked with the new boolean value
 * @param {boolean} [props.isLoading=false] - In-flight mutation state for this specific toggle
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.activeLabel='Active'] - Text label when checked
 * @param {string} [props.inactiveLabel='Inactive'] - Text label when unchecked
 * @param {string} [props.title] - Hover title
 * @param {'sm'|'md'} [props.size='sm'] - Toggle size variant
 * @param {string} [props.className=''] - Additional CSS classes
 */
export default function StatusToggle({
  checked,
  onChange,
  isLoading = false,
  disabled = false,
  activeLabel = 'Active',
  inactiveLabel = 'Inactive',
  title,
  size = 'sm',
  className = '',
}) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled || isLoading) return;
    onChange(!checked);
  };

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled || isLoading}
      onClick={handleClick}
      title={title || `Click to toggle to ${checked ? inactiveLabel : activeLabel}`}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-all select-none focus:outline-none focus:ring-1 focus:ring-brand-500/50 ${
        isSmall ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${
        checked
          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
          : 'bg-warm-100 text-warm-600 hover:bg-warm-200 border border-warm-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {isLoading ? (
        <span
          className={`border-2 border-current border-t-transparent rounded-full animate-spin shrink-0 ${
            isSmall ? 'w-2 h-2' : 'w-2.5 h-2.5'
          }`}
        />
      ) : (
        <span
          className={`rounded-full shrink-0 transition-colors ${
            checked ? 'bg-emerald-500' : 'bg-warm-400'
          } ${isSmall ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
        />
      )}
      <span>{isLoading ? 'Updating...' : checked ? activeLabel : inactiveLabel}</span>
    </button>
  );
}
