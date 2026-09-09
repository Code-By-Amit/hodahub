'use client';

import Link from 'next/link';
import { FiHome, FiShoppingBag } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-warm-50 via-white to-brand-50 px-4">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-brand-100/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-amber-100/30 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="relative text-center max-w-md" style={{ animation: 'slideUp 0.6s ease-out' }}>
        {/* 404 large text */}
        <h1 className="text-[90px] sm:text-[120px] font-extrabold leading-none tracking-tighter">
          <span className="gradient-text">4</span>
          <span className="text-warm-200">0</span>
          <span className="gradient-text">4</span>
        </h1>

        {/* Brand */}
        <div className="mb-3">
          <span className="text-base font-extrabold text-warm-900 tracking-tight">
            Hoda<span className="text-brand-500">Hub</span>
          </span>
        </div>

        <h2 className="text-lg font-bold text-warm-900 mb-2">Page Not Found</h2>
        <p className="text-warm-500 text-[13px] mb-5 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 text-white font-semibold text-[13px] rounded-full shadow-lg shadow-brand-500/25 hover:bg-brand-600 hover:shadow-xl active:scale-[0.98] transition-all"
          >
            <FiHome className="w-3.5 h-3.5" />
            Go Home
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white text-warm-900 font-semibold text-[13px] rounded-full border border-warm-200 hover:border-warm-300 hover:bg-warm-50 active:scale-[0.98] transition-all"
          >
            <FiShoppingBag className="w-3.5 h-3.5" />
            Shop Products
          </Link>
        </div>
      </div>
    </div>
  );
}