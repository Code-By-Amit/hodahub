'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Folder, Grid } from 'lucide-react';

export default function CategorySection({ categories = [] }) {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-warm-900 tracking-tight">
            Shop by Categories
          </h2>
          {categories.length > 0 && (
            <Link
              href="/categories"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-warm-600 hover:text-brand-600 transition-colors"
            >
              View All Categories
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Categories scrollable container */}
        {categories.length > 0 ? (
          <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4">
            {categories.map((cat, i) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group shrink-0 w-40 sm:w-48"
                style={{ animation: `slideUp 0.5s ease-out ${i * 0.1}s both` }}
              >
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-warm-100 mb-3 border border-warm-100 group-hover:shadow-md transition-all">
                  {cat.imageUrl ? (
                    <Image
                      src={cat.imageUrl}
                      alt={cat.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="192px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-warm-100 to-warm-200 flex items-center justify-center text-warm-400">
                      <Folder className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-white font-semibold text-sm mb-1">{cat.name}</h3>
                    <span className="inline-flex items-center gap-1 text-white/80 text-xs font-medium group-hover:text-white transition-colors">
                      Shop Now <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-warm-50 rounded-2xl border border-warm-100 p-8 text-center text-warm-500">
            <Grid className="w-8 h-8 mx-auto text-warm-400 mb-2" />
            <p className="text-sm font-medium">No categories available yet.</p>
          </div>
        )}

        {/* Mobile view all */}
        {categories.length > 0 && (
          <div className="mt-6 sm:hidden text-center">
            <Link
              href="/categories"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600"
            >
              View All Categories
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

