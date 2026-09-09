'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProductCard from '@/components/ui/ProductCard';
import Pagination from '@/components/ui/Pagination';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import CustomSelect from '@/components/ui/CustomSelect';
import FilterPanel from '@/components/ui/FilterPanel';
import { Search, Filter, X, SlidersHorizontal, Package } from 'lucide-react';

const sortOptions = [
  { label: 'Newest Arrivals', value: 'newest' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Top Rated', value: 'top-rated' },
  { label: 'Best Sellers', value: 'best-sellers' },
];

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const currentSort = searchParams.get('sort') || 'newest';
  const currentCategory = searchParams.get('category') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentPage = parseInt(searchParams.get('page') || '1');

  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentSort, currentCategory, currentMinPrice, currentMaxPrice, currentPage]);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch { }
  }

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '12');
      params.set('sort', currentSort);
      if (currentCategory) params.set('category', currentCategory);
      if (currentMinPrice) params.set('minPrice', currentMinPrice);
      if (currentMaxPrice) params.set('maxPrice', currentMaxPrice);

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch { }
    setLoading(false);
  }

  function updateFilters(updates) {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.set('page', '1');
    router.push(`/products?${params.toString()}`);
  }

  function handlePriceFilter() {
    updateFilters({ minPrice: minPrice || null, maxPrice: maxPrice || null });
  }

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
    router.push('/products');
  }

  const selectedCategoryObj = categories.find((c) => c.slug === currentCategory);
  const hasFilters = Boolean(currentCategory || currentMinPrice || currentMaxPrice);

  const pageTitle = selectedCategoryObj
    ? selectedCategoryObj.name
    : currentSort === 'newest'
      ? 'New Arrivals'
      : currentSort === 'best-sellers'
        ? 'Best Sellers'
        : 'All Products';

  const pageSubtitle = selectedCategoryObj
    ? `Explore our collection of ${selectedCategoryObj.name.toLowerCase()} items (${pagination.total} total)`
    : currentSort === 'newest'
      ? `Discover the latest additions to our storefront (${pagination.total} total)`
      : currentSort === 'best-sellers'
        ? `Browse our top-rated customer favorite products (${pagination.total} total)`
        : `Explore quality curated items for your home and lifestyle (${pagination.total} total)`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs items={[{ label: pageTitle, href: '/products' }]} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-warm-200/80 pb-3">
        <div>
          <h1 className="text-md font-bold text-warm-900 tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-[11px] text-warm-500 mt-0.5">
            {pageSubtitle}
          </p>
        </div>

        {/* Toolbar & Sort */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(true)}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] font-semibold text-warm-700 bg-white hover:bg-warm-50 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-warm-600" />
            <span>Filters</span>
            {hasFilters && (
              <span className="w-1.5 h-1.5 bg-brand-600 rounded-full" />
            )}
          </button>

          <div className="w-40 sm:w-44">
            <CustomSelect
              options={sortOptions}
              value={currentSort}
              onChange={(val) => updateFilters({ sort: val })}
            />
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasFilters && (
        <div className="flex items-center gap-1.5 flex-wrap bg-warm-50 p-2 rounded-lg border border-warm-200/60">
          <span className="text-[10px] font-bold text-warm-700 uppercase tracking-wider mr-0.5">
            Active Filters:
          </span>

          {currentCategory && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-warm-200 rounded-md text-[10px] font-semibold text-warm-800 shadow-2xs">
              Category: {selectedCategoryObj?.name || currentCategory}
              <button
                onClick={() => updateFilters({ category: null })}
                className="text-warm-400 hover:text-warm-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(currentMinPrice || currentMaxPrice) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-warm-200 rounded-md text-[10px] font-semibold text-warm-800 shadow-2xs">
              Price: ${currentMinPrice || '0'} – ${currentMaxPrice || '∞'}
              <button
                onClick={() => {
                  setMinPrice('');
                  setMaxPrice('');
                  updateFilters({ minPrice: null, maxPrice: null });
                }}
                className="text-warm-400 hover:text-warm-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={clearFilters}
            className="text-[10px] font-bold text-brand-600 hover:text-brand-700 ml-auto hover:underline"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="flex gap-5">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:block w-48 shrink-0">
          <div className="bg-white border border-warm-200 rounded-lg p-3 shadow-xs sticky top-20">
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


        {/* Product List Content */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-warm-100 rounded-md animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {pagination.totalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => updateFilters({ page: page.toString() })}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="bg-white border border-warm-200 rounded-lg p-8 text-center my-4">
              <Package className="w-8 h-8 mx-auto text-warm-300 mb-2" />
              <h3 className="text-sm font-bold text-warm-900 mb-1">No products match your criteria</h3>
              <p className="text-[11px] text-warm-500 max-w-sm mx-auto mb-4">
                Try loosening your category or price range filters to view more items.
              </p>
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowFilters(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl p-4 overflow-y-auto z-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-warm-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-warm-900 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-brand-600" /> Filter Options
                </h3>
                <button onClick={() => setShowFilters(false)} className="p-1 text-warm-400 hover:text-warm-900 rounded-md">
                  <X className="w-4 h-4" />
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