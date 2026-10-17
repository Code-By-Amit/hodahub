'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ui/ProductCard';
import Pagination from '@/components/ui/Pagination';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import CustomSelect from '@/components/ui/CustomSelect';
import FilterPanel from '@/components/ui/FilterPanel';
import { Frown, Package, FolderTree, SlidersHorizontal, X, Filter } from 'lucide-react';
import useShopProducts from '@/hooks/useShopProducts';
import { categoriesApi } from '@/lib/apiClient/categories.api';
import { brandsApi } from '@/lib/apiClient/brands.api';

const sortOptions = [
  { label: 'Newest Arrivals', value: 'newest' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Top Rated', value: 'top-rated' },
  { label: 'Best Sellers', value: 'best-sellers' },
];

function CategoryDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawSlug = params?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : (rawSlug || '');

  const currentSort = searchParams.get('sort') || 'newest';
  const currentBrand = searchParams.get('brand') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentMinRating = searchParams.get('minRating') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);
  const [showFilters, setShowFilters] = useState(false);

  // Paginated and filtered products via React Query hook
  const {
    products,
    pagination,
    isLoading: productsLoading,
  } = useShopProducts({
    page: currentPage,
    limit: 12,
    sort: currentSort,
    category: slug,
    brand: currentBrand,
    minPrice: currentMinPrice,
    maxPrice: currentMaxPrice,
    minRating: currentMinRating,
  });

  // Category metadata, subcategories and breadcrumbs
  const [category, setCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [apiBreadcrumbs, setApiBreadcrumbs] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(true);

  useEffect(() => {
    async function fetchAllCategories() {
      try {
        const data = await categoriesApi.getAll();
        setCategories(data?.categories || []);
      } catch {}
    }
    fetchAllCategories();
  }, []);

  useEffect(() => {
    if (!slug) return;

    async function fetchCategoryDetails() {
      setCategoryLoading(true);
      try {
        const data = await categoriesApi.getBySlug(slug);
        if (data?.category) {
          setCategory(data.category);
          setSubcategories(data.subcategories || []);
          setApiBreadcrumbs(data.breadcrumbs || []);
        } else {
          setCategory(null);
        }
      } catch {
        setCategory(null);
      } finally {
        setCategoryLoading(false);
      }
    }

    async function fetchCategoryBrands() {
      try {
        const data = await brandsApi.getAll({ category: slug });
        setBrands(data?.brands || []);
      } catch {}
    }

    fetchCategoryDetails();
    fetchCategoryBrands();
  }, [slug]);

  function updateFilters(updates) {
    const nextParams = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }
    });

    if (!('page' in updates)) {
      nextParams.set('page', '1');
    }

    const qs = nextParams.toString();
    router.push(`/categories/${slug}${qs ? `?${qs}` : ''}`);
  }

  function handlePriceFilter() {
    updateFilters({ minPrice: minPrice || null, maxPrice: maxPrice || null });
  }

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
    router.push(`/categories/${slug}`);
  }

  const selectedBrandList = currentBrand
    ? currentBrand.split(',').map((b) => b.trim()).filter(Boolean)
    : [];

  const hasFilters = Boolean(currentBrand || currentMinPrice || currentMaxPrice || currentMinRating);

  if (categoryLoading) {
    return (
      <div className="max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <div className="h-3 w-32 bg-warm-100 rounded-md animate-pulse" />
        <div className="h-6 w-52 bg-warm-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-md bg-warm-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-4xl xl:max-w-6xl mx-auto px-4 py-12 text-center">
        <Frown className="w-8 h-8 mx-auto text-warm-300 mb-2" />
        <h2 className="text-base font-bold text-warm-900 mb-1.5">Category Not Found</h2>
        <p className="text-[11px] text-warm-500 mb-4">The category you are looking for may have been removed or renamed.</p>
        <Link
          href="/categories"
          className="px-4 py-2 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors"
        >
          Browse All Categories
        </Link>
      </div>
    );
  }

  const breadcrumbItems = [
    { label: 'Categories', href: '/categories' },
    ...apiBreadcrumbs.map((crumb, idx) =>
      idx === apiBreadcrumbs.length - 1
        ? { label: crumb.name }
        : { label: crumb.name, href: `/categories/${crumb.slug}` }
    ),
  ];

  return (
    <div className="max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Category Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-warm-200/80 pb-3">
        <div>
          <h1 className="text-base mt-2 font-bold text-warm-900 tracking-tight">
            {category.name}
          </h1>
          <p className="text-[11px] text-warm-500 mt-0.5">
            Explore items in {category.name} ({pagination.total} item{pagination.total !== 1 ? 's' : ''})
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
            {hasFilters && <span className="w-1.5 h-1.5 bg-warm-900 rounded-full" />}
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

      {/* Subcategories */}
      {subcategories.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-warm-700 flex items-center gap-1">
            <FolderTree className="w-3 h-3 text-warm-900" />
            Subcategories
          </h2>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1.5">
            {subcategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/categories/${sub.slug}`}
                className="shrink-0 px-3 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] font-semibold text-warm-800 hover:border-warm-900 hover:text-warm-900 transition-colors shadow-2xs"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasFilters && (
        <div className="flex items-center gap-1.5 flex-wrap bg-warm-50 p-2 rounded-lg border border-warm-200/60">
          <span className="text-[10px] font-bold text-warm-700 uppercase tracking-wider mr-0.5">Active Filters:</span>
          {selectedBrandList.map((bSlug) => {
            const brandObj = brands.find((b) => (b.slug || b.name) === bSlug);
            const displayName = brandObj?.name || bSlug;
            return (
              <span
                key={bSlug}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-warm-200 rounded-md text-[10px] font-semibold text-warm-800 shadow-2xs"
              >
                Brand: {displayName}
                <button
                  onClick={() => {
                    const nextList = selectedBrandList.filter((b) => b !== bSlug);
                    updateFilters({ brand: nextList.join(',') || null });
                  }}
                  className="text-warm-400 hover:text-warm-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          {(currentMinPrice || currentMaxPrice) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-warm-200 rounded-md text-[10px] font-semibold text-warm-800 shadow-2xs">
              Price: ₹{currentMinPrice || '0'} – ₹{currentMaxPrice || '∞'}
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
          {currentMinRating && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-warm-200 rounded-md text-[10px] font-semibold text-warm-800 shadow-2xs">
              Rating: {currentMinRating}★ &amp; above
              <button
                onClick={() => updateFilters({ minRating: null })}
                className="text-warm-400 hover:text-warm-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={clearFilters}
            className="text-[10px] font-bold text-warm-900 hover:underline ml-auto"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex gap-5 items-start">
        {/* Sticky Desktop Filter Sidebar */}
        <aside className="hidden lg:block w-48 shrink-0">
          <div className="bg-white border border-warm-200 rounded-lg p-2.5 shadow-2xs sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto scrollbar-thin">
            <FilterPanel
              categories={categories}
              brands={brands}
              currentCategory={category.slug}
              currentBrand={currentBrand}
              minPrice={minPrice}
              maxPrice={maxPrice}
              minRating={currentMinRating}
              setMinPrice={setMinPrice}
              setMaxPrice={setMaxPrice}
              onCategoryChange={(catSlug) => router.push(catSlug ? `/categories/${catSlug}` : '/products')}
              onBrandChange={(bVal) => updateFilters({ brand: bVal || null })}
              onPriceFilter={handlePriceFilter}
              onRatingChange={(rVal) => updateFilters({ minRating: rVal || null })}
              onClear={clearFilters}
              hasFilters={hasFilters}
            />
          </div>
        </aside>

        {/* Product List Content */}
        <div className="flex-1 min-w-0">
          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-warm-100 rounded-md animate-pulse" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
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
              <h3 className="text-[14px] font-bold text-warm-900 mb-1">No products match filters</h3>
              <p className="text-[11px] text-warm-500 max-w-sm mx-auto mb-4">
                Try loosening your filter options or clear them to view all items.
              </p>
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowFilters(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl p-4 overflow-y-auto z-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-warm-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-warm-900 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-brand-600" /> Filters
                </h3>
                <button onClick={() => setShowFilters(false)} className="p-1 text-warm-400 hover:text-warm-900 rounded-md">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <FilterPanel
                categories={categories}
                brands={brands}
                currentCategory={category.slug}
                currentBrand={currentBrand}
                minPrice={minPrice}
                maxPrice={maxPrice}
                minRating={currentMinRating}
                setMinPrice={setMinPrice}
                setMaxPrice={setMaxPrice}
                onCategoryChange={(catSlug) => {
                  router.push(catSlug ? `/categories/${catSlug}` : '/products');
                  setShowFilters(false);
                }}
                onBrandChange={(bVal) => {
                  updateFilters({ brand: bVal || null });
                  setShowFilters(false);
                }}
                onPriceFilter={() => {
                  handlePriceFilter();
                  setShowFilters(false);
                }}
                onRatingChange={(rVal) => {
                  updateFilters({ minRating: rVal || null });
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

export default function CategoryDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
          <div className="h-3 w-32 bg-warm-100 rounded-md animate-pulse" />
          <div className="h-6 w-52 bg-warm-100 rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-md bg-warm-100 animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <CategoryDetailContent />
    </Suspense>
  );
}