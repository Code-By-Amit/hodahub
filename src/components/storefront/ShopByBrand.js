'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

function BrandCarousel({ brands, perPage, mobile }) {
  const scrollRef = useRef(null);
  const [activePage, setActivePage] = useState(0);
  const pages = Array.from({ length: Math.ceil(brands.length / perPage) }, (_, index) => brands.slice(index * perPage, (index + 1) * perPage));
  function goTo(page) {
    const element = scrollRef.current;
    if (!element) return;
    const target = element.children[Math.max(0, Math.min(pages.length - 1, page))];
    if (target) element.scrollTo({ left: target.offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  return <div className={mobile ? 'lg:hidden' : 'hidden lg:block'}>
    <div ref={scrollRef} role="region" aria-label={mobile ? 'Brand collections mobile' : 'Brand collections desktop'} aria-roledescription="carousel" tabIndex={0}
      onKeyDown={(event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); goTo(activePage + (event.key === 'ArrowRight' ? 1 : -1)); } }}
      onScroll={(event) => { const element = event.currentTarget; const closest = Array.from(element.children).reduce((best, child, index) => Math.abs(child.offsetLeft - element.scrollLeft) < Math.abs(element.children[best].offsetLeft - element.scrollLeft) ? index : best, 0); setActivePage(closest); }}
      className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scrollbar-hide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30">
      {pages.map((page, pageIndex) => <div key={pageIndex} role="group" aria-roledescription="slide" aria-label={(pageIndex + 1) + ' of ' + pages.length} className={'grid w-full shrink-0 snap-start content-start gap-x-3 gap-y-5 ' + (mobile ? 'grid-cols-3 sm:gap-x-6' : 'grid-cols-5 gap-x-6')}>
        {page.map((brand) => <Link key={brand.slug} href={'/brands/' + brand.slug} className="group min-w-0 rounded-lg text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-4">
          <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-xl border border-warm-100 bg-warm-50 transition-colors group-hover:border-warm-300">
            {brand.image ? <Image src={brand.image} alt={brand.name} fill className="object-contain p-3 transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none lg:p-5" sizes="(max-width: 1023px) 30vw, 220px" /> : <span className="flex h-full items-center justify-center text-2xl font-semibold text-warm-400">{brand.name.slice(0, 2).toUpperCase()}</span>}
          </div>
          <h3 className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-warm-900 group-hover:text-brand-700">{brand.name}</h3>
          <p className="mt-0.5 text-[10px] text-warm-500">{Number(brand.productCount || 0).toLocaleString('en-IN')} {Number(brand.productCount) === 1 ? 'item' : 'items'}</p>
        </Link>)}
      </div>)}
    </div>
    {pages.length > 1 && <div className="mt-4 flex items-center justify-center gap-2" aria-label="Brand slide controls">
      <button type="button" aria-label="Previous brand slide" disabled={activePage <= 0} onClick={() => goTo(activePage - 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-warm-200 text-warm-600 hover:bg-warm-50 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
      {pages.map((_, index) => <button key={index} type="button" aria-label={'Go to brand slide ' + (index + 1)} aria-current={index === activePage ? 'true' : undefined} onClick={() => goTo(index)} className="flex h-9 min-w-6 items-center justify-center"><span className={'h-1.5 rounded-full transition-all ' + (index === activePage ? 'w-5 bg-warm-900' : 'w-1.5 bg-warm-300')} /></button>)}
      <button type="button" aria-label="Next brand slide" disabled={activePage >= pages.length - 1} onClick={() => goTo(activePage + 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-warm-200 text-warm-600 hover:bg-warm-50 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
    </div>}
  </div>;
}

export default function ShopByBrand({ brands = [] }) {
  const uniqueBrands = Array.from(new Map(brands.filter((brand) => brand?.slug).map((brand) => [brand.slug, brand])).values());
  if (!uniqueBrands.length) return null;
  return <section aria-labelledby="shop-by-brand-heading" className="border-y border-warm-100 bg-white py-8 sm:py-10">
    <div className="store-container">
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-4"><span className="h-px w-12 bg-warm-200 sm:w-20" /><h2 id="shop-by-brand-heading" className="text-sm font-bold uppercase tracking-[0.2em] text-warm-900 sm:text-base">Shop by brand</h2><span className="h-px w-12 bg-warm-200 sm:w-20" /></div>
        <p className="mt-2 text-xs text-warm-500">Find your favourites. Discover something new.</p>
      </div>
      <BrandCarousel key={'mobile-' + uniqueBrands.length} brands={uniqueBrands} perPage={9} mobile />
      <BrandCarousel key={'desktop-' + uniqueBrands.length} brands={uniqueBrands} perPage={10} />
      <div className="mt-3 text-center"><Link href="/brands" className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-warm-700 hover:text-brand-700">Explore all brands <ArrowRight className="h-4 w-4" /></Link></div>
    </div>
  </section>;
}
