'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
}) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const titleId = 'dialog-' + useId();

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [isOpen]);

  useEffect(() => {
    function handleEsc(e) {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const items = Array.from(dialogRef.current?.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]') || []).filter((item) => item.tabIndex >= 0 && item.getClientRects().length);
        if (!items.length) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === items[0] || document.activeElement === dialogRef.current)) { e.preventDefault(); items.at(-1).focus(); }
        else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0].focus(); }
      }
    }
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
    drawer: 'max-w-sm h-full rounded-none sm:rounded-none ml-auto',
  };

  return createPortal(
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[200] flex ${size === 'drawer' ? 'justify-end' : 'items-center justify-center p-4'}`}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Dialog'}
        tabIndex={-1}
        className={`relative ${sizes[size]} w-full bg-white rounded-2xl shadow-2xl overflow-hidden`}
        style={{ animation: 'scaleIn 0.2s ease-out' }}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-warm-100">
            {title && (
              <h2 id={titleId} className="text-lg font-bold text-warm-900">{title}</h2>
            )}
            {showClose && (
              <button
                onClick={onClose}
                className="p-2 text-warm-400 hover:text-warm-600 hover:bg-warm-100 rounded-lg transition-colors ml-auto"
                aria-label="Close modal"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={`px-5 py-5 overflow-y-auto overscroll-contain ${size === 'drawer' ? 'h-[calc(100dvh-76px)]' : 'max-h-[70dvh]'}`}>{children}</div>
      </div>
    </div>, document.body
  );
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}) {
  const variants = {
    danger: 'bg-red-500 hover:bg-red-600 shadow-red-500/25',
    warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25',
    primary: 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/25',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-warm-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-sm font-medium text-warm-600 border border-warm-200 rounded-xl hover:bg-warm-50 transition-colors"
        >
          {cancelText}
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2.5 text-sm font-semibold text-white rounded-xl shadow-lg transition-all active:scale-[0.98] ${variants[variant]}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
