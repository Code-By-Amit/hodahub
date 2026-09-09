'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiRefreshCw, FiGrid } from 'react-icons/fi';

export default function AdminErrorPage({ error, reset }) {
  useEffect(() => {
    console.error('Admin panel error:', error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="text-center max-w-sm bg-white p-5 rounded-md border border-warm-200 shadow-sm">
        <div className="w-9 h-9 rounded-md bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
          <FiAlertTriangle className="w-5 h-5" />
        </div>

        <h2 className="text-base font-bold text-warm-900 mb-1.5">Admin Dashboard Error</h2>
        <p className="text-[11px] text-warm-500 mb-4">
          Failed to load admin module. Please refresh the page or return to the main dashboard.
        </p>

        <div className="flex gap-2 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-500 text-white font-medium text-[11px] rounded-md hover:bg-brand-600 transition-all"
          >
            <FiRefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-warm-100 text-warm-700 font-medium text-[11px] rounded-md hover:bg-warm-200 transition-all"
          >
            <FiGrid className="w-3.5 h-3.5" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}