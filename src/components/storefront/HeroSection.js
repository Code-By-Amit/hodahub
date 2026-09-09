'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, ShoppingBag, ShieldCheck, Truck, RefreshCw } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-warm-50 via-white to-brand-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[480px] lg:min-h-[560px] py-12 lg:py-16">
          {/* Left: Content */}
          <div className="relative z-10 space-y-6" style={{ animation: 'slideUp 0.6s ease-out' }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-50 border border-brand-200 rounded-full text-brand-700 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-brand-600 animate-pulse" />
              <span>Curated Collection</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-warm-900 leading-[1.15] tracking-tight">
              Discover Products{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-amber-600 block">
                You&apos;ll Love
              </span>
            </h1>

            <p className="text-base sm:text-lg text-warm-600 max-w-lg leading-relaxed">
              Explore quality items carefully selected for modern living. Fast shipping, guaranteed authenticity, and seamless shopping.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/products"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-brand-600 text-white font-semibold rounded-full hover:bg-brand-700 shadow-lg shadow-brand-600/25 hover:shadow-xl hover:shadow-brand-600/30 active:scale-[0.98] transition-all duration-200"
              >
                <span>Shop Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-white text-warm-900 font-semibold rounded-full border border-warm-200 hover:border-warm-300 hover:bg-warm-50 active:scale-[0.98] transition-all duration-200"
              >
                <span>Explore Categories</span>
              </Link>
            </div>

            {/* Value Highlights (replacing fake social proof) */}
            <div className="pt-6 border-t border-warm-200/60 flex flex-wrap gap-6 text-xs font-medium text-warm-600">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-600" />
                <span>Fast Express Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-600" />
                <span>100% Secure Checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-brand-600" />
                <span>Easy Returns</span>
              </div>
            </div>
          </div>

          {/* Right: Visual Showcase */}
          <div className="relative hidden lg:flex items-center justify-center h-full min-h-[380px]" style={{ animation: 'fadeIn 0.8s ease-out 0.2s both' }}>
            <div className="relative w-full max-w-md aspect-square rounded-3xl bg-gradient-to-tr from-brand-500/10 via-amber-500/10 to-brand-100 p-8 flex flex-col justify-between border border-brand-100/50 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center text-brand-600">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 bg-white/80 rounded-full text-xs font-semibold text-warm-700 shadow-sm">
                  Premium Storefront
                </span>
              </div>

              <div className="my-auto text-center space-y-3 py-6">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-white shadow-xl flex items-center justify-center text-brand-600">
                  <Sparkles className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-warm-900">Elevate Your Everyday</h3>
                <p className="text-xs text-warm-500 max-w-xs mx-auto">
                  Browse products, manage cart items, and enjoy instant checkout experience.
                </p>
              </div>

              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg flex items-center justify-between border border-warm-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-semibold text-warm-800">Live Inventory Active</span>
                </div>
                <Link href="/products" className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                  View <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

