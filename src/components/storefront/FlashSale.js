'use client';

import Link from 'next/link';
import { ArrowRight, Tag, Sparkles } from 'lucide-react';

export default function FlashSale({ hasDiscounts = true }) {
  return (
    <section className="py-6">
      <div className="max-w-4xl mx-auto px-1">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Promotional Deals Banner */}
          {hasDiscounts && (
            <div className="relative overflow-hidden rounded-md bg-gradient-to-br from-brand-600 via-brand-500 to-amber-500 p-5 sm:p-6 text-white min-h-[160px] flex flex-col justify-between shadow-md">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[8px] font-bold uppercase tracking-wider mb-2">
                  <Tag className="w-1.5 h-1.5" />
                  Special Offers
                </span>
                <h3 className="text-md font-extrabold mb-1.5">
                  Discounted Deals
                </h3>
                <p className="text-white/90 text-[11px] max-w-sm mb-3">
                  Save on selected items in stock. Limited availability while inventory lasts.
                </p>
              </div>

              <Link
                href="/products?sort=discount"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-brand-600 font-bold text-[11px] rounded-full hover:bg-brand-50 active:scale-[0.98] transition-all w-fit shadow-sm"
              >
                <span>Shop Discounted Items</span>
                <ArrowRight className="w-3 h-3" />
              </Link>

              {/* Decorative elements */}
              <div className="absolute -bottom-14 -right-14 w-40 h-40 bg-white/10 rounded-full" />
            </div>
          )}

          {/* New Arrivals Collection */}
          <div className={`relative overflow-hidden rounded-md bg-warm-900 p-5 sm:p-6 text-white min-h-[160px] flex flex-col justify-between shadow-md ${!hasDiscounts ? 'md:col-span-2' : ''}`}>
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-500/20 backdrop-blur-sm rounded-full text-[8px] font-bold uppercase tracking-wider text-brand-300 mb-2">
                <Sparkles className="w-1.5 h-1.5 text-brand-400" />
                Latest Arrivals
              </span>
              <h3 className="text-md font-extrabold mb-1.5">
                Fresh Styles {new Date().getFullYear()}
              </h3>
              <p className="text-warm-400 text-[11px] max-w-sm mb-3">
                Explore the latest additions to our store catalog.
              </p>
            </div>

            <Link
              href="/products?sort=newest"
              className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-white/30 text-white font-bold text-[11px] rounded-full hover:bg-white hover:text-warm-900 active:scale-[0.98] transition-all w-fit"
            >
              <span>Explore New Products</span>
              <ArrowRight className="w-3 h-3" />
            </Link>

            {/* Decorative elements */}
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-brand-500/10 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}