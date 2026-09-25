'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import { Tag, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';
import FieldError from '@/components/ui/FieldError';
import { brandSchema } from '@/lib/validations';
import { flattenZodErrors } from '@/lib/zod-utils';

export default function AdminBrandsPage() {
  const toast = useToast();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', logoUrl: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  async function fetchBrands() {
    try {
      const res = await fetch('/api/admin/brands');
      const data = await res.json();
      setBrands(data.brands || []);
    } catch {}
    setLoading(false);
  }

  function startEdit(b) {
    setEditingId(b.id);
    setForm({
      name: b.name,
      slug: b.slug,
      logoUrl: b.logoUrl || '',
    });
    setErrors({});
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm({ name: '', slug: '', logoUrl: '' });
    setErrors({});
    setShowForm(false);
  }

  function handleNameChange(name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setForm((prev) => ({ ...prev, name, slug }));
    if (errors.name || errors.slug) {
      setErrors((prev) => ({ ...prev, name: null, slug: null }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validation = brandSchema.safeParse(form);
    if (!validation.success) {
      const fieldErrors = flattenZodErrors(validation.error);
      setErrors(fieldErrors);
      toast.error(validation.error.issues?.[0]?.message || 'Please fix brand errors');
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/brands/${editingId}` : '/api/admin/brands';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editingId ? 'Brand updated!' : 'Brand created!');
        resetForm();
        fetchBrands();
      } else {
        if (data.errors) setErrors(data.errors);
        toast.error(data.error || 'Failed to save brand');
      }
    } catch {
      toast.error('Network error');
    }
    setSaving(false);
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete brand "${name}"? Products attached to this brand will become unbranded.`)) return;
    try {
      const res = await fetch(`/api/admin/brands/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Brand deleted');
        fetchBrands();
      } else toast.error('Failed to delete brand');
    } catch {
      toast.error('Error deleting brand');
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-warm-900">Brand Management</h1>
          <p className="text-[11px] text-warm-500">Manage store product brands for customer filtering and search</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Brand</span>
        </button>
      </div>

      {/* Centered Structured Brand Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white border border-warm-200 rounded-md shadow-xl p-4 space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-warm-100 pb-2">
              <h3 className="font-bold text-warm-900 text-[13px]">
                {editingId ? 'Edit Brand' : 'Create New Brand'}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 text-warm-400 hover:text-warm-900 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Brand Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Casio, Rolex"
                  className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                    errors.name ? 'border-red-500' : 'border-warm-200 focus:border-brand-600'
                  }`}
                />
                <FieldError message={errors.name} />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="casio"
                  className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 font-mono focus:outline-none ${
                    errors.slug ? 'border-red-500' : 'border-warm-200 focus:border-brand-600'
                  }`}
                />
                <FieldError message={errors.slug} />
              </div>
            </div>

            <div>
              <ImageUpload
                uploadType="brand-logo"
                value={form.logoUrl ? [form.logoUrl] : []}
                onChange={(urls) => setForm({ ...form, logoUrl: Array.isArray(urls) ? urls[0] || '' : urls })}
                multiple={false}
                label="Brand Logo (Optional)"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1.5 border-t border-warm-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 border border-warm-200 text-warm-700 text-[11px] font-semibold rounded-md hover:bg-warm-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-3.5 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all flex items-center gap-1.5 disabled:opacity-60"
              >
                {saving ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{editingId ? 'Update Brand' : 'Save Brand'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Brand List Table */}
      <div className="bg-white rounded-md border border-warm-200 overflow-x-auto shadow-xs">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-warm-50/80 text-warm-600 text-[10px] font-semibold border-b border-warm-200">
              <th className="px-3 py-2 text-left">Brand</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-warm-400">
                  Loading brands...
                </td>
              </tr>
            ) : brands.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-warm-400">
                  No brands found. Click &quot;Add Brand&quot; to create one.
                </td>
              </tr>
            ) : (
              brands.map((b) => (
                <tr key={b.id} className="hover:bg-warm-50/50 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {b.logoUrl ? (
                        <div className="relative w-7 h-7 rounded-md overflow-hidden border border-warm-200 shrink-0 bg-white">
                          <Image src={b.logoUrl} alt={b.name} fill className="object-contain p-0.5" sizes="28px" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 bg-warm-100 rounded-md flex items-center justify-center text-warm-500 shrink-0">
                          <Tag className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <span className="font-semibold text-warm-900">{b.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-warm-500 font-mono text-[10px]">{b.slug}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(b)}
                        className="p-1 text-warm-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                        title="Edit brand"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id, b.name)}
                        className="p-1 text-warm-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete brand"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
