'use client';

import React from 'react';

/**
 * @typedef {'xs' | 'sm' | 'md' | 'lg' | 'xl'} AvatarSize
 *
 * @param {Object} props
 * @param {string} [props.name] - User full name
 * @param {string} [props.phone] - User phone number
 * @param {string} [props.src] - User avatar image URL
 * @param {AvatarSize} [props.size='md'] - Visual diameter size
 * @param {string} [props.className=''] - Additional CSS classes
 */
export default function UserAvatar({
  name,
  phone,
  src,
  size = 'md',
  className = '',
}) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-8 h-8 text-[11px]',
    lg: 'w-10 h-10 text-[13px]',
    xl: 'w-12 h-12 text-[15px]',
  };

  const getInitial = () => {
    if (name && typeof name === 'string' && name.trim()) {
      const match = name.trim().match(/[a-zA-Z0-9]/);
      if (match) return match[0].toUpperCase();
    }
    if (phone && typeof phone === 'string') {
      const digits = phone.replace(/\D/g, '');
      if (digits.length > 0) return digits.slice(-2);
    }
    return '?';
  };

  const initial = getInitial();
  const label = name || phone || 'User avatar';

  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className={`rounded-full object-cover border border-warm-200 shadow-2xs shrink-0 ${sizeClasses[size] || sizeClasses.md} ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={label}
      className={`rounded-full bg-warm-900 text-white font-bold flex items-center justify-center shrink-0 shadow-2xs select-none ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      {initial}
    </div>
  );
}
