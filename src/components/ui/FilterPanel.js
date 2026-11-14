'use client';

import { useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal, Star, RotateCcw } from 'lucide-react';
import { validatePriceRange } from '@/lib/catalog-filters';

export default function FilterPanel(props) {
  const key = [props.currentCategory, props.currentBrand, props.minPrice, props.maxPrice, props.minRating].join('|');
  return <FilterContents key={key} {...props} />;
}

function FilterContents({ categories = [], brands = [], currentCategory = '', currentBrand = '', minPrice = '', maxPrice = '', minRating = '', onApplyFilters, onApplied, onClear, hasFilters = false, hideBrandSection = false, hideCategorySection = false, onRatingChange, onCategoryChange, onBrandChange, onPriceFilter, setMinPrice, setMaxPrice }) {
  const [draft, setDraft] = useState({ category: currentCategory, brand: currentBrand, minPrice, maxPrice, minRating });
  const [categorySearch, setCategorySearch] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [error, setError] = useState('');
  const selectedBrands = draft.brand.split(',').filter(Boolean);
  const selectedCount = Number(Boolean(!hideCategorySection && draft.category)) + selectedBrands.length + Number(Boolean(draft.minPrice || draft.maxPrice)) + Number(Boolean(draft.minRating));
  const update = (key, value) => { setDraft((previous) => ({ ...previous, [key]: value })); setError(''); };
  const apply = (event) => {
    event.preventDefault();
    const priceError = validatePriceRange(draft.minPrice, draft.maxPrice);
    if (priceError) { setError(priceError); return; }
    if (onApplyFilters) {
      const changes = { minPrice: draft.minPrice, maxPrice: draft.maxPrice };
      if (!hideCategorySection) changes.category = draft.category;
      if (!hideBrandSection) changes.brand = draft.brand;
      if (onRatingChange) changes.minRating = draft.minRating;
      onApplyFilters(changes);
    } else {
      onCategoryChange?.(draft.category); onBrandChange?.(draft.brand);
      setMinPrice?.(draft.minPrice); setMaxPrice?.(draft.maxPrice); onPriceFilter?.();
    }
    onApplied?.();
  };

  return (
    <form onSubmit={apply} className="space-y-5 text-sm">
      <div className="flex items-center justify-between border-b border-warm-100 pb-4">
        <div className="flex items-center gap-2 font-semibold text-warm-900"><SlidersHorizontal className="h-4 w-4" /> Refine your search {selectedCount > 0 && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{selectedCount}</span>}</div>
        {(hasFilters || selectedCount > 0) && <button type="button" onClick={() => { setDraft({ category: '', brand: '', minPrice: '', maxPrice: '', minRating: '' }); setError(''); onClear?.(); onApplied?.(); }} className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-warm-500 hover:text-brand-700"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>}
      </div>
      {!hideCategorySection && categories.length > 0 && <FilterSection title="Category">
        {categories.length > 8 && <SearchField label="Search categories" value={categorySearch} onChange={setCategorySearch} />}
        <div className="max-h-56 space-y-1 overflow-y-auto overscroll-contain">
          {[{ id: 'all', slug: '', name: 'All categories' }, ...categories.filter((category) => category.name.toLowerCase().includes(categorySearch.toLowerCase()))].map((category) => <label key={category.id || category.slug} className={'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors ' + (draft.category === category.slug ? 'bg-warm-100 font-medium text-warm-900' : 'text-warm-600 hover:bg-warm-50')}><input type="radio" name="filter-category" checked={draft.category === category.slug} onChange={() => update('category', category.slug)} className="h-4 w-4 shrink-0 accent-warm-900" /><span>{category.name}</span></label>)}
        </div>
      </FilterSection>}
      {!hideBrandSection && brands.length > 0 && <FilterSection title="Brand">
        {brands.length > 6 && <SearchField label="Search brands" value={brandSearch} onChange={setBrandSearch} />}
        <div className="max-h-60 space-y-1 overflow-y-auto overscroll-contain">
          {brands.filter((brand) => (typeof brand === 'string' ? brand : brand.name).toLowerCase().includes(brandSearch.toLowerCase())).map((brand) => { const slug = typeof brand === 'string' ? brand : brand.slug || brand.name; const name = typeof brand === 'string' ? brand : brand.name; const checked = selectedBrands.includes(slug); return <label key={slug} className={'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors ' + (checked ? 'bg-brand-50 font-medium text-warm-900' : 'text-warm-600 hover:bg-warm-50')}><input type="checkbox" checked={checked} onChange={() => update('brand', (checked ? selectedBrands.filter((item) => item !== slug) : [...selectedBrands, slug]).join(','))} className="h-4 w-4 shrink-0 rounded accent-warm-900" /><span>{name}</span></label>; })}
          {brands.every((brand) => !(typeof brand === 'string' ? brand : brand.name).toLowerCase().includes(brandSearch.toLowerCase())) && <p className="py-4 text-center text-xs text-warm-500">No matching brands</p>}
        </div>
      </FilterSection>}
      <FilterSection title="Price range">
        <div className="grid grid-cols-2 gap-3">
          {[['minPrice', 'Minimum'], ['maxPrice', 'Maximum']].map(([key, label]) => <label key={key} className="block text-xs font-medium text-warm-500">{label}<div className="relative mt-1.5"><span className="pointer-events-none absolute left-3 top-3 text-sm text-warm-400">₹</span><input type="number" inputMode="decimal" min="0" step="0.01" aria-label={label + ' price'} aria-invalid={Boolean(error)} value={draft[key]} onChange={(event) => update(key, event.target.value)} placeholder={key === 'minPrice' ? '0' : 'Any'} className="min-h-11 w-full rounded-xl border border-warm-200 bg-white py-2.5 pl-7 pr-2 text-sm text-warm-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" /></div></label>)}
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
      </FilterSection>
      {onRatingChange && <FilterSection title="Customer rating"><div className="flex flex-wrap gap-2">{['', '4', '3', '2'].map((rating) => <button key={rating} type="button" aria-pressed={draft.minRating === rating} onClick={() => update('minRating', rating)} className={'flex min-h-10 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ' + (draft.minRating === rating ? 'border-warm-900 bg-warm-900 text-white' : 'border-warm-200 bg-white text-warm-600 hover:bg-warm-50')}>{rating ? <><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{rating} & up</> : 'Any'}</button>)}</div></FilterSection>}
      <div className="sticky bottom-0 border-t border-warm-100 bg-white pt-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-warm-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-warm-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"><SlidersHorizontal className="h-4 w-4" /> Apply filters {selectedCount > 0 ? '(' + selectedCount + ')' : ''}</button>
        <p className="mt-2 text-center text-[11px] text-warm-400">Choose your preferences, then apply.</p>
      </div>
    </form>
  );
}

function FilterSection({ title, children }) {
  const [open, setOpen] = useState(true);
  return <section className="border-b border-warm-100 pb-5"><button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="mb-3 flex min-h-10 w-full items-center justify-between text-sm font-semibold text-warm-900">{title}<ChevronDown className={'h-4 w-4 text-warm-400 transition-transform ' + (open ? 'rotate-180' : '')} /></button>{open && children}</section>;
}

function SearchField({ label, value, onChange }) {
  return <div className="relative mb-3"><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-warm-400" /><input type="search" aria-label={label} placeholder={label} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-10 w-full rounded-lg border border-warm-200 bg-warm-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500" /></div>;
}
