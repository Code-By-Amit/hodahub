'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

export default function BannerCarousel() {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    async function fetchActiveBanners() {
      try {
        const res = await fetch('/api/banners');
        const data = await res.json();
        setBanners(data.banners || []);
      } catch {
        setBanners([]);
      }
    }
    fetchActiveBanners();
  }, []);

  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timerRef.current);
  }, [banners.length, isPaused]);

  if (!banners || banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div
        className="relative rounded-xl overflow-hidden shadow-sm transition-all duration-500 min-h-[160px] sm:min-h-[220px] lg:min-h-[260px] flex items-center"
        style={{ backgroundColor: currentBanner.bgColor || '#18181b' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Background Image if present */}
        {currentBanner.imageUrl && (
          <div className="absolute inset-0 z-0">
            <Image
              src={currentBanner.imageUrl}
              alt={currentBanner.title}
              fill
              className="object-cover opacity-35"
              sizes="1280px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          </div>
        )}

        {/* Content Container */}
        <div className="relative z-10 p-6 sm:p-10 max-w-xl text-white space-y-2">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight">
            {currentBanner.title}
          </h2>
          {currentBanner.subtitle && (
            <p className="text-xs sm:text-sm text-warm-200 line-clamp-2 leading-relaxed">
              {currentBanner.subtitle}
            </p>
          )}
          {currentBanner.linkUrl && (
            <div className="pt-2">
              <Link
                href={currentBanner.linkUrl}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-warm-900 text-xs font-bold rounded-lg hover:bg-warm-100 transition-colors shadow-xs"
              >
                <span>Shop Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xs transition-colors z-20"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xs transition-colors z-20"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentIndex === i ? 'w-5 bg-white' : 'bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
