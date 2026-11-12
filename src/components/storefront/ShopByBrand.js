'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ArrowRight, Tag } from 'lucide-react';

export default function ShopByBrand({ brands = [] }) {
  const scrollRef = useRef(null);

  if (!brands || brands.length === 0) return null;

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="py-6 bg-white border-y border-warm-200/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-brand-50 text-brand-600">
                <Tag className="w-3.5 h-3.5" />
              </span>
              <h2 className="text-md font-bold text-warm-900 tracking-tight">
                Shop by Brand
              </h2>
            </div>
            <p className="text-[11px] text-warm-500 mt-0.5">
              Browse top featured brands and official collections
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/brands"
              className="flex items-center gap-1 text-[11px] font-medium text-warm-600 hover:text-brand-600 transition-colors"
            >
              <span>View All Brands</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Scroll Navigation Buttons for Desktop */}
            <div className="hidden sm:flex items-center gap-1 ml-2">
              <button
                type="button"
                onClick={() => scroll('left')}
                className="p-1.5 rounded-full border border-warm-200 text-warm-600 hover:bg-warm-100 hover:text-warm-900 transition-colors"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                className="p-1.5 rounded-full border border-warm-200 text-warm-600 hover:bg-warm-100 hover:text-warm-900 transition-colors"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 3-Row Horizontal Slider */}
        <div
          ref={scrollRef}
          className="grid grid-rows-3 grid-flow-col auto-cols-[210px] sm:auto-cols-[240px] gap-3 overflow-x-auto scrollbar-hide py-1.5 scroll-smooth"
        >
          {brands.map((b) => (
            <Link
              key={b.slug || b.name}
              href={`/brands/${b.slug}`}
              className="group flex items-center gap-3 p-2.5 sm:p-3 bg-white hover:bg-warm-50/50 border border-warm-200/90 hover:border-brand-500/80 rounded-lg transition-all shadow-2xs hover:shadow-xs"
            >
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-md bg-warm-50/80 border border-warm-200/70 overflow-hidden shrink-0 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
                {b.image ? (
                  <Image
                    src={b.image}
                    alt={b.name}
                    fill
                    className="object-contain p-1"
                    sizes="64px"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-warm-100 to-warm-200 flex items-center justify-center text-warm-700 font-bold text-sm uppercase">
                    {b.name.slice(0, 2)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-[13px] font-bold text-warm-900 truncate group-hover:text-brand-600 transition-colors">
                  {b.name}
                </h4>
                <p className="text-[11px] text-warm-500 truncate mt-0.5">
                  {b.productCount ? `${b.productCount} ${b.productCount === 1 ? 'item' : 'items'}` : 'View products'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

