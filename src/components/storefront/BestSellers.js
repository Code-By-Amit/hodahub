'use client';

import Link from 'next/link';
import ProductCard from '@/components/ui/ProductCard';
import { FiArrowRight } from 'react-icons/fi';

export default function BestSellers({ products = [] }) {
  return (
    <section className="py-6 bg-white">
      <div className="max-w-4xl mx-auto px-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-md font-bold text-warm-900 tracking-tight">
            Best Sellers
          </h2>
          <Link
            href="/products?sort=best-sellers"
            className="flex items-center gap-1.5 text-[11px] font-medium text-warm-600 hover:text-brand-600 transition-colors"
          >
            View All Best Sellers
            <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Bestseller Grid */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} variant="bestseller" />
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12 text-warm-400">
            <p className="text-lg mb-2">No best sellers yet</p>
            <p className="text-sm">Top-rated products will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
