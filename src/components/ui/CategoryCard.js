import Link from 'next/link';
import Image from 'next/image';
import { Layers } from 'lucide-react';

export default function CategoryCard({
  name,
  slug,
  href,
  imageUrl,
  productCount = 0,
}) {
  const targetHref = href || `?category=${slug}`;

  return (
    <Link
      href={targetHref}
      className="group bg-warm-50/70 hover:bg-white border border-warm-200/80 hover:border-warm-300 rounded-xl p-3 flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-warm-900/30"
    >
      <div className="relative w-full aspect-square bg-white border border-warm-100/80 rounded-lg p-2.5 mb-2.5 overflow-hidden flex items-center justify-center shrink-0">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${name} category`}
            fill
            loading="lazy"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-warm-300">
            <Layers className="w-7 h-7" />
          </div>
        )}
      </div>

      <h3 className="text-[11px] sm:text-xs font-bold text-warm-900 truncate w-full group-hover:text-warm-800 transition-colors">
        {name}
      </h3>

      <span className="text-[10px] text-warm-500 font-medium mt-0.5">
        {productCount} item{productCount !== 1 ? 's' : ''}
      </span>
    </Link>
  );
}
