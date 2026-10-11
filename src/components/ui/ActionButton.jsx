'use client';

import React, { useState } from 'react';

/**
 * @typedef {'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'} ActionButtonVariant
 * @typedef {'xs' | 'sm' | 'md'} ActionButtonSize
 */

/**
 * Reusable ActionButton with confirmation support, loading state, and icon slot.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button label / content
 * @param {ActionButtonVariant} [props.variant='outline'] - Visual design style
 * @param {ActionButtonSize} [props.size='sm'] - Button size
 * @param {React.ReactNode} [props.icon] - Optional leading icon
 * @param {boolean} [props.loading=false] - Whether an action is currently loading
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {string} [props.confirmMessage] - If provided, prompts window.confirm before executing onClick
 * @param {(e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>} [props.onClick] - Click handler
 * @param {'button' | 'submit' | 'reset'} [props.type='button'] - Button HTML type
 * @param {string} [props.title] - Tooltip / accessibility title
 * @param {string} [props.className=''] - Additional CSS class names
 */
export default function ActionButton({
  children,
  variant = 'outline',
  size = 'sm',
  icon,
  loading = false,
  disabled = false,
  confirmMessage,
  onClick,
  type = 'button',
  title,
  className = '',
}) {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = loading || internalLoading;

  const variantClasses = {
    primary:
      'bg-warm-900 text-white hover:bg-warm-800 border-transparent shadow-2xs disabled:bg-warm-400',
    secondary:
      'bg-warm-100 text-warm-800 hover:bg-warm-200 border-warm-200 disabled:opacity-50',
    outline:
      'bg-white text-warm-700 hover:bg-warm-50 border-warm-200 shadow-2xs hover:text-warm-900 disabled:opacity-50',
    danger:
      'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 hover:text-rose-900 disabled:opacity-50',
    ghost:
      'bg-transparent text-warm-600 hover:bg-warm-100 border-transparent hover:text-warm-900 disabled:opacity-50',
  };

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px] gap-1',
    sm: 'px-2.5 py-1 text-[10px] gap-1.5',
    md: 'px-3 py-1.5 text-[11px] gap-1.5',
  };

  const handleClick = async (e) => {
    if (disabled || isLoading) {
      e.preventDefault();
      return;
    }

    if (confirmMessage && typeof window !== 'undefined') {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) {
        e.preventDefault();
        return;
      }
    }

    if (onClick) {
      try {
        const result = onClick(e);
        if (result && typeof result.then === 'function') {
          setInternalLoading(true);
          await result;
        }
      } finally {
        setInternalLoading(false);
      }
    }
  };

  return (
    <button
      type={type}
      title={title}
      disabled={disabled || isLoading}
      onClick={handleClick}
      className={`inline-flex items-center justify-center font-semibold rounded-md border transition-colors cursor-pointer select-none ${
        variantClasses[variant] || variantClasses.outline
      } ${sizeClasses[size] || sizeClasses.sm} ${className}`}
    >
      {isLoading ? (
        <span
          className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0"
          aria-hidden="true"
        />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
}
