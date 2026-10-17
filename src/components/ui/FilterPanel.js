'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Star, Filter, RotateCcw } from 'lucide-react';
import NumericInput from '@/components/ui/NumericInput';

export default function FilterPanel({
  categories = [],
  brands = [],
  currentCategory = '',
  currentBrand = '',
  minPrice = '',
  maxPrice = '',
  minRating = '',
  inStockOnly = false,
  setMinPrice,
  setMaxPrice,
  onCategoryChange,
  onBrandChange,
  onPriceFilter,
  onRatingChange,
  onInStockChange,
  onClear,
  hasFilters = false,
  hideBrandSection = false,
  hideCategorySection = false,
}) {
  const [openSections, setOpenSections] = useState({
    categories: true,
    brands: true,
    price: true,
    rating: false,
    availability: false,
  });

  const [catSearch, setCatSearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(false);

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const filteredCategories = catSearch.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(catSearch.toLowerCase()))
    : categories;

  return (
    <div className="space-y-2 text-[11px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-warm-200">
        <h3 className="font-bold text-warm-900 flex items-center gap-1.5 text-[12px] uppercase tracking-wider">
          <Filter className="w-3 h-3 text-warm-900" /> Filters
        </h3>
        {hasFilters && (
          <button
            onClick={onClear}
            className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 hover:underline"
          >
            <RotateCcw className="w-2.5 h-2.5" /> Clear All
          </button>
        )}
      </div>

      {/* 1. Categories Section */}
      {!hideCategorySection && (
        <div className="border-b border-warm-100 pb-2.5">
          <button
            onClick={() => toggleSection('categories')}
            className="flex items-center justify-between w-full text-left py-1 font-bold text-[11px] text-warm-900 uppercase tracking-wider"
          >
            <span>Categories</span>
            {openSections.categories ? (
              <ChevronUp className="w-2.5 h-2.5 text-warm-500" />
            ) : (
              <ChevronDown className="w-2.5 h-2.5 text-warm-500" />
            )}
          </button>

          {openSections.categories && (
            <div className="mt-1.5 space-y-1 max-h-48 overflow-y-auto pr-1">
              {categories.length > 15 && (
                <input
                  type="text"
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full px-2 py-0.5 mb-1 border border-warm-200 rounded text-[10px] text-warm-900 placeholder:text-warm-400 outline-none focus:ring-1 focus:ring-warm-900/20 focus:border-warm-900"
                />
              )}
              <button
                onClick={() => onCategoryChange && onCategoryChange('')}
                className={`block w-full text-left px-2 py-1 rounded text-[10px] transition-colors ${
                  !currentCategory
                    ? 'bg-warm-900 text-white font-semibold shadow-2xs'
                    : 'text-warm-700 hover:bg-warm-100'
                }`}
              >
                All Categories
              </button>
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onCategoryChange && onCategoryChange(cat.slug)}
                  className={`block w-full text-left px-2 py-1 rounded text-[10px] transition-colors ${
                    currentCategory === cat.slug
                      ? 'bg-warm-900 text-white font-semibold shadow-2xs'
                      : 'text-warm-700 hover:bg-warm-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Brands Section */}
      {!hideBrandSection && brands.length > 0 && (() => {
        const selectedBrandList = currentBrand
          ? currentBrand.split(',').map((b) => b.trim()).filter(Boolean)
          : [];

        // Filter by brand search input if user typed anything
        const searchFiltered = brandSearch.trim()
          ? brands.filter((b) => {
              const name = typeof b === 'string' ? b : (b.name || b.slug);
              return name.toLowerCase().includes(brandSearch.toLowerCase());
            })
          : brands;

        // Separate selected brands to pin them to the top
        const selectedItems = [];
        const unselectedItems = [];

        searchFiltered.forEach((b) => {
          const brandSlug = typeof b === 'string' ? b : (b.slug || b.name);
          if (selectedBrandList.includes(brandSlug)) {
            selectedItems.push(b);
          } else {
            unselectedItems.push(b);
          }
        });

        const orderedBrands = [...selectedItems, ...unselectedItems];
        const visibleBrands = showAllBrands || brandSearch.trim()
          ? orderedBrands
          : orderedBrands.slice(0, 8);
        const hasMore = orderedBrands.length > 8 && !brandSearch.trim();

        return (
          <div className="border-b border-warm-100 pb-2.5">
            <button
              onClick={() => toggleSection('brands')}
              className="flex items-center justify-between w-full text-left py-1 font-bold text-[11px] text-warm-900 uppercase tracking-wider"
            >
              <span>Brand</span>
              {openSections.brands ? (
                <ChevronUp className="w-2.5 h-2.5 text-warm-500" />
              ) : (
                <ChevronDown className="w-2.5 h-2.5 text-warm-500" />
              )}
            </button>

            {openSections.brands && (
              <div className="mt-1.5 space-y-1.5">
                {/* Small Brand Search Box */}
                <input
                  type="text"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="Search brands..."
                  className="w-full px-2 py-0.5 border border-warm-200 rounded text-[10px] text-warm-900 placeholder:text-warm-400 outline-none focus:ring-1 focus:ring-warm-900/20 focus:border-warm-900"
                />

                {/* Brand checkboxes list */}
                <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                  {visibleBrands.map((b) => {
                    const brandSlug = typeof b === 'string' ? b : (b.slug || b.name);
                    const brandName = typeof b === 'string' ? b : (b.name || b.slug);
                    const isChecked = selectedBrandList.includes(brandSlug);
                    return (
                      <label
                        key={brandSlug}
                        className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] text-warm-700 hover:bg-warm-50 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            let updatedList;
                            if (isChecked) {
                              updatedList = selectedBrandList.filter((item) => item !== brandSlug);
                            } else {
                              updatedList = [...selectedBrandList, brandSlug];
                            }
                            onBrandChange && onBrandChange(updatedList.join(','));
                          }}
                          className="accent-warm-900 w-3 h-3 rounded shrink-0"
                        />
                        <span className={`truncate ${isChecked ? 'font-bold text-warm-900' : ''}`}>
                          {brandName}
                        </span>
                      </label>
                    );
                  })}

                  {visibleBrands.length === 0 && (
                    <p className="text-[10px] text-warm-400 py-1 text-center">No brands found</p>
                  )}
                </div>

                {/* Show more / Show less toggle */}
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setShowAllBrands(!showAllBrands)}
                    className="text-[10px] font-semibold text-brand-700 hover:text-brand-800 hover:underline pt-0.5 block"
                  >
                    {showAllBrands ? 'Show less' : `Show more (+${orderedBrands.length - 8})`}
                  </button>
                )}

                {/* Link to all brands */}
                <div className="pt-1.5 border-t border-warm-100">
                  <Link
                    href="/brands"
                    className="text-[10px] font-bold text-warm-900 hover:underline flex items-center justify-between"
                  >
                    <span>All brands</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 3. Price Range Section */}
      <div className="border-b border-warm-100 pb-2.5">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left py-1 font-bold text-[11px] text-warm-900 uppercase tracking-wider"
        >
          <span>Price Range</span>
          {openSections.price ? (
            <ChevronUp className="w-2.5 h-2.5 text-warm-500" />
          ) : (
            <ChevronDown className="w-2.5 h-2.5 text-warm-500" />
          )}
        </button>

        {openSections.price && (
          <div className="mt-1.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center w-full">
                <span className="absolute left-2 text-warm-500 font-medium text-[10px] pointer-events-none select-none">₹</span>
                <NumericInput
                  value={minPrice}
                  onChange={(val) => setMinPrice && setMinPrice(val)}
                  placeholder="Min"
                  className="w-full pl-5 pr-1.5 py-0.5 border border-warm-200 rounded text-[10px] text-warm-900 outline-none focus:ring-1 focus:ring-warm-900/10 focus:border-warm-900"
                />
              </div>
              <span className="text-warm-400 font-bold">–</span>
              <div className="relative flex items-center w-full">
                <span className="absolute left-2 text-warm-500 font-medium text-[10px] pointer-events-none select-none">₹</span>
                <NumericInput
                  value={maxPrice}
                  onChange={(val) => setMaxPrice && setMaxPrice(val)}
                  placeholder="Max"
                  className="w-full pl-5 pr-1.5 py-0.5 border border-warm-200 rounded text-[10px] text-warm-900 outline-none focus:ring-1 focus:ring-warm-900/10 focus:border-warm-900"
                />
              </div>
            </div>
            <button
              onClick={onPriceFilter}
              className="w-full py-1 bg-warm-900 text-white text-[10px] font-semibold rounded hover:bg-warm-800 transition-colors"
            >
              Apply Price Filter
            </button>
          </div>
        )}
      </div>

      {/* 4. Rating Filter */}
      {onRatingChange && (
        <div className="border-b border-warm-100 pb-2.5">
          <button
            onClick={() => toggleSection('rating')}
            className="flex items-center justify-between w-full text-left py-1 font-bold text-[11px] text-warm-900 uppercase tracking-wider"
          >
            <span>Customer Rating</span>
            {openSections.rating ? (
              <ChevronUp className="w-2.5 h-2.5 text-warm-500" />
            ) : (
              <ChevronDown className="w-2.5 h-2.5 text-warm-500" />
            )}
          </button>

          {openSections.rating && (
            <div className="mt-1.5 space-y-0.5">
              {[4, 3, 2].map((rating) => (
                <button
                  key={rating}
                  onClick={() => onRatingChange(minRating === rating.toString() ? '' : rating.toString())}
                  className={`flex items-center gap-1.5 w-full text-left px-2 py-0.5 rounded text-[10px] transition-colors ${
                    minRating === rating.toString() ? 'bg-warm-100 font-bold text-warm-900' : 'text-warm-700 hover:bg-warm-50'
                  }`}
                >
                  <div className="flex items-center text-amber-500">
                    <Star className="w-2.5 h-2.5 fill-current" />
                  </div>
                  <span>{rating}★ &amp; above</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Stock Availability */}
      {onInStockChange && (
        <div>
          <button
            onClick={() => toggleSection('availability')}
            className="flex items-center justify-between w-full text-left py-1 font-bold text-[11px] text-warm-900 uppercase tracking-wider"
          >
            <span>Availability</span>
            {openSections.availability ? (
              <ChevronUp className="w-2.5 h-2.5 text-warm-500" />
            ) : (
              <ChevronDown className="w-2.5 h-2.5 text-warm-500" />
            )}
          </button>

          {openSections.availability && (
            <div className="mt-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-warm-800">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => onInStockChange(e.target.checked)}
                  className="accent-warm-900 w-3 h-3 rounded"
                />
                <span>Include In-Stock Only</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
