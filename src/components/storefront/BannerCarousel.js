'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

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
    }, 4500);

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
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      {/* Outer fixed-size relative container */}
      <div
        className="relative w-full h-44 sm:h-56 md:h-64 lg:h-72 rounded-xl overflow-hidden shadow-sm select-none group bg-transparent"
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

        {/* Indicator Dots */}
        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => handleDotClick(e, i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentIndex === i ? 'w-5 bg-white shadow-xs' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
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
            className="object-cover opacity-100"
            sizes="(max-width: 768px) 100vw, 896px"
            priority
          />
        </div>
      )}

      {/* Content Container */}
      {hasText && (
        <div className="relative z-10 p-5 sm:p-8 md:p-10 max-w-xl text-white space-y-2">
          {currentBanner.title && (
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight line-clamp-2 [text-shadow:_0_2px_4px_rgba(0,0,0,0.7)]">
              {currentBanner.title}
            </h2>
          )}
          {currentBanner.subtitle && (
            <p className="text-xs sm:text-sm text-white/90 line-clamp-2 leading-relaxed [text-shadow:_0_1px_3px_rgba(0,0,0,0.7)]">
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
