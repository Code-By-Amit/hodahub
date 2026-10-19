'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { selectVisibleScreenshots } from '@/lib/happy-customers';
import { happyCustomersApi } from '@/lib/apiClient/happyCustomers.api';

function usePerView() {
  const [perView, setPerView] = useState(5);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setPerView(w < 640 ? 1 : w < 1024 ? 3 : 5);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return perView;
}

export default function HappyCustomers() {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState(0);
  const [failedIds, setFailedIds] = useState({});
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const perView = usePerView();

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

  const total = visible.length;
  const canSlide = total > perView;
  const maxStart = Math.max(0, total - perView);
  const activeStart = Math.min(start, maxStart);

  const goNext = () => setStart(Math.min(activeStart + 1, maxStart));
  const goPrev = () => setStart(Math.max(activeStart - 1, 0));

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
    if (!canSlide) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 40) goNext();
    else if (distance < -40) goPrev();
  };

  const arrowClass =
    'absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-warm-200 flex items-center justify-center text-warm-600 hover:text-warm-900 hover:bg-warm-100 transition-colors shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-900 disabled:opacity-40 disabled:pointer-events-none';

  return (
    <section className="py-6 bg-warm-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <h2 className="text-md font-bold text-warm-900 tracking-tight">Happy Customers</h2>
          <p className="text-[11px] text-warm-500 mt-0.5">Real feedback from our customers</p>
        </div>

        {loading ? (
          <div className="w-full max-w-[260px] mx-auto aspect-[9/16] rounded-xl border border-warm-200 bg-warm-100 animate-pulse" />
        ) : (
          <div
            className="relative select-none"
            aria-roledescription="carousel"
            aria-label="Happy customer screenshots"
          >
            {canSlide && (
              <button
                type="button"
                onClick={goPrev}
                disabled={activeStart === 0}
                aria-label="Previous screenshot"
                className={`${arrowClass} left-0 sm:-left-5`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <div
              className="overflow-hidden touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className={`flex transition-transform duration-300 ease-out ${canSlide ? '' : 'justify-center'}`}
                style={{
                  transform: canSlide ? `translateX(-${activeStart * (100 / perView)}%)` : 'none',
                }}
              >
                {visible.map((item) => (
                  <div
                    key={item.id}
                    className="flex-none px-1.5 sm:px-2"
                    style={{ width: `${100 / perView}%` }}
                  >
                    <div className="mx-auto max-w-[260px]">
                      <div className="w-full aspect-[9/16] rounded-xl overflow-hidden relative bg-warm-100 border border-warm-200 shadow-xs">
                        <Image
                          src={item.imageUrl}
                          alt={item.caption || 'Happy customer message screenshot'}
                          fill
                          className="object-contain"
                          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 30vw, 240px"
                          onError={() => handleMarkFailed(item.id)}
                        />
                      </div>
                      {item.caption && (
                        <p className="mt-2 text-[11px] sm:text-[12px] text-warm-600 text-center leading-relaxed line-clamp-2 px-1">
                          {item.caption}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {canSlide && (
              <button
                type="button"
                onClick={goNext}
                disabled={activeStart >= maxStart}
                aria-label="Next screenshot"
                className={`${arrowClass} right-0 sm:-right-5`}
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