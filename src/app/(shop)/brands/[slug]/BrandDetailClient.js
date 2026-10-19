'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ui/ProductCard';
import Pagination from '@/components/ui/Pagination';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import CustomSelect from '@/components/ui/CustomSelect';
import FilterPanel from '@/components/ui/FilterPanel';
import CategoryCard from '@/components/ui/CategoryCard';
import EmptyState from '@/components/ui/EmptyState';
import { SlidersHorizontal, ArrowLeft, Layers } from 'lucide-react';
import useShopProducts from '@/hooks/useShopProducts';
import { brandsApi } from '@/lib/apiClient/brands.api';

const sortOptions = [
  { label: 'Newest Arrivals', value: 'newest' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Top Rated', value: 'top-rated' },
  { label: 'Best Sellers', value: 'best-sellers' },
];

function BrandDetailInner({
  initialBrand,
  initialCategories = [],
  initialSelectedCategory = null,
  initialBreadcrumbs = [],
  initialIsSingleCategory = false,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get('sort') || 'newest';
  const currentCategory = searchParams.get('category') || '';
  const currentView = searchParams.get('view') || '';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentMinRating = searchParams.get('minRating') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const [minPrice, setMinPrice] = useState(currentMinPrice);
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice);
  const [showFilters, setShowFilters] = useState(false);

  const [hierarchy, setHierarchy] = useState({
    categories: initialCategories,
    selectedCategory: initialSelectedCategory,
    breadcrumbs: initialBreadcrumbs,
    isSingleCategory: initialIsSingleCategory,
  });

  const isFirstRender = useRef(true);

  // Sync category hierarchy when ?category query param changes on the client
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let cancelled = false;
    async function loadHierarchy() {
      try {
        const res = await brandsApi.getBySlug(initialBrand.slug, {
          category: currentCategory || undefined,
        });
        if (!cancelled && res) {
          setHierarchy({
            categories: res.categories || [],
            selectedCategory: res.selectedCategory || null,
            breadcrumbs: res.breadcrumbs || [],
            isSingleCategory: res.isSingleCategory || false,
          });
        }
      } catch {
        if (!cancelled) {
          setHierarchy((prev) => ({
            ...prev,
            categories: [],
            selectedCategory: null,
          }));
        }
      }
    }

    loadHierarchy();
    return () => {
      cancelled = true;
    };
  }, [currentCategory, initialBrand.slug]);

  // Determine viewing mode:
  // 1. Invalid category: ?category= was provided but no selectedCategory found
  const isInvalidCategory = Boolean(currentCategory && !hierarchy.selectedCategory);

  // 2. Category level: valid selectedCategory is present
  const isCategoryLevel = Boolean(currentCategory && hierarchy.selectedCategory);

  // 3. Brand landing with cards: no category param, not single category, and view !== 'all'
  const isBrandLandingCards =
    !currentCategory && !hierarchy.isSingleCategory && currentView !== 'all';

  // Products filtered by brand and selected category
  const shouldFetchProducts = !isBrandLandingCards && !isInvalidCategory;
  const {
    products,
    pagination,
    isLoading: productsLoading,
  } = useShopProducts({
    page: currentPage,
    limit: 12,
    sort: currentSort,
    brand: initialBrand.name,
    category: currentCategory || undefined,
    minPrice: currentMinPrice,
    maxPrice: currentMaxPrice,
    minRating: currentMinRating,
    enabled: shouldFetchProducts,
  });

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
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const qs = nextParams.toString();
    router.push(`/brands/${initialBrand.slug}${qs ? `?${qs}` : ''}`);
  }

  function handlePriceFilter() {
    updateFilters({ minPrice: minPrice || null, maxPrice: maxPrice || null });
  }

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
    router.push(`/brands/${initialBrand.slug}${currentCategory ? `?category=${currentCategory}` : ''}`);
  }

  const hasFilters = Boolean(currentMinPrice || currentMaxPrice || currentMinRating);

  // Compute breadcrumbs
  const breadcrumbItems = hierarchy.breadcrumbs && hierarchy.breadcrumbs.length > 0
    ? hierarchy.breadcrumbs
    : [
        { label: 'Brands', href: '/brands' },
        { label: initialBrand.name },
      ];

  // Page title heading
  let pageHeading = `${initialBrand.name}`;
  let pageSubheading = `Explore authentic products from ${initialBrand.name}`;
  let itemCount = initialBrand.productCount;

  if (isCategoryLevel && hierarchy.selectedCategory) {
    pageHeading = `${initialBrand.name} - ${hierarchy.selectedCategory.name}`;
    itemCount = hierarchy.selectedCategory.productCount;
    pageSubheading = `Explore ${hierarchy.selectedCategory.name} from ${initialBrand.name}`;
  } else if (!isBrandLandingCards) {
    itemCount = pagination.total;
  }

  return (
    <div className="max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Live announcement region for accessibility */}
      <div aria-live="polite" className="sr-only">
        {isBrandLandingCards
          ? `${initialBrand.name} category selection: ${hierarchy.categories.length} categories available`
          : `Showing ${pagination.total || 0} products for ${pageHeading}`}
      </div>

      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-warm-200/80 pb-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-warm-900 tracking-tight">
            {pageHeading}
            <span className="text-xs sm:text-sm font-semibold text-warm-500 ml-1.5">
              ({itemCount} item{itemCount !== 1 ? 's' : ''})
            </span>
          </h1>
          <p className="text-[11px] text-warm-500 mt-0.5">
            {pageSubheading}
          </p>
        </div>

        {/* Toolbar & Sort (when product listing is active) */}
        {!isBrandLandingCards && !isInvalidCategory && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] font-semibold text-warm-700 bg-white hover:bg-warm-50 transition-colors focus:ring-2 focus:ring-warm-900/30"
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
        )}
      </div>

      {/* VIEW STATE 1: Invalid or unknown category */}
      {isInvalidCategory && (
        <EmptyState
          title="No items from this brand in this category"
          description={`We couldn't find any ${initialBrand.name} items in the requested category.`}
          actionLabel={`View all ${initialBrand.name}`}
          actionHref={`/brands/${initialBrand.slug}`}
        />
      )}

      {/* VIEW STATE 2: Brand landing category cards grid */}
      {isBrandLandingCards && (
        <section aria-labelledby="shop-by-category-heading" className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <h2
              id="shop-by-category-heading"
              className="text-xs sm:text-sm font-bold text-warm-900 tracking-tight flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-warm-700" />
              Shop {initialBrand.name} by category
            </h2>
            <Link
              href={`/brands/${initialBrand.slug}?view=all`}
              className="text-[11px] font-semibold text-warm-700 hover:text-warm-900 hover:underline transition-colors"
            >
              View all {initialBrand.productCount} item{initialBrand.productCount !== 1 ? 's' : ''}
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {hierarchy.categories.map((cat) => (
              <CategoryCard
                key={cat.id || cat.slug}
                name={cat.name}
                slug={cat.slug}
                href={`/brands/${initialBrand.slug}?category=${cat.slug}`}
                imageUrl={cat.imageUrl}
                productCount={cat.productCount}
              />
            ))}
          </div>
        </section>
      )}

      {/* VIEW STATE 3: Product Grid (Category Level, Single Category, or View All) */}
      {!isBrandLandingCards && !isInvalidCategory && (
        <div className="space-y-4">
          {/* Back link when viewing all items of a multi-category brand */}
          {currentView === 'all' && !currentCategory && (
            <div className="flex items-center justify-between bg-warm-50 border border-warm-200/80 rounded-lg px-3 py-2">
              <span className="text-[11px] text-warm-600 font-medium">
                Viewing all items from {initialBrand.name}
              </span>
              <Link
                href={`/brands/${initialBrand.slug}`}
                className="text-[11px] font-semibold text-warm-900 hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" /> Browse by category
              </Link>
            </div>
          )}

          {/* Child category cards if this category has children containing products */}
          {isCategoryLevel && hierarchy.categories.length > 0 && (
            <section aria-labelledby="subcategories-heading" className="space-y-2.5 bg-warm-50/50 p-3 rounded-xl border border-warm-200/60">
              <h2
                id="subcategories-heading"
                className="text-[11px] font-bold uppercase tracking-wider text-warm-700 flex items-center gap-1"
              >
                <Layers className="w-3 h-3 text-warm-900" />
                Subcategories
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {hierarchy.categories.map((childCat) => (
                  <CategoryCard
                    key={childCat.id || childCat.slug}
                    name={childCat.name}
                    slug={childCat.slug}
                    href={`/brands/${initialBrand.slug}?category=${childCat.slug}`}
                    imageUrl={childCat.imageUrl}
                    productCount={childCat.productCount}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Product Grid and Filters */}
          <div className="flex gap-5 items-start">
            {/* Desktop Filter Sidebar */}
            <aside className="hidden lg:block w-48 shrink-0">
              <div className="bg-white border border-warm-200 rounded-lg p-2.5 shadow-2xs sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto scrollbar-thin">
                <FilterPanel
                  categories={[]}
                  brands={[]}
                  hideBrandSection={true}
                  hideCategorySection={true}
                  currentCategory={currentCategory}
                  currentBrand=""
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  minRating={currentMinRating}
                  setMinPrice={setMinPrice}
                  setMaxPrice={setMaxPrice}
                  onCategoryChange={() => {}}
                  onBrandChange={() => {}}
                  onPriceFilter={handlePriceFilter}
                  onRatingChange={(rVal) => updateFilters({ minRating: rVal || null })}
                  onClear={clearFilters}
                  hasFilters={hasFilters}
                />
              </div>
            </aside>

            {/* Products Listing Area */}
            <div className="flex-1 min-w-0">
              {productsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
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
                <EmptyState
                  title="No items found matching criteria"
                  description="Try adjusting your sort, price or rating filters to see more products."
                  actionLabel="Clear Filters"
                  onAction={clearFilters}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Filter */}
      {showFilters && !isBrandLandingCards && !isInvalidCategory && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowFilters(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl p-4 overflow-y-auto z-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-warm-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-warm-900 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-brand-600" /> Filters
                </h3>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="p-1 text-warm-400 hover:text-warm-900 rounded-md"
                >
                  <span className="sr-only">Close filters</span>
                  ✕
                </button>
              </div>
              <FilterPanel
                categories={[]}
                brands={[]}
                hideBrandSection={true}
                hideCategorySection={true}
                currentCategory={currentCategory}
                currentBrand=""
                minPrice={minPrice}
                maxPrice={maxPrice}
                minRating={currentMinRating}
                setMinPrice={setMinPrice}
                setMaxPrice={setMaxPrice}
                onCategoryChange={() => {}}
                onBrandChange={() => {}}
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

export default function BrandDetailClient({
  initialBrand,
  initialCategories = [],
  initialSelectedCategory = null,
  initialBreadcrumbs = [],
  initialIsSingleCategory = false,
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
          <div className="h-3 w-32 bg-warm-100 rounded-md animate-pulse" />
          <div className="h-6 w-52 bg-warm-100 rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-md bg-warm-100 animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <BrandDetailInner
        initialBrand={initialBrand}
        initialCategories={initialCategories}
        initialSelectedCategory={initialSelectedCategory}
        initialBreadcrumbs={initialBreadcrumbs}
        initialIsSingleCategory={initialIsSingleCategory}
      />
    </Suspense>
  );
}
