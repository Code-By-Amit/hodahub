import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-[11px] text-warm-500 py-1 mb-2">
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-warm-900 transition-colors"
          >
            <Home className="w-3 h-3" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.href || index} className="flex items-center gap-1.5">
              <ChevronRight className="w-2.5 h-2.5 text-warm-300 shrink-0" />
              {isLast || !item.href ? (
                <span className="font-medium text-warm-900 truncate max-w-[200px]">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-warm-900 transition-colors truncate max-w-[150px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
