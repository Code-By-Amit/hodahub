'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';
import { Layers, Plus, Edit2, Trash2, X, Check, Package } from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';
import NumericInput from '@/components/ui/NumericInput';
import FieldError from '@/components/ui/FieldError';
import { productAddonSchema } from '@/lib/validations';
import { flattenZodErrors } from '@/lib/zod-utils';

export default function AdminAddonsPage() {
  const toast = useToast();
  const [addonsList, setAddonsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    price: '0',
    isFree: false,
    imageUrl: '',
    isActive: true,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAddons();
  }, []);

  async function fetchAddons() {
    try {
      const res = await fetch('/api/admin/addons');
      const data = await res.json();
      setAddonsList(data.addons || []);
    } catch {}
    setLoading(false);
  }

  function startEdit(addon) {
    setEditingId(addon.id);
    setForm({
      name: addon.name,
      price: addon.price ? addon.price.toString() : '0',
      isFree: addon.isFree || false,
      imageUrl: addon.imageUrl || '',
      isActive: addon.isActive !== false,
    });
    setErrors({});
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      name: '',
      price: '0',
      isFree: false,
      imageUrl: '',
      isActive: true,
    });
    setErrors({});
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      price: form.isFree ? 0 : parseFloat(form.price) || 0,
      isFree: form.isFree === true,
      imageUrl: form.imageUrl || null,
      isActive: form.isActive !== false,
    };

    const validation = productAddonSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors = flattenZodErrors(validation.error);
      setErrors(fieldErrors);
      toast.error(validation.error.issues?.[0]?.message || 'Please fix add-on errors');
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const url = editingId ? `/api/admin/addons/${editingId}` : '/api/admin/addons';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(editingId ? 'Add-on updated!' : 'Add-on created!');
        resetForm();
        fetchAddons();
      } else {
        if (data.errors) setErrors(data.errors);
        toast.error(data.error || 'Failed to save add-on');
      }
    } catch {
      toast.error('Network error');
    }
    setSaving(false);
  }

  async function handleDelete(addon) {
    const confirmMsg = addon.productCount > 0
      ? `"${addon.name}" is currently linked to ${addon.productCount} product(s). Are you sure you want to delete and unlink it from all products?`
      : `Delete "${addon.name}" from library?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/addons/${addon.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Add-on deleted');
        fetchAddons();
      } else {
        toast.error('Failed to delete add-on');
      }
    } catch {
      toast.error('Error deleting add-on');
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-warm-900">Add-on Library</h1>
          <p className="text-[11px] text-warm-500">
            Create and manage reusable optional sub-products (gift boxes, warranty, extra straps) linked to store products
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Add-on</span>
        </button>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white border border-warm-200 rounded-md shadow-xl p-4 space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-warm-100 pb-2">
              <h3 className="font-bold text-warm-900 text-[13px]">
                {editingId ? 'Edit Library Add-on' : 'Create Library Add-on'}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 text-warm-400 hover:text-warm-900 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Add-on Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: null });
                }}
                placeholder="e.g. Rolex OG Gift Box"
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                  errors.name ? 'border-red-500' : 'border-warm-200 focus:border-brand-600'
                }`}
              />
              <FieldError message={errors.name} />
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Price (₹)
                </label>
                <NumericInput
                  disabled={form.isFree}
                  value={form.isFree ? '0' : form.price}
                  onChange={(val) => {
                    setForm({ ...form, price: val });
                    if (errors.price) setErrors({ ...errors, price: null });
                  }}
                  placeholder="900"
                  className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                    errors.price ? 'border-red-500' : 'border-warm-200 focus:border-brand-600'
                  }`}
                />
                <FieldError message={errors.price} />
              </div>

              <div className="pb-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isFree}
                    onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
                    className="accent-brand-600 w-3.5 h-3.5 rounded"
                  />
                  <span className="text-[11px] font-semibold text-warm-800">Offered Free</span>
                </label>
              </div>
            </div>

            {/* Thumbnail Upload */}
            <div>
              <ImageUpload
                uploadType="product-image"
                value={form.imageUrl ? [form.imageUrl] : []}
                onChange={(urls) => setForm({ ...form, imageUrl: Array.isArray(urls) ? urls[0] || '' : urls })}
                multiple={false}
                label="Add-on Photo / Thumbnail"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="accent-warm-900 w-3.5 h-3.5 rounded"
                />
                <span className="text-[11px] font-medium text-warm-800">
                  Active (available to link with products)
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-warm-100">
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
                <span>{editingId ? 'Update Add-on' : 'Save Add-on'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add-ons List Table */}
      <div className="bg-white rounded-md border border-warm-200 overflow-x-auto shadow-xs">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-warm-50/80 text-warm-600 text-[10px] font-semibold border-b border-warm-200">
              <th className="px-3 py-2 text-left">Add-on Item</th>
              <th className="px-3 py-2 text-left">Price</th>
              <th className="px-3 py-2 text-left">Linked Products</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-warm-400">
                  Loading add-on library...
                </td>
              </tr>
            ) : addonsList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-warm-400">
                  No add-ons in library. Click &quot;Add New Add-on&quot; to create reusable gift boxes, warranties, etc.
                </td>
              </tr>
            ) : (
              addonsList.map((addon) => (
                <tr key={addon.id} className="hover:bg-warm-50/50 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {addon.imageUrl ? (
                        <div className="relative w-8 h-8 rounded-md overflow-hidden border border-warm-200 shrink-0">
                          <Image src={addon.imageUrl} alt={addon.name} fill className="object-cover" sizes="32px" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-warm-100 rounded-md flex items-center justify-center text-warm-500 shrink-0 border border-warm-200">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                      <span className="font-semibold text-warm-900">{addon.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {addon.isFree ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200">
                        FREE
                      </span>
                    ) : (
                      <span className="font-bold text-warm-900">₹{addon.price}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-warm-600">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warm-100 text-warm-800 rounded text-[10px] font-semibold">
                      <Layers className="w-3 h-3 text-brand-600" />
                      {addon.productCount || 0} product(s)
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {addon.isActive !== false ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warm-500 bg-warm-100 px-2 py-0.5 rounded border border-warm-200">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(addon)}
                        className="p-1 text-warm-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                        title="Edit add-on"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(addon)}
                        className="p-1 text-warm-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete add-on"
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
