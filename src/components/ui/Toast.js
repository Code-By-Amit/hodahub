'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { FiCheck, FiX, FiAlertTriangle, FiInfo } from 'react-icons/fi';

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', message, duration = 4000 }) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastFns = {
    success: (message) => addToast({ type: 'success', message }),
    error: (message) => addToast({ type: 'error', message }),
    warning: (message) => addToast({ type: 'warning', message }),
    info: (message) => addToast({ type: 'info', message }),
  };

  return (
    <ToastContext.Provider value={toastFns}>
      {children}
      {/* Toast container */}
      <div className="fixed top-3 right-3 z-[9999] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const icons = {
  success: FiCheck,
  error: FiX,
  warning: FiAlertTriangle,
  info: FiInfo,
};

const styles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconStyles = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-500 text-white',
};

function ToastItem({ toast, onClose }) {
  const Icon = icons[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg border shadow-md ${styles[toast.type]}`}
      style={{ animation: 'slideInRight 0.3s ease-out' }}
    >
      <div className={`shrink-0 w-4.5 h-4.5 rounded-full flex items-center justify-center ${iconStyles[toast.type]}`}>
        <Icon className="w-2.5 h-2.5" />
      </div>
      <p className="text-[11px] font-medium flex-1">{toast.message}</p>
      <button
        onClick={onClose}
        className="shrink-0 p-0.5 hover:opacity-70 transition-opacity"
      >
        <FiX className="w-3 h-3" />
      </button>
    </div>
  );
}