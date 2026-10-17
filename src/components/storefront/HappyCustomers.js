'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { selectVisibleScreenshots } from '@/lib/happy-customers';
import { happyCustomersApi } from '@/lib/apiClient/happyCustomers.api';

export default function HappyCustomers() {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedIds, setFailedIds] = useState({});
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    async function fetchScreenshots() {
      try {
        const data = await happyCustomersApi.getAll();
        setScreenshots(data.happyCustomers || []);
      } catch {
        setScreenshots([]);
      } finally {
        setLoading(false);
      }
    }
    fetchScreenshots();
  }, []);

  const visible = selectVisibleScreenshots(screenshots, failedIds);

  if (!loading && visible.length === 0) return null;

  const lastIndex = Math.max(0, visible.length - 1);
  const activeIndex = Math.min(currentIndex, lastIndex);
  const current = visible[activeIndex];

  const goNext = () => setCurrentIndex((prev) => (Math.min(prev, lastIndex) + 1) % visible.length);
  const goPrev = () => setCurrentIndex((prev) => (Math.min(prev, lastIndex) - 1 + visible.length) % visible.length);

  const handleMarkFailed = (id) => {
    setFailedIds((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 40) goNext();
    else if (distance < -40) goPrev();
  };

  return (
    <section className="py-6 bg-warm-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-md font-bold text-warm-900 tracking-tight">Happy Customers</h2>
          <p className="text-[11px] text-warm-500 mt-0.5">Real feedback from our customers</p>
        </div>

        {loading ? (
          <div className="w-full max-w-[260px] mx-auto aspect-[9/16] rounded-xl border border-warm-200 bg-warm-100 animate-pulse" />
        ) : (
          <div
            className="flex items-center justify-center gap-2 sm:gap-4 select-none"
            aria-roledescription="carousel"
            aria-label="Happy customer screenshots"
          >
            {visible.length > 1 && (
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous screenshot"
                className="hidden sm:flex w-10 h-10 shrink-0 rounded-full bg-white border border-warm-200 items-center justify-center text-warm-600 hover:text-warm-900 hover:bg-warm-100 transition-colors shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-900"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <div
              className="relative w-full max-w-[260px] touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="w-full aspect-[9/16] rounded-xl overflow-hidden relative bg-warm-100 border border-warm-200 shadow-xs">
                <Image
                  key={current.id}
                  src={current.imageUrl}
                  alt={current.caption || 'Happy customer message screenshot'}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 90vw, 260px"
                  onError={() => handleMarkFailed(current.id)}
                />
              </div>

              {current.caption && (
                <p className="mt-2 text-[11px] sm:text-[12px] text-warm-600 text-center leading-relaxed line-clamp-2 px-2">
                  {current.caption}
                </p>
              )}

              {visible.length > 1 && (
                <div className="mt-1 flex items-center justify-center">
                  {visible.map((item, i) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrentIndex(i)}
                      aria-label={`Go to screenshot ${i + 1} of ${visible.length}`}
                      aria-current={activeIndex === i}
                      className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-900 rounded-full transition-transform active:scale-95"
                    >
                      <span
                        className={`h-1.5 rounded-full transition-all block ${
                          activeIndex === i ? 'w-4 bg-warm-900' : 'w-1.5 bg-warm-300 hover:bg-warm-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {visible.length > 1 && (
              <button
                type="button"
                onClick={goNext}
                aria-label="Next screenshot"
                className="hidden sm:flex w-10 h-10 shrink-0 rounded-full bg-white border border-warm-200 items-center justify-center text-warm-600 hover:text-warm-900 hover:bg-warm-100 transition-colors shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-900"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
