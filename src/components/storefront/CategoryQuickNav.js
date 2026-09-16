'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Folder, Grid } from 'lucide-react';

export default function CategoryQuickNav({ categories = [] }) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="bg-white border-b border-warm-200/80 shadow-2xs py-3">
      <div className="max-w-4xl mx-auto px-1">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          <Link
            href="/products"
            className="group shrink-0 flex flex-col items-center text-center w-16 "
          >
            <div className="w-14 h-14 rounded-full bg-warm-900 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
              <Grid className="w-5 h-5 " />
            </div>
            <span className="text-[11px] font-semibold text-warm-900 line-clamp-1 group-hover:text-warm-700">
              All Items
            </span>
          </Link>

          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className="group shrink-0 flex flex-col items-center text-center w-16 "
            >
              <div className=" w-14 h-14 rounded-full overflow-hidden bg-warm-100 border border-warm-200 flex items-center justify-center mb-1.5 shadow-2xs relative group-hover:scale-105 transition-transform">
                {cat.imageUrl ? (
                  <Image
                    src={cat.imageUrl}
                    alt={cat.name}
                    fill
                    className="object-cover"
                    sizes="66px"
                  />
                ) : (
                  <Folder className="w-3 h-3 text-warm-400" />
                )}
              </div>
              <span className="text-[11px] font-semibold text-warm-800 whitespace-nowrap overflow-visible group-hover:text-warm-900">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
