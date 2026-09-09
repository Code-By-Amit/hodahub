import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export const metadata = {
  title: 'About Us — HodaHub',
  description: 'Learn more about HodaHub, our mission, and our curated catalog of modern products.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      <Breadcrumbs items={[{ label: 'About Us' }]} />

      <div className="max-w-2xl mx-auto text-center py-3">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-50 border border-brand-200/80 rounded-md text-brand-700 text-[9px] font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3 text-brand-600" />
          Our Story
        </div>
        <h1 className="text-lg sm:text-xl font-extrabold text-warm-900 tracking-tight mb-2">
          Curating Quality for Modern Lifestyles
        </h1>
        <p className="text-[11px] text-warm-600 leading-relaxed mx-auto">
          HodaHub was founded with a clear goal: to make discovering and purchasing high-quality, authentic products effortless, reliable, and enjoyable.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="p-3 bg-white rounded-lg border border-warm-200 shadow-xs text-center">
          <div className="w-8 h-8 mx-auto rounded-md bg-brand-50 flex items-center justify-center text-brand-600 mb-2 border border-brand-100">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-[11px] font-bold text-warm-900 mb-1">Curated Quality</h3>
          <p className="text-[10px] text-warm-500 leading-relaxed">
            Every product in our storefront is handpicked and verified to meet strict quality and authenticity standards.
          </p>
        </div>

        <div className="p-3 bg-white rounded-lg border border-warm-200 shadow-xs text-center">
          <div className="w-8 h-8 mx-auto rounded-md bg-brand-50 flex items-center justify-center text-brand-600 mb-2 border border-brand-100">
            <Truck className="w-4 h-4" />
          </div>
          <h3 className="text-[11px] font-bold text-warm-900 mb-1">Fast Express Delivery</h3>
          <p className="text-[10px] text-warm-500 leading-relaxed">
            We partner with premier logistics services to ensure your orders reach you quickly and safely.
          </p>
        </div>

        <div className="p-3 bg-white rounded-lg border border-warm-200 shadow-xs text-center">
          <div className="w-8 h-8 mx-auto rounded-md bg-brand-50 flex items-center justify-center text-brand-600 mb-2 border border-brand-100">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-[11px] font-bold text-warm-900 mb-1">Customer First</h3>
          <p className="text-[10px] text-warm-500 leading-relaxed">
            From seamless checkout to hassle-free returns, your satisfaction and security are our top priorities.
          </p>
        </div>
      </div>

      <div className="bg-warm-900 text-white rounded-xl p-5 sm:p-6 text-center">
        <h2 className="text-base sm:text-lg font-bold mb-1.5">Ready to explore our collection?</h2>
        <p className="text-warm-300 max-w-lg mx-auto mb-3 text-[10px] sm:text-[11px]">
          Browse our latest arrivals and discover products tailored to your taste.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-[11px] font-bold rounded-md hover:bg-brand-700 transition-all shadow-sm"
        >
          Explore Catalog <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}