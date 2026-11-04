'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiRefreshCw, FiHome, FiChevronDown, FiChevronUp, FiCopy, FiCheck } from 'react-icons/fi';

export default function GlobalErrorPage({ error, reset }) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  const errorMessage = error?.message || 'An unexpected error occurred while processing your request.';
  const errorDigest = error?.digest;
  const errorStack = error?.stack;

  const fullDiagnostics = JSON.stringify(
    {
      name: error?.name || 'Error',
      message: errorMessage,
      digest: errorDigest || null,
      stack: errorStack || null,
      url: typeof window !== 'undefined' ? window.location.href : null,
      timestamp: new Date().toISOString(),
    },
    null,
    2
  );

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullDiagnostics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="text-center w-full max-w-lg bg-white p-6 sm:p-8 rounded-3xl border border-warm-200 shadow-md">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
          <FiAlertTriangle className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold text-warm-900 tracking-tight mb-2">Something went wrong</h1>
        
        <p className="text-sm text-warm-600 mb-4 leading-relaxed font-medium">
          {errorMessage}
        </p>

        {errorDigest && (
          <div className="inline-block bg-warm-100 text-warm-700 text-xs font-mono px-3 py-1 rounded-full mb-4">
            Error ID: {errorDigest}
          </div>
        )}

        {/* Expandable Technical Details */}
        <div className="my-4 text-left border border-warm-200 rounded-2xl overflow-hidden bg-warm-50/50">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-warm-700 hover:bg-warm-100 transition-colors"
          >
            <span>Technical Details & Diagnostics</span>
            {showDetails ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
          </button>

          {showDetails && (
            <div className="p-4 border-t border-warm-200 text-xs font-mono bg-warm-900 text-warm-100 rounded-b-2xl overflow-x-auto max-h-60">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-warm-800">
                <span className="text-warm-400">Error Payload</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-warm-800 hover:bg-warm-700 text-white rounded text-[10px] transition-colors"
                >
                  {copied ? <FiCheck className="w-3 h-3 text-green-400" /> : <FiCopy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                {fullDiagnostics}
              </pre>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-500 text-white font-semibold text-sm rounded-xl shadow-md hover:bg-brand-600 transition-all cursor-pointer"
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
