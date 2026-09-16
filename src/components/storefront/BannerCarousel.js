'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

export default function BannerCarousel() {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isSwiping = useRef(false);

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

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [banners.length, isPaused]);

  if (!banners || banners.length === 0) return null;

  const currentBanner = banners[currentIndex];
  const hasText = Boolean(currentBanner.title || currentBanner.subtitle);

  const handleNext = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handlePrev = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleDotClick = (e, index) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentIndex(index);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    isSwiping.current = false;
    setIsPaused(true);
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
    const diff = Math.abs(touchStartX.current - touchEndX.current);
    if (diff > 10) {
      isSwiping.current = true;
    }
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    if (distance > minSwipeDistance) {
      // Swiped left -> Next banner
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    } else if (distance < -minSwipeDistance) {
      // Swiped right -> Previous banner
      setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    }
  };

  const handleLinkClick = (e) => {
    if (isSwiping.current) {
      e.preventDefault();
      e.stopPropagation();
      isSwiping.current = false;
    }
  };

  return (
    <section className="max-w-4xl mx-auto sm:px-1 pt-4 pb-2">
      {/* Outer fixed-size relative container */}
      <div
        className="relative w-full h-44 sm:h-56 md:h-64 lg:h-72 rounded-xl overflow-hidden shadow-sm select-none group"
        style={{ backgroundColor: currentBanner.bgColor || '#18181b' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Banner Clickable Slide Area */}
        {currentBanner.linkUrl ? (
          <Link
            href={currentBanner.linkUrl}
            onClick={handleLinkClick}
            className="absolute inset-0 z-0 flex items-center cursor-pointer hover:opacity-95 transition-opacity"
          >
            <SlideContent currentBanner={currentBanner} hasText={hasText} />
          </Link>
        ) : (
          <div className="absolute inset-0 z-0 flex items-center">
            <SlideContent currentBanner={currentBanner} hasText={hasText} />
          </div>
        )}

        {/* Navigation Controls (positioned outside Link so clicks never trigger navigation) */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-colors z-20 cursor-pointer"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-colors z-20 cursor-pointer"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Indicator Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => handleDotClick(e, i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentIndex === i ? 'w-5 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
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

function SlideContent({ currentBanner, hasText }) {
  return (
    <>
      {/* Background / Main Image */}
      {currentBanner.imageUrl && (
        <div className="absolute inset-0 z-0">
          <Image
            src={currentBanner.imageUrl}
            alt={currentBanner.title || 'Promotional Banner'}
            fill
            className={`object-cover ${hasText ? 'opacity-40' : 'opacity-100'}`}
            sizes="(max-width: 768px) 100vw, 896px"
            priority
          />
          {hasText && (
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          )}
        </div>
      )}

      {/* Content Container */}
      {hasText && (
        <div className="relative z-10 p-5 sm:p-8 md:p-10 max-w-xl text-white space-y-2">
          {currentBanner.title && (
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight line-clamp-2">
              {currentBanner.title}
            </h2>
          )}
          {currentBanner.subtitle && (
            <p className="text-xs sm:text-sm text-warm-200 line-clamp-2 leading-relaxed">
              {currentBanner.subtitle}
            </p>
          )}
          {currentBanner.linkUrl && (
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white text-warm-900 text-xs font-bold rounded-lg hover:bg-warm-100 transition-colors shadow-xs">
                <span>Shop Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
