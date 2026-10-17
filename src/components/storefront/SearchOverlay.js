'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiSearch, FiX, FiGrid } from 'react-icons/fi';
import { formatCurrency } from '@/lib/utils';
import { productsApi } from '@/lib/apiClient/products.api';
import { categoriesApi } from '@/lib/apiClient/categories.api';

export default function SearchOverlay({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [categoryResults, setCategoryResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [prodData, catData] = await Promise.all([
          productsApi.getAll({ search: query.trim(), limit: 6 }),
          categoriesApi.getAll(),
        ]);

        setResults(prodData?.products || []);

        const allCats = catData?.allCategories || catData?.categories || [];
        const matched = allCats.filter((c) =>
          c.name.toLowerCase().includes(query.trim().toLowerCase())
        );
        setCategoryResults(matched.slice(0, 4));
      } catch {
        setResults([]);
        setCategoryResults([]);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) {
      setResults([]);
      setCategoryResults([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-w-xl mx-auto mt-16 mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideDown 0.3s ease-out' }}
      >
        <div className="bg-white rounded-md shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="flex items-center px-4 py-3 border-b border-warm-100">
            <FiSearch className="w-4 h-4 text-warm-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search products or categories..."
              className="flex-1 px-3 py-1 text-sm text-warm-900 placeholder-warm-400 outline-none"
            />
            <button type="button" onClick={onClose} className="p-1.5 text-warm-400 hover:text-warm-600">
              <FiX className="w-4 h-4" />
            </button>
          </form>

          {query.trim() && (
            <div className="max-h-80 overflow-y-auto divide-y divide-warm-100">
              {loading ? (
                <div className="p-6 text-center text-warm-400 text-xs">Searching...</div>
              ) : categoryResults.length === 0 && results.length === 0 ? (
                <div className="p-6 text-center text-warm-400 text-xs">No products or categories found</div>
              ) : (
                <>
                  {/* Category Results */}
                  {categoryResults.length > 0 && (
                    <div className="p-2 bg-warm-50/50">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-warm-500">
                        Categories
                      </div>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        {categoryResults.map((cat) => (
                          <Link
                            key={cat.id}
                            href={`/categories/${cat.slug}`}
                            onClick={onClose}
                            className="flex items-center gap-2 p-2 bg-white border border-warm-200 rounded-md hover:border-brand-500 transition-colors"
                          >
                            <div className="w-6 h-6 rounded bg-warm-100 flex items-center justify-center shrink-0">
                              <FiGrid className="w-3.5 h-3.5 text-warm-600" />
                            </div>
                            <span className="text-xs font-semibold text-warm-800 truncate">{cat.name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product Results */}
                  {results.length > 0 && (
                    <div className="py-1.5">
                      <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-warm-500">
                        Products
                      </div>
                      {results.map((product) => (
                        <Link
                          key={product.id}
                          href={`/products/${product.slug}`}
                          onClick={onClose}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-warm-50 transition-colors"
                        >
                          <div className="w-10 h-10 bg-warm-100 rounded-md overflow-hidden shrink-0">
                            {product.images?.[0] && (
                              <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-warm-900 truncate">{product.name}</p>
                            <p className="text-xs text-brand-600 font-semibold">
                              {formatCurrency(product.discountPrice || product.price)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
