'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Pagination from '@/components/ui/Pagination';
import { Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiCheck, FiX, FiExternalLink } from 'react-icons/fi';
import useAdminProducts from '@/hooks/useAdminProducts';
import useAdminCategories from '@/hooks/useAdminCategories';

export default function AdminProductsPage() {
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedActive, setSelectedActive] = useState('');
  const [selectedStock, setSelectedStock] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { categories } = useAdminCategories();

  const {
    products,
    pagination,
    isLoading,
    isFetching,
    toggleStatus,
    isToggling,
    togglingVariables,
    deleteProduct,
  } = useAdminProducts({
    page,
    limit: 15,
    search,
    category: selectedCategory,
    active: selectedActive,
    stock: selectedStock,
  });

  async function handleToggleStatus(id, currentActive) {
    try {
      await toggleStatus({ id, patch: { isActive: !currentActive } });
    } catch {}
  }

  async function handleToggleShowOnHome(id, currentShowOnHome) {
    try {
      await toggleStatus({ id, patch: { showOnHome: !currentShowOnHome } });
    } catch {}
  }

  async function handleToggleStockStatus(id, currentIsOutOfStock) {
    try {
      await toggleStatus({ id, patch: { isOutOfStock: !currentIsOutOfStock } });
    } catch {}
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteProduct({ id });
    } catch {}
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-bold text-warm-900">Products</h1>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white text-[11px] font-medium rounded-md hover:bg-brand-600 transition-colors"
        >
          <FiPlus className="w-3.5 h-3.5" /> Add Product
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearch(searchInput.trim());
                setPage(1);
              }
            }}
            placeholder="Search products..."
            className="w-full pl-8 pr-3 py-1.5 border border-warm-200 rounded-md text-[11px] outline-none focus:border-brand-400 bg-white"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setPage(1);
          }}
          className="px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-700 outline-none focus:border-brand-400 cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Active/Inactive Filter */}
        <select
          value={selectedActive}
          onChange={(e) => {
            setSelectedActive(e.target.value);
            setPage(1);
          }}
          className="px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-700 outline-none focus:border-brand-400 cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>

        {/* Stock Filter */}
        <select
          value={selectedStock}
          onChange={(e) => {
            setSelectedStock(e.target.value);
            setPage(1);
          }}
          className="px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-700 outline-none focus:border-brand-400 cursor-pointer"
        >
          <option value="">All Stock States</option>
          <option value="in_stock">In Stock Only</option>
          <option value="out_of_stock">Out of Stock Only</option>
        </select>

        {(selectedCategory || selectedActive || selectedStock || search) && (
          <button
            onClick={() => {
              setSelectedCategory('');
              setSelectedActive('');
              setSelectedStock('');
              setSearch('');
              setSearchInput('');
              setPage(1);
            }}
            className="text-[11px] text-warm-500 hover:text-warm-900 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-md border border-warm-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-warm-50/70 border-b border-warm-200 text-warm-600 text-[10px] uppercase tracking-wider font-semibold">
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-left">Price</th>
                <th className="px-3 py-2 text-left">Stock State</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Home Visibility</th>
                <th className="px-3 py-2 text-left">COD</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-100">
              {isLoading && products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-warm-400">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-warm-400">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isActive = p.isActive !== false;
                  const isOutOfStock = p.isOutOfStock === true || Number(p.stock) <= 0;
                  const showOnHome = p.showOnHome !== false;

                  const isTogglingThis = isToggling && togglingVariables?.id === p.id;
                  const isStockUpdating = isTogglingThis && 'isOutOfStock' in (togglingVariables?.patch || {});
                  const isActiveUpdating = isTogglingThis && 'isActive' in (togglingVariables?.patch || {});
                  const isShowOnHomeUpdating = isTogglingThis && 'showOnHome' in (togglingVariables?.patch || {});

                  return (
                    <tr key={p.id} className="hover:bg-warm-50/50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md bg-warm-100 overflow-hidden shrink-0 relative">
                            {p.images?.[0] ? (
                              <Image
                                src={p.images[0]}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="32px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-warm-400">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-warm-900 truncate max-w-[180px]">
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-warm-700">
                        {formatCurrency(p.discountPrice || p.price)}
                        {p.discountPrice && (
                          <span className="text-warm-400 line-through ml-1 text-[10px]">
                            {formatCurrency(p.price)}
                          </span>
                        )}
                      </td>

                      {/* Stock State Pill Button */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold min-w-[50px] ${
                              p.stock > 0 ? 'text-green-700' : 'text-red-500'
                            }`}
                          >
                            {p.stock} pcs
                          </span>
                          <StatusPillButton
                            active={!isOutOfStock}
                            loading={isStockUpdating}
                            activeLabel="In Stock"
                            inactiveLabel="Out of Stock"
                            activeClass="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 hover:border-emerald-400 hover:shadow-xs"
                            inactiveClass="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 hover:border-amber-400 hover:shadow-xs"
                            onClick={() => handleToggleStockStatus(p.id, isOutOfStock)}
                            title="Click to toggle Stock availability"
                          />
                        </div>
                      </td>

                      <td className="px-3 py-2 text-warm-500">{p.categoryName || '—'}</td>

                      {/* Active Status Pill Button */}
                      <td className="px-3 py-2">
                        <StatusPillButton
                          active={isActive}
                          loading={isActiveUpdating}
                          activeLabel="Active"
                          inactiveLabel="Inactive"
                          activeClass="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 hover:border-emerald-400 hover:shadow-xs"
                          inactiveClass="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 hover:border-rose-400 hover:shadow-xs"
                          onClick={() => handleToggleStatus(p.id, isActive)}
                          title="Click to toggle Active/Inactive system status"
                        />
                      </td>

                      {/* Home Display Pill Button */}
                      <td className="px-3 py-2">
                        <StatusPillButton
                          active={showOnHome}
                          loading={isShowOnHomeUpdating}
                          activeLabel="Show on Home"
                          inactiveLabel="Hide on Home"
                          activeClass="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 hover:border-blue-400 hover:shadow-xs"
                          inactiveClass="bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 hover:border-slate-400 hover:shadow-xs"
                          onClick={() => handleToggleShowOnHome(p.id, showOnHome)}
                          title="Click to toggle visibility on Home Page sections"
                        />
                      </td>

                      <td className="px-3 py-2">
                        {p.codAvailable !== false ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-50 text-green-700 rounded-md">
                            Yes
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-50 text-red-600 rounded-md">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="p-1 text-warm-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                            title="Edit Full Product Form"
                          >
                            <FiEdit className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1 text-warm-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete Product"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11px] text-warm-500">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total products)
          </p>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
}

function StatusPillButton({
  active,
  loading,
  onClick,
  activeLabel,
  inactiveLabel,
  activeClass,
  inactiveClass,
  title,
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${
        active ? activeClass : inactiveClass
      }`}
    >
      {loading ? (
        <span className="w-1.5 h-1.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-current' : 'bg-warm-400'}`} />
      )}
      <span>{loading ? 'Updating...' : active ? activeLabel : inactiveLabel}</span>
    </button>
  );
}