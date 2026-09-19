'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ui/ProductCard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import FilterPanel from '@/components/ui/FilterPanel';
import { Frown, Package, FolderTree, SlidersHorizontal, X } from 'lucide-react';

export default function CategoryDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [category, setCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [apiBreadcrumbs, setApiBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchCategoryData();
  }, [slug]);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {}
  }

  async function fetchCategoryData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/categories/${slug}`);
      const data = await res.json();
      if (res.ok) {
        setCategory(data.category);
        setSubcategories(data.subcategories || []);
        setProducts(data.products || []);
        setApiBreadcrumbs(data.breadcrumbs || []);
      }
    } catch {}
    setLoading(false);
  }

  const filteredProducts = products.filter((p) => {
    if (minPrice && Number(p.price) < Number(minPrice)) return false;
    if (maxPrice && Number(p.price) > Number(maxPrice)) return false;
    if (minRating && Number(p.ratingAvg || 0) < Number(minRating)) return false;
    if (inStockOnly && p.stock <= 0) return false;
    return true;
  });

  const hasFilters = Boolean(minPrice || maxPrice || minRating || inStockOnly);

  function clearFilters() {
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setInStockOnly(false);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <div className="h-3 w-32 bg-warm-100 rounded-md animate-pulse" />
        <div className="h-6 w-52 bg-warm-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-md bg-warm-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Category Header */}
      <div className="flex items-end justify-between border-b border-warm-200/80 pb-3">
        <div>
          <h1 className="text-base mt-2 font-bold text-warm-900 tracking-tight">
            {category.name}
          </h1>
          <p className="text-[11px] text-warm-500 mt-0.5">
            Explore items in {category.name} ({filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''})
          </p>
        </div>

        <button
          onClick={() => setShowFilters(true)}
          className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] font-semibold text-warm-700 bg-white hover:bg-warm-50 transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-warm-600" />
          <span>Filters</span>
          {hasFilters && <span className="w-1.5 h-1.5 bg-warm-900 rounded-full" />}
        </button>
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
          {(minPrice || maxPrice) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-warm-200 rounded-md text-[10px] font-semibold text-warm-800">
              Price: ${minPrice || '0'} – ${maxPrice || '∞'}
              <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="text-warm-400 hover:text-warm-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {minRating && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-warm-200 rounded-md text-[10px] font-semibold text-warm-800">
              Rating: {minRating}★ &amp; above
              <button onClick={() => setMinRating('')} className="text-warm-400 hover:text-warm-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {inStockOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-warm-200 rounded-md text-[10px] font-semibold text-warm-800">
              In Stock Only
              <button onClick={() => setInStockOnly(false)} className="text-warm-400 hover:text-warm-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button onClick={clearFilters} className="text-[10px] font-bold text-warm-900 hover:underline ml-auto">
            Clear All
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex gap-5">
        <aside className="hidden lg:block w-48 shrink-0">
          <div className="bg-white border border-warm-200 rounded-lg p-3 shadow-xs sticky top-20">
            <FilterPanel
              categories={categories}
              currentCategory={category.slug}
              minPrice={minPrice}
              maxPrice={maxPrice}
              minRating={minRating}
              inStockOnly={inStockOnly}
              setMinPrice={setMinPrice}
              setMaxPrice={setMaxPrice}
              onCategoryChange={(catSlug) => router.push(catSlug ? `/categories/${catSlug}` : '/products')}
              onPriceFilter={() => {}}
              onRatingChange={setMinRating}
              onInStockChange={setInStockOnly}
              onClear={clearFilters}
              hasFilters={hasFilters}
            />
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
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
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl p-4 overflow-y-auto z-10">
            <div className="flex items-center justify-between border-b border-warm-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-warm-900">Filters</h3>
              <button onClick={() => setShowFilters(false)} className="p-1 text-warm-400 hover:text-warm-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <FilterPanel
              categories={categories}
              currentCategory={category.slug}
              minPrice={minPrice}
              maxPrice={maxPrice}
              minRating={minRating}
              inStockOnly={inStockOnly}
              setMinPrice={setMinPrice}
              setMaxPrice={setMaxPrice}
              onCategoryChange={(catSlug) => {
                router.push(catSlug ? `/categories/${catSlug}` : '/products');
                setShowFilters(false);
              }}
              onPriceFilter={() => setShowFilters(false)}
              onRatingChange={(r) => { setMinRating(r); setShowFilters(false); }}
              onInStockChange={(st) => { setInStockOnly(st); setShowFilters(false); }}
              onClear={() => { clearFilters(); setShowFilters(false); }}
              hasFilters={hasFilters}
            />
          </div>
        </div>
      )}
    </div>
  );
}