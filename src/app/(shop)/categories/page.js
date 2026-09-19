import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { categories, categoryRelations } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';
import { ArrowRight, Folder } from 'lucide-react';

export const revalidate = 60;

export const metadata = {
  title: 'Categories — HodaHub',
  description: 'Browse all product categories at HodaHub.',
};

export default async function CategoriesPage() {
  let allCategories = [];
  let childCategoryIds = new Set();
  try {
    allCategories = await db.select().from(categories).orderBy(asc(categories.name));
    const relations = await db.select().from(categoryRelations);
    childCategoryIds = new Set(relations.map((r) => r.categoryId));
  } catch {}

  const rootCategories = allCategories.filter((c) => !childCategoryIds.has(c.id));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-base font-bold text-warm-900 tracking-tight mb-0.5">All Categories</h1>
      <p className="text-warm-500 text-[11px] mb-5">Browse our curated collection</p>

      {rootCategories.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {rootCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className="group relative aspect-[4/5] rounded-lg overflow-hidden bg-warm-100 border border-warm-100"
            >
              {cat.imageUrl ? (
                <Image
                  src={cat.imageUrl}
                  alt={cat.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 33vw, 16vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-warm-100 to-warm-200 flex items-center justify-center text-warm-400">
                  <Folder className="w-6 h-6" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <h3 className="text-white font-bold text-[11px] mb-0.5 line-clamp-1">{cat.name}</h3>
                <span className="inline-flex items-center gap-0.5 text-white/80 text-[9px] font-medium group-hover:text-white transition-colors">
                  Shop Now <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-warm-400">
          <Folder className="w-8 h-8 mx-auto text-warm-300 mb-2" />
          <p className="text-sm">No categories yet. Check back soon!</p>
        </div>
      )}
    </div>
  );
}