'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import Pagination from '@/components/ui/Pagination';
import { Search, X, Package, Tag, RotateCcw } from 'lucide-react';
import { brandsApi } from '@/lib/apiClient/brands.api';

function BrandsDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlQ = searchParams.get('q') || '';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);

  const [searchTerm, setSearchTerm] = useState(urlQ);
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 24, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync local search input during render if URL changes
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setSearchTerm(urlQ);
  }

  // Debounced search sync to URL query (?q=)
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams.toString());
      if (searchTerm.trim()) {
        nextParams.set('q', searchTerm.trim());
      } else {
        nextParams.delete('q');
      }
      nextParams.set('page', '1');
      const qs = nextParams.toString();
      router.push(`/brands${qs ? `?${qs}` : ''}`);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, router, searchParams]);

  // Fetch brands data
  useEffect(() => {
    let cancelled = false;
    async function fetchBrands() {
      setLoading(true);
      setError(null);
      try {
        const data = await brandsApi.getAll({
          q: urlQ || undefined,
          page: urlPage,
          limit: 24,
        });
        if (!cancelled) {
          setBrands(data?.brands || []);
          setPagination(data?.pagination || { page: urlPage, limit: 24, total: 0, totalPages: 1 });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load brands');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchBrands();
    return () => {
      cancelled = true;
    };
  }, [urlQ, urlPage]);

  const handlePageChange = (newPage) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('page', newPage.toString());
    const qs = nextParams.toString();
    router.push(`/brands${qs ? `?${qs}` : ''}`);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    router.push('/brands');
  };

  return (
    <div className="max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Brands' }]} />

      {/* Page Header */}
      <div className="border-b border-warm-200/80 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-warm-900 tracking-tight flex items-center gap-2">
          <Tag className="w-5 h-5 text-warm-900" />
          Shop by brand
        </h1>
        <p className="text-[11px] sm:text-xs text-warm-500 mt-1">
          Tap a brand to see all its products
        </p>

        {/* Search bar & Live count */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search brands..."
              aria-label="Search brands"
              className="w-full pl-8 pr-8 py-1.5 bg-white border border-warm-200 rounded-lg text-xs text-warm-900 placeholder:text-warm-400 outline-none focus:ring-1 focus:ring-warm-900/20 focus:border-warm-900 transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-900 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div
            aria-live="polite"
            className="text-[11px] text-warm-500 font-medium whitespace-nowrap"
          >
            {!loading && (
              <span>
                Showing {brands.length} of {pagination.total} brand{pagination.total !== 1 ? 's' : ''}
                {urlQ && <span> matching &ldquo;{urlQ}&rdquo;</span>}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center">
          <p className="text-xs font-semibold text-rose-800 mb-2">{error}</p>
          <button
            onClick={() => router.refresh()}
            className="px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Loading state skeleton */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="bg-warm-50/70 border border-warm-200/80 rounded-xl p-3 flex flex-col items-center animate-pulse"
            >
              <div className="w-full aspect-square bg-warm-200/60 rounded-lg mb-2.5" />
              <div className="h-3 w-20 bg-warm-200/70 rounded mb-1" />
              <div className="h-2.5 w-12 bg-warm-200/50 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Brand Tiles Grid */}
      {!loading && !error && brands.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
            {brands.map((b) => (
              <Link
                key={b.slug}
                href={`/brands/${b.slug}`}
                className="group bg-warm-50/70 hover:bg-white border border-warm-200/80 hover:border-warm-300 rounded-xl p-3 flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-warm-900/30"
              >
                {/* Image container in a square with object-contain */}
                <div className="relative w-full aspect-square bg-white border border-warm-100/80 rounded-lg p-2.5 mb-2.5 overflow-hidden flex items-center justify-center shrink-0">
                  {b.image ? (
                    <Image
                      src={b.image}
                      alt={b.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-warm-300">
                      <Package className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Brand Name (small uppercase with letter spacing, verbatim) */}
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-warm-900 truncate w-full group-hover:text-warm-800 transition-colors">
                  {b.name}
                </h2>

                {/* Count Label */}
                <span className="text-[10px] text-warm-500 font-medium mt-0.5">
                  {b.productCount} item{b.productCount !== 1 ? 's' : ''}
                </span>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-8 pt-4 border-t border-warm-200/80">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && !error && brands.length === 0 && (
        <div className="bg-white border border-warm-200 rounded-xl p-10 text-center my-6">
          <Tag className="w-8 h-8 mx-auto text-warm-300 mb-2" />
          <h2 className="text-sm font-bold text-warm-900 mb-1">
            {urlQ ? `No brands match "${urlQ}"` : 'No brands available'}
          </h2>
          <p className="text-[11px] text-warm-500 max-w-sm mx-auto mb-4">
            {urlQ
              ? 'Try checking for typos or searching for a different brand name.'
              : 'Products from our brands will appear here as soon as they are active.'}
          </p>
          {urlQ && (
            <button
              onClick={handleClearSearch}
              className="px-3.5 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function BrandsDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="h-4 w-32 bg-warm-100 rounded animate-pulse" />
          <div className="h-8 w-60 bg-warm-100 rounded animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-warm-100 animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <BrandsDirectoryContent />
    </Suspense>
  );
}
