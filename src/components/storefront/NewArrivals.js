'use client';

import Link from 'next/link';
import ProductCard from '@/components/ui/ProductCard';
import { FiArrowRight } from 'react-icons/fi';

export default function NewArrivals({ products = [] }) {
  return (
    <section className="py-6 bg-warm-50/50">
      <div className="max-w-4xl mx-auto px-1 ">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-md   font-bold text-warm-900 tracking-tight">
            New Arrivals
          </h2>
          <Link
            href="/products?sort=newest"
            className="flex items-center gap-1 text-[11px] font-medium text-warm-600 hover:text-brand-600 transition-colors"
          >
            View All New Arrivals
            <FiArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12 text-warm-400">
            <p className="text-base mb-1.5">No new arrivals yet</p>
            <p className="text-xs">Products will appear here once added.</p>
          </div>
        )}
      </div>
    </section>
  );
}