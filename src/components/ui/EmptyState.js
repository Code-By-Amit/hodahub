import Link from 'next/link';
import { Package } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Package,
  title = 'No items found',
  description = 'There are no items to display at this time.',
  actionLabel,
  actionHref,
  onAction,
}) {
  return (
    <div className="bg-white border border-warm-200/80 rounded-xl p-8 sm:p-10 text-center my-4 shadow-2xs">
      <div className="w-10 h-10 mx-auto rounded-full bg-warm-100 flex items-center justify-center text-warm-400 mb-3">
        <Icon className="w-5 h-5 text-warm-500" />
      </div>
      <h3 className="text-xs sm:text-sm font-bold text-warm-900 tracking-tight mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-[11px] text-warm-500 max-w-sm mx-auto mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && (actionHref || onAction) && (
        <div>
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center justify-center px-3 py-1.5 bg-warm-900 hover:bg-warm-800 text-white text-[11px] font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-warm-900/30"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center px-3 py-1.5 bg-warm-900 hover:bg-warm-800 text-white text-[11px] font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-warm-900/30 cursor-pointer"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
