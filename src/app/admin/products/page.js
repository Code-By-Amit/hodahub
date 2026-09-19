'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import { Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiCheck, FiX } from 'react-icons/fi';

export default function AdminProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedActive, setSelectedActive] = useState('');
  const [selectedStock, setSelectedStock] = useState('');
  const [search, setSearch] = useState('');         
  const [searchInput, setSearchInput] = useState('');  

  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((res) => res.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [pagination.page, search, selectedCategory, selectedActive, selectedStock]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pagination.page, limit: '15' });
      if (search) params.set('search', search);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedActive) params.set('active', selectedActive);
      if (selectedStock) params.set('stock', selectedStock);

      const res = await fetch(`/api/admin/products?${params}`);
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products || []);
        setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      }
    } catch {}
    setLoading(false);
  }

  async function handleToggleStatus(id, currentActive) {
    const nextVal = !currentActive;
    setLoadingId(id + '_active');
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: nextVal } : p))
    );
    try {
      const res = await fetch(`/api/admin/products/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextVal }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Product status set to ${nextVal ? 'Active' : 'Inactive'}`);
      } else {
        toast.error(data.error || 'Failed to update active status');
        fetchProducts();
      }
    } catch {
      toast.error('Failed to update active status');
      fetchProducts();
    }
    setLoadingId(null);
  }

  async function handleToggleStockStatus(id, currentIsOutOfStock) {
    const nextVal = !currentIsOutOfStock;
    setLoadingId(id + '_stock');
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isOutOfStock: nextVal } : p))
    );
    try {
      const res = await fetch(`/api/admin/products/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOutOfStock: nextVal }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Product stock status set to ${nextVal ? 'Out of Stock' : 'In Stock'}`);
      } else {
        toast.error(data.error || 'Failed to update stock status');
        fetchProducts();
      }
    } catch {
      toast.error('Failed to update stock status');
      fetchProducts();
    }
    setLoadingId(null);
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Product deleted'); fetchProducts(); }
      else toast.error('Failed to delete');
    } catch { toast.error('Error'); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-bold text-warm-900">Products</h1>
        <Link href="/admin/products/new" className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white text-[11px] font-medium rounded-md hover:bg-brand-600 transition-colors">
          <FiPlus className="w-3.5 h-3.5" /> Add Product
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
            placeholder="Search products..."
            className="w-full pl-8 pr-3 py-1.5 border border-warm-200 rounded-md text-[11px] outline-none focus:border-brand-400 bg-white"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
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
          onChange={(e) => setSelectedActive(e.target.value)}
          className="px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-700 outline-none focus:border-brand-400 cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>

        {/* Stock Filter */}
        <select
          value={selectedStock}
          onChange={(e) => setSelectedStock(e.target.value)}
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
            }}
            className="px-2.5 py-1.5 text-[10px] font-semibold text-warm-600 hover:text-red-600 bg-warm-100 rounded-md transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-md border border-warm-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="bg-warm-50 text-warm-600 text-[10px] uppercase tracking-wider">
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-left">Price</th>
              <th className="px-3 py-2 text-left">Stock State</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Active Status</th>
              <th className="px-3 py-2 text-left">COD</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-warm-100">
              {loading ? Array.from({length:5}).map((_,i) => (
                <tr key={i}><td colSpan={7} className="px-3 py-3"><div className="h-8 shimmer rounded" /></td></tr>
              )) : products.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-warm-400">No products found</td></tr>
              ) : products.map(p => {
                const isStockUpdating = loadingId === p.id + '_stock';
                const isActiveUpdating = loadingId === p.id + '_active';
                const isOutOfStock = Boolean(p.isOutOfStock);
                const isActive = Boolean(p.isActive);

                return (
                  <tr key={p.id} className="hover:bg-warm-50/50">
                    <td className="px-3 py-2"><div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md bg-warm-100 overflow-hidden shrink-0 relative">
                        {p.images?.[0] ? <Image src={p.images[0]} alt="" fill className="object-cover" sizes="32px" /> : <div className="w-full h-full flex items-center justify-center text-warm-400"><Package className="w-4 h-4" /></div>}
                      </div>
                      <span className="font-medium text-warm-900 truncate max-w-[180px]">{p.name}</span>
                    </div></td>
                    <td className="px-3 py-2 text-warm-700">{formatCurrency(p.discountPrice || p.price)}{p.discountPrice && <span className="text-warm-400 line-through ml-1 text-[10px]">{formatCurrency(p.price)}</span>}</td>
                    
                    {/* Stock State Pill Button */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold min-w-[50px] ${p.stock > 0 ? 'text-green-700' : 'text-red-500'}`}>{p.stock} pcs</span>
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
                        title="Click to toggle Active/Inactive visibility"
                      />
                    </td>
                    <td className="px-3 py-2">{p.codAvailable !== false ? <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-50 text-green-700 rounded-md">Yes</span> : <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-50 text-red-600 rounded-md">No</span>}</td>
                    <td className="px-3 py-2 text-right"><div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/products/${p.id}/edit`} className="p-1 text-warm-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors" title="Edit Full Product Form"><FiEdit className="w-3.5 h-3.5" /></Link>
                      <button onClick={() => handleDelete(p.id, p.name)} className="p-1 text-warm-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Product"><FiTrash2 className="w-3.5 h-3.5" /></button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {pagination.totalPages > 1 && <div className="mt-4"><Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={p => setPagination({...pagination, page: p})} /></div>}
    </div>
  );
}

function StatusPillButton({ active, loading, onClick, activeLabel, inactiveLabel, activeClass, inactiveClass, title }) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold transition-all cursor-pointer active:scale-95 select-none ${
        loading ? 'opacity-60 pointer-events-none' : ''
      } ${active ? activeClass : inactiveClass}`}
    >
      {loading ? (
        <div className="w-2.5 h-2.5 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" />
      ) : active ? (
        <FiCheck className="w-2.5 h-2.5 shrink-0 stroke-[2.5]" />
      ) : (
        <FiX className="w-2.5 h-2.5 shrink-0 stroke-[2.5]" />
      )}
      <span>{active ? activeLabel : inactiveLabel}</span>
    </button>
  );
}