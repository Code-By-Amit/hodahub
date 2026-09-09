export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;

  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-2 text-sm font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>

      {start > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="w-9 h-9 text-sm font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg transition-colors"
          >
            1
          </button>
          {start > 2 && <span className="text-warm-400 px-1">...</span>}
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
            page === currentPage
              ? 'bg-warm-900 text-white'
              : 'text-warm-600 hover:text-warm-900 hover:bg-warm-100'
          }`}
        >
          {page}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-warm-400 px-1">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="w-9 h-9 text-sm font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg transition-colors"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-2 text-sm font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </div>
  );
}
