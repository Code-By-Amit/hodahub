'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ui/ProductCard';
import Pagination from '@/components/ui/Pagination';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import CustomSelect from '@/components/ui/CustomSelect';
import FilterPanel from '@/components/ui/FilterPanel';
import { Search, Filter, X, SlidersHorizontal, Package } from 'lucide-react';

const sortOptions = [
  { label: 'Relevance', value: 'newest' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Top Rated', value: 'top-rated' },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentCategory = searchParams.get('category') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const page = parseInt(searchParams.get('page') || '1');

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allCategoriesList, setAllCategoriesList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    async function search() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set('search', query);
        params.set('page', page.toString());
        params.set('limit', '12');
        params.set('sort', currentSort);
        if (currentCategory) params.set('category', currentCategory);
        if (currentMinPrice) params.set('minPrice', currentMinPrice);
        if (currentMaxPrice) params.set('maxPrice', currentMaxPrice);

        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        setProducts(data.products || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      } catch {}
      setLoading(false);
    }
    search();
  }, [query, page, currentSort, currentCategory, currentMinPrice, currentMaxPrice]);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
      setAllCategoriesList(data.allCategories || data.categories || []);
    } catch {}
  }

  function updateFilters(updates) {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.set('page', '1');
    router.push(`/search?${params.toString()}`);
  }

  function handlePriceFilter() {
    updateFilters({ minPrice: minPrice || null, maxPrice: maxPrice || null });
  }

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    router.push(`/search?${params.toString()}`);
  }

  const hasFilters = Boolean(currentCategory || currentMinPrice || currentMaxPrice);
  const selectedCategoryObj = categories.find((c) => c.slug === currentCategory);

  const matchingCategories = query.trim()
    ? allCategoriesList.filter((c) =>
        c.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <Breadcrumbs items={[{ label: 'Search' }]} />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-warm-200/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-warm-900 tracking-tight">
            {query ? `Search results for "${query}"` : 'Search Catalog'}
          </h1>
          <p className="text-xs sm:text-sm text-warm-500 mt-1">
            {matchingCategories.length} category match{matchingCategories.length !== 1 ? 'es' : ''} &bull; {pagination.total} product{pagination.total !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Toolbar & Sort */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(true)}
            className="lg:hidden flex items-center gap-2 px-3.5 py-2.5 border border-warm-200 rounded-lg text-xs font-semibold text-warm-700 bg-white hover:bg-warm-50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4 text-warm-600" />
            <span>Filters</span>
            {hasFilters && <span className="w-2 h-2 bg-brand-600 rounded-full" />}
          </button>

          <div className="w-48 sm:w-56">
            <CustomSelect
              options={sortOptions}
              value={currentSort}
              onChange={(val) => updateFilters({ sort: val })}
            />
          </div>
        </div>
      </div>

      {/* Matching Categories Section */}
      {matchingCategories.length > 0 && (
        <div className="bg-warm-50/70 border border-warm-200/80 rounded-xl p-4 sm:p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-warm-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-brand-600" />
            Matching Categories ({matchingCategories.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {matchingCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group flex items-center gap-3 p-2.5 bg-white border border-warm-200/90 rounded-lg hover:border-brand-500 hover:shadow-md transition-all"
              >
                {cat.imageUrl ? (
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-9 h-9 rounded-md object-cover border border-warm-200 shrink-0 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-md bg-warm-100 text-warm-500 flex items-center justify-center shrink-0">
                    <Search className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-warm-900 group-hover:text-brand-600 truncate transition-colors">
                    {cat.name}
                  </p>
                  <p className="text-[10px] text-warm-400 truncate">Browse Category</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap bg-warm-50 p-3 rounded-xl border border-warm-200/60">
          <span className="text-xs font-bold text-warm-700 uppercase tracking-wider mr-1">
            Active Filters:
          </span>

          {currentCategory && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-warm-200 rounded-md text-xs font-semibold text-warm-800 shadow-2xs">
              Category: {selectedCategoryObj?.name || currentCategory}
              <button
                onClick={() => updateFilters({ category: null })}
                className="text-warm-400 hover:text-warm-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {(currentMinPrice || currentMaxPrice) && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-warm-200 rounded-md text-xs font-semibold text-warm-800 shadow-2xs">
              Price: ₹{currentMinPrice || '0'} – ₹{currentMaxPrice || '∞'}
              <button
                onClick={() => {
                  setMinPrice('');
                  setMaxPrice('');
                  updateFilters({ minPrice: null, maxPrice: null });
                }}
                className="text-warm-400 hover:text-warm-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          <button
            onClick={clearFilters}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 ml-auto hover:underline"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Layout Grid */}
      <div className="flex gap-8">
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="bg-white border border-warm-200 rounded-xl p-5 shadow-xs sticky top-24">
            <FilterPanel
              categories={categories}
              currentCategory={currentCategory}
              minPrice={minPrice}
              maxPrice={maxPrice}
              setMinPrice={setMinPrice}
              setMaxPrice={setMaxPrice}
              onCategoryChange={(slug) => updateFilters({ category: slug || null })}
              onPriceFilter={handlePriceFilter}
              onClear={clearFilters}
              hasFilters={hasFilters}
            />
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-warm-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {pagination.totalPages > 1 && (
                <div className="mt-10">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(p) => updateFilters({ page: p.toString() })}
                  />
                </div>
              )}
            </>
          ) : query ? (
            <div className="bg-white border border-warm-200 rounded-xl p-12 text-center my-6">
              <Search className="w-12 h-12 mx-auto text-warm-300 mb-3" />
              <h3 className="text-base font-bold text-warm-900 mb-1">No products found matching &quot;{query}&quot;</h3>
              <p className="text-xs text-warm-500 max-w-sm mx-auto mb-6">
                Check for spelling errors or try searching with more general keywords or clearing filters.
              </p>
              <Link
                href="/products"
                className="px-5 py-2.5 bg-warm-900 text-white text-xs font-semibold rounded-lg hover:bg-warm-800 transition-colors inline-block"
              >
                Browse All Products
              </Link>
            </div>
          ) : (
            <div className="bg-white border border-warm-200 rounded-xl p-12 text-center my-6">
              <Search className="w-12 h-12 mx-auto text-warm-300 mb-3" />
              <h3 className="text-base font-bold text-warm-900 mb-1">Type a keyword to start searching</h3>
              <p className="text-xs text-warm-500 max-w-sm mx-auto mb-6">
                Search by product name, category, or description.
              </p>
              <Link
                href="/products"
                className="px-5 py-2.5 bg-warm-900 text-white text-xs font-semibold rounded-lg hover:bg-warm-800 transition-colors inline-block"
              >
                Browse All Products
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowFilters(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-2xl p-6 overflow-y-auto z-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-warm-100 pb-4 mb-6">
                <h3 className="text-base font-bold text-warm-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-brand-600" /> Filter Options
                </h3>
                <button onClick={() => setShowFilters(false)} className="p-1.5 text-warm-400 hover:text-warm-900 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <FilterPanel
                categories={categories}
                currentCategory={currentCategory}
                minPrice={minPrice}
                maxPrice={maxPrice}
                setMinPrice={setMinPrice}
                setMaxPrice={setMaxPrice}
                onCategoryChange={(slug) => {
                  updateFilters({ category: slug || null });
                  setShowFilters(false);
                }}
                onPriceFilter={() => {
                  handlePriceFilter();
                  setShowFilters(false);
                }}
                onClear={() => {
                  clearFilters();
                  setShowFilters(false);
                }}
                hasFilters={hasFilters}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="h-6 w-48 bg-warm-100 rounded animate-pulse" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}

