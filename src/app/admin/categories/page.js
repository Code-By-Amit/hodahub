'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import { Folder, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';
import CustomSelect from '@/components/ui/CustomSelect';

export default function AdminCategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', imageUrl: '', parentId: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch {}
    setLoading(false);
  }

  function startEdit(cat) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      imageUrl: cat.imageUrl || '',
      parentId: cat.parentId || '',
    });
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm({ name: '', slug: '', imageUrl: '', parentId: '' });
    setShowForm(false);
  }

  function handleNameChange(name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setForm((prev) => ({ ...prev, name, slug }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.slug) {
      toast.error('Name and slug are required');
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/categories/${editingId}` : '/api/admin/categories';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, parentId: form.parentId || null }),
      });
      if (res.ok) {
        toast.success(editingId ? 'Category updated!' : 'Category created!');
        resetForm();
        fetchCategories();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Failed');
      }
    } catch {
      toast.error('Network error');
    }
    setSaving(false);
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Category deleted');
        fetchCategories();
      } else toast.error('Failed to delete category');
    } catch {
      toast.error('Error deleting category');
    }
  }

  const parentOptions = [
    { value: '', label: 'No Parent (Top-level Category)' },
    ...categories
      .filter((c) => c.id !== editingId)
      .map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-warm-900">Category Management</h1>
          <p className="text-[11px] text-warm-500">Organize store products into logical groups</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Centered Structured Category Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white border border-warm-200 rounded-md shadow-xl p-4 space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-warm-100 pb-2">
              <h3 className="font-bold text-warm-900 text-[13px]">
                {editingId ? 'Edit Category' : 'Create New Category'}
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
                  Category Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Footwear"
                  className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="footwear"
                  className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 font-mono focus:outline-none focus:border-brand-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Parent Category
              </label>
              <CustomSelect
                options={parentOptions}
                value={form.parentId || ''}
                onChange={(val) => setForm({ ...form, parentId: val })}
                placeholder="Select parent..."
              />
            </div>

            <div>
              <ImageUpload
                uploadType="category-image"
                value={form.imageUrl ? [form.imageUrl] : []}
                onChange={(urls) => setForm({ ...form, imageUrl: Array.isArray(urls) ? urls[0] || '' : urls })}
                multiple={false}
                label="Category Cover Image"
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
                <span>{editingId ? 'Update Category' : 'Save Category'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category List Table */}
      <div className="bg-white rounded-md border border-warm-200 overflow-x-auto shadow-xs">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-warm-50/80 text-warm-600 text-[10px] font-semibold border-b border-warm-200">
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Parent Category</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-warm-400">
                  Loading categories...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-warm-400">
                  No categories found. Click &quot;Add Category&quot; to create one.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="hover:bg-warm-50/50 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {c.imageUrl ? (
                        <div className="relative w-7 h-7 rounded-md overflow-hidden border border-warm-200 shrink-0">
                          <Image src={c.imageUrl} alt={c.name} fill className="object-cover" sizes="28px" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 bg-warm-100 rounded-md flex items-center justify-center text-warm-500 shrink-0">
                          <Folder className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <span className="font-semibold text-warm-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-warm-500 font-mono text-[10px]">{c.slug}</td>
                  <td className="px-3 py-2 text-warm-600">
                    {categories.find((p) => p.id === c.parentId)?.name || '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(c)}
                        className="p-1 text-warm-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                        title="Edit category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="p-1 text-warm-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete category"
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