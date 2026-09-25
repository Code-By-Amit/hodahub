import { useState } from 'react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const [jumpPage, setJumpPage] = useState('');

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

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const p = parseInt(jumpPage, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      onPageChange(p);
      setJumpPage('');
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-2">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-3 py-1.5 text-xs font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        {start > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="w-8 h-8 text-xs font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg transition-colors"
            >
              1
            </button>
            {start > 2 && <span className="text-warm-400 px-1 text-xs">...</span>}
          </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
              page === currentPage
                ? 'bg-warm-900 text-white font-bold'
                : 'text-warm-600 hover:text-warm-900 hover:bg-warm-100'
            }`}
          >
            {page}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="text-warm-400 px-1 text-xs">...</span>}
            <button
              onClick={() => onPageChange(totalPages)}
              className="w-8 h-8 text-xs font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1.5 text-xs font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>

      {/* Go to page UI */}
      <form onSubmit={handleJumpSubmit} className="flex items-center gap-1 ml-2 border-l border-warm-200 pl-3">
        <span className="text-[11px] text-warm-500 font-medium whitespace-nowrap">Go to:</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={jumpPage}
          onChange={(e) => setJumpPage(e.target.value)}
          placeholder={`${currentPage}`}
          className="w-12 px-2 py-1 text-xs border border-warm-200 rounded-md outline-none focus:border-brand-500 bg-white text-center font-medium"
        />
        <button
          type="submit"
          className="px-2.5 py-1 text-xs font-semibold bg-warm-900 text-white rounded-md hover:bg-warm-800 transition-colors"
        >
          Go
        </button>
      </form>
    </div>
  );
}
