'use client';

import React from 'react';
import { FiCheck, FiX, FiSmartphone, FiMail } from 'react-icons/fi';

/**
 * Role Badge (Admin / Customer)
 * @param {{ role: string, className?: string }} props
 */
export function RoleBadge({ role, className = '' }) {
  const isAdmin = String(role).toLowerCase() === 'admin';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize select-none ${
        isAdmin
          ? 'bg-warm-900 text-white'
          : 'bg-warm-100 text-warm-700 border border-warm-200'
      } ${className}`}
    >
      {role || 'customer'}
    </span>
  );
}

/**
 * Verified Check Badge
 * @param {{ isVerified: boolean, showLabel?: boolean, className?: string }} props
 */
export function VerifiedBadge({ isVerified, showLabel = false, className = '' }) {
  if (isVerified) {
    return (
      <span
        title="Verified"
        className={`inline-flex items-center gap-1 text-emerald-700 ${showLabel ? 'bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px] font-bold' : ''} ${className}`}
      >
        <FiCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
        {showLabel && <span>Verified</span>}
      </span>
    );
  }

  return (
    <span
      title="Unverified"
      className={`inline-flex items-center gap-1 text-rose-500 ${showLabel ? 'bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px] font-semibold' : ''} ${className}`}
    >
      <FiX className="w-3.5 h-3.5 text-rose-400 stroke-[2.5]" />
      {showLabel && <span>Unverified</span>}
    </span>
  );
}

/**
 * Auth Provider Badge (Phone / Google / Email)
 * @param {{ provider: 'phone' | 'google' | 'email' | string, className?: string }} props
 */
export function AuthProviderBadge({ provider, className = '' }) {
  const p = String(provider || 'email').toLowerCase();

  if (p === 'phone') {
    return (
      <span
        title="Phone OTP Authenticated"
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold tracking-wide uppercase select-none ${className}`}
      >
        <FiSmartphone className="w-2.5 h-2.5 text-amber-700" />
        <span>Phone</span>
      </span>
    );
  }

  if (p === 'google') {
    return (
      <span
        title="Google OAuth Authenticated"
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[9px] font-bold tracking-wide uppercase select-none ${className}`}
      >
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>Google</span>
      </span>
    );
  }

  return (
    <span
      title="Email Password Authenticated"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-warm-100 text-warm-700 border border-warm-200 text-[9px] font-bold tracking-wide uppercase select-none ${className}`}
    >
      <FiMail className="w-2.5 h-2.5 text-warm-500" />
      <span>Email</span>
    </span>
  );
}

/**
 * Generic Status Badge
 * @param {{ variant?: 'default' | 'success' | 'warning' | 'danger', children: React.ReactNode, className?: string }} props
 */
export function StatusBadge({ variant = 'default', children, className = '' }) {
  const variantStyles = {
    default: 'bg-warm-100 text-warm-700 border-warm-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border ${variantStyles[variant] || variantStyles.default} ${className}`}
    >
      {children}
    </span>
  );
}
