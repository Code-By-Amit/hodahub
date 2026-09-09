'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';

export default function GlobalErrorPage({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="text-center max-w-md bg-white p-8 rounded-3xl border border-warm-200 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
          <FiAlertTriangle className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold text-warm-900 tracking-tight mb-2">Something went wrong</h1>
        <p className="text-sm text-warm-500 mb-6 leading-relaxed">
          An unexpected error occurred while processing your request. Please try again or return home.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-500 text-white font-semibold text-sm rounded-xl shadow-md hover:bg-brand-600 transition-all"
          >
            <FiRefreshCw className="w-4 h-4" /> Try Again
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-warm-100 text-warm-700 font-semibold text-sm rounded-xl hover:bg-warm-200 transition-all"
          >
            <FiHome className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
