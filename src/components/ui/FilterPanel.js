'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Star, Filter, RotateCcw } from 'lucide-react';
import NumericInput from '@/components/ui/NumericInput';

export default function FilterPanel({
  categories = [],
  currentCategory = '',
  minPrice = '',
  maxPrice = '',
  minRating = '',
  inStockOnly = false,
  setMinPrice,
  setMaxPrice,
  onCategoryChange,
  onPriceFilter,
  onRatingChange,
  onInStockChange,
  onClear,
  hasFilters = false,
}) {
  const [openSections, setOpenSections] = useState({
    categories: true,
    price: true,
    rating: false,
    availability: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-2 text-[11px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-warm-200">
        <h3 className="font-bold text-warm-900 flex items-center gap-2 text-[14px] uppercase tracking-wider">
          <Filter className="w-2 h-2 text-warm-900" /> Filters
        </h3>
        {hasFilters && (
          <button
            onClick={onClear}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline"
          >
            <RotateCcw className="w-2 h-2" /> Clear All
          </button>
        )}
      </div>

      {/* 1. Categories Section */}
      <div className="border-b border-warm-100 pb-3">
        <button
          onClick={() => toggleSection('categories')}
          className="flex items-center justify-between w-full text-left py-1 font-bold text-[11px] text-warm-900 uppercase tracking-wider"
        >
          <span>Categories</span>
          {openSections.categories ? (
            <ChevronUp className="w-2 h-2 text-warm-500" />
          ) : (
            <ChevronDown className="w-2 h-2 text-warm-500" />
          )}
        </button>

        {openSections.categories && (
          <div className="mt-2 space-y-1 max-h-56 overflow-y-auto pr-1">
            <button
              onClick={() => onCategoryChange && onCategoryChange('')}
              className={`block w-full text-left px-3 py-1.5 rounded-md text-[11px  ] transition-colors ${
                !currentCategory
                  ? 'bg-warm-900 text-white font-semibold shadow-2xs'
                  : 'text-warm-700 hover:bg-warm-100'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange && onCategoryChange(cat.slug)}
                className={`block w-full text-left px-3 py-1.5 rounded-md text-[11px] transition-colors ${
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

      {/* 2. Price Range Section */}
      <div className="border-b border-warm-100 pb-3">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left py-1 font-bold text-[11px] text-warm-900 uppercase tracking-wider"
        >
          <span>Price Range (₹)</span>
          {openSections.price ? (
            <ChevronUp className="w-2 h-2 text-warm-500" />
          ) : (
            <ChevronDown className="w-2 h-2 text-warm-500" />
          )}
        </button>

        {openSections.price && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <NumericInput
                value={minPrice}
                onChange={(e) => setMinPrice && setMinPrice(e.target.value)}
                placeholder="Min"
                className="w-full px-2 py-1 border border-warm-200 rounded-md text-[11px] text-warm-900 outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900"
              />
              <span className="text-warm-400 font-bold">–</span>
              <NumericInput
                value={maxPrice}
                onChange={(e) => setMaxPrice && setMaxPrice(e.target.value)}
                placeholder="Max"
                className="w-full px-2 py-1 border border-warm-200 rounded-md text-[11px] text-warm-900 outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900"
              />
            </div>
            <button
              onClick={onPriceFilter}
              className="w-full py-1.5 my-3 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors"
            >
              Apply Price Filter
            </button>
          </div>
        )}
      </div>

      {/* 3. Rating Filter */}
      {onRatingChange && (
        <div className="border-b border-warm-100 pb-3">
          <button
            onClick={() => toggleSection('rating')}
            className="flex items-center justify-between w-full text-left py-1 font-bold text-[11px] text-warm-900 uppercase tracking-wider"
          >
            <span>Customer Rating</span>
            {openSections.rating ? (
              <ChevronUp className="w-2 h-2 text-warm-500" />
            ) : (
              <ChevronDown className="w-2 h-2 text-warm-500" />
            )}
          </button>

          {openSections.rating && (
            <div className="mt-2 space-y-1.5">
              {[4, 3, 2].map((rating) => (
                <button
                  key={rating}
                  onClick={() => onRatingChange(minRating === rating.toString() ? '' : rating.toString())}
                  className={`flex items-center gap-1.5 w-full text-left px-2.5 py-1 rounded-md text-[11px] transition-colors ${
                    minRating === rating.toString() ? 'bg-warm-100 font-bold text-warm-900' : 'text-warm-700 hover:bg-warm-50'
                  }`}
                >
                  <div className="flex items-center text-amber-500">
                    <Star className="w-2 h-2 fill-current" />
                  </div>
                  <span>{rating}★ &amp; above</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Stock Availability */}
      {onInStockChange && (
        <div>
          <button
            onClick={() => toggleSection('availability')}
            className="flex items-center justify-between w-full text-left py-1 font-bold text-[11px] text-warm-900 uppercase tracking-wider"
          >
            <span>Availability</span>
            {openSections.availability ? (
              <ChevronUp className="w-2 h-2 text-warm-500" />
            ) : (
              <ChevronDown className="w-2 h-2 text-warm-500" />
            )}
          </button>

          {openSections.availability && (
            <div className="mt-2">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-warm-800">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => onInStockChange(e.target.checked)}
                  className="accent-warm-900 w-2 h-2 rounded"
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
