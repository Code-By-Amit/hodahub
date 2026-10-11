'use client';

import React, { useEffect, useRef } from 'react';

/**
 * Reusable accessible OTP Modal Dialog
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {() => void} props.onClose - Close callback
 * @param {string} [props.title='Verify OTP'] - Modal title
 * @param {string} [props.subtitle] - Informative subtitle
 * @param {string} props.otp - Current 6-digit OTP string
 * @param {(val: string) => void} props.onChange - Input change callback
 * @param {(e: React.FormEvent) => void} props.onSubmit - Submit callback
 * @param {boolean} [props.loading=false] - Whether verification is in progress
 * @param {string} [props.submitText='Verify OTP'] - Button label
 * @param {boolean} [props.showDevWarning=false] - Dev-only warning flag (never shown in production)
 */
export default function OtpModal({
  isOpen,
  onClose,
  title = 'Verify OTP',
  subtitle,
  otp,
  onChange,
  onSubmit,
  loading = false,
  submitText = 'Verify OTP',
  showDevWarning = false,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Enforce environment guard: Dev warning can NEVER appear in production
  const renderDevWarning = showDevWarning && process.env.NODE_ENV === 'development';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-modal-title"
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-lg p-5 max-w-sm w-full space-y-3.5 border border-warm-200 shadow-xl relative animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-warm-100 pb-2.5">
          <h3 id="otp-modal-title" className="text-sm font-bold text-warm-900 tracking-tight">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-warm-400 hover:text-warm-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {subtitle && (
          <p className="text-[11px] text-warm-600 leading-relaxed">
            {subtitle}
          </p>
        )}

        {renderDevWarning && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-900 leading-normal">
            ⚠️ <strong>Dev Environment Notice:</strong> Check server console for demo OTP code.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="otp-input-code" className="sr-only">
              6-digit verification code
            </label>
            <input
              id="otp-input-code"
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit OTP"
              className="w-full px-3 py-2 border border-warm-200 rounded-md text-center text-sm font-mono tracking-widest text-warm-900 bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-warm-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 border border-warm-200 text-[11px] font-semibold rounded-md text-warm-600 hover:bg-warm-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="px-3.5 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {loading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>{submitText}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
