'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Check, Package } from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';
import CustomSelect from '@/components/ui/CustomSelect';
import NumericInput from '@/components/ui/NumericInput';

export default function NewProductPage() {
  return <ProductForm />;
}

export function ProductForm({ initialData, productId }) {
  const router = useRouter();
  const toast = useToast();
  const isEditing = !!productId;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    discountPrice: '',
    categoryId: '',
    stock: '0',
    images: [],
    specifications: [],
    addons: [],
    productLink: '',
    isActive: true,
    codAvailable: true,
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({
        ...prev,
        ...initialData,
        addons: initialData.addons || [],
      }));
    }
  }, [initialData]);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  function handleNameChange(name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setForm((prev) => ({ ...prev, name, slug }));
  }

  // Specifications Key-Value Row Helpers
  const addSpecRow = () => {
    setForm((prev) => ({
      ...prev,
      specifications: [...(prev.specifications || []), { label: '', value: '' }],
    }));
  };

  const removeSpecRow = (index) => {
    setForm((prev) => ({
      ...prev,
      specifications: (prev.specifications || []).filter((_, i) => i !== index),
    }));
  };

  const updateSpecRow = (index, field, val) => {
    setForm((prev) => {
      const updated = [...(prev.specifications || [])];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, specifications: updated };
    });
  };

  // Add-ons Row Helpers
  const addAddonRow = () => {
    setForm((prev) => ({
      ...prev,
      addons: [...(prev.addons || []), { name: '', price: '0', isFree: false, isActive: true }],
    }));
  };

  const removeAddonRow = (index) => {
    setForm((prev) => ({
      ...prev,
      addons: (prev.addons || []).filter((_, i) => i !== index),
    }));
  };

  const updateAddonRow = (index, field, val) => {
    setForm((prev) => {
      const updated = [...(prev.addons || [])];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, addons: updated };
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.slug || !form.price || !form.categoryId) {
      toast.error('Name, slug, price, and Category are required');
      return;
    }
    setLoading(true);

    // Clean spec rows with missing labels/values
    const cleanSpecs = (form.specifications || []).filter(
      (s) => s.label.trim() !== '' && s.value.trim() !== ''
    );

    // Clean addon rows
    const cleanAddons = (form.addons || [])
      .filter((a) => a.name.trim() !== '')
      .map((a) => ({
        name: a.name.trim(),
        price: parseFloat(a.price) || 0,
        isFree: a.isFree === true,
        isActive: a.isActive !== false,
      }));

    try {
      const url = isEditing ? `/api/admin/products/${productId}` : '/api/admin/products';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : null,
          stock: parseInt(form.stock) || 0,
          categoryId: form.categoryId,
          specifications: cleanSpecs,
          addons: cleanAddons,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(isEditing ? 'Product updated successfully!' : 'Product created successfully!');
        router.push('/admin/products');
      } else {
        toast.error(data.error || 'Failed to save product');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  }

  const categoryOptions = [
    { value: '', label: 'Select category (Required)...' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="p-1.5 hover:bg-warm-100 rounded-md text-warm-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-warm-900">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-[11px] text-warm-500">
              {isEditing ? 'Update catalog details & inventory' : 'Create a new item in your store catalog'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="px-3 py-1.5 border border-warm-200 text-warm-700 text-[11px] font-semibold rounded-md hover:bg-warm-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-3.5 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all flex items-center gap-1.5 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{isEditing ? 'Update Product' : 'Save Product'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Basic Information */}
        <div className="bg-white border border-warm-200 rounded-md p-4 space-y-3">
          <h2 className="text-[13px] font-bold text-warm-900 border-b border-warm-100 pb-2 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-brand-600" />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10"
                placeholder="e.g. Minimalist Leather Watch"
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
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 font-mono focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10"
                placeholder="minimalist-leather-watch"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-warm-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 resize-none"
              placeholder="Detailed description of materials, sizing, features..."
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-warm-700 mb-1">
              Product Link (Admin Reference / Supplier Link — Never shown to customers)
            </label>
            <input
              type="url"
              value={form.productLink || ''}
              onChange={(e) => setForm({ ...form, productLink: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 font-mono focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10"
              placeholder="https://supplier.com/product-source-link"
            />
          </div>
        </div>

        {/* Section 2: Pricing & Category */}
        <div className="bg-white border border-warm-200 rounded-md p-4 space-y-3">
          <h2 className="text-[13px] font-bold text-warm-900 border-b border-warm-100 pb-2">
            Pricing, Category & Inventory
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Regular Price ($) *
              </label>
              <NumericInput
                value={form.price}
                onChange={(val) => setForm({ ...form, price: val })}
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                placeholder="99.99"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Sale Price ($)
              </label>
              <NumericInput
                value={form.discountPrice || ''}
                onChange={(val) => setForm({ ...form, discountPrice: val })}
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                placeholder="79.99"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Available Stock *
              </label>
              <NumericInput
                allowDecimals={false}
                min={0}
                value={form.stock}
                onChange={(val) => setForm({ ...form, stock: val })}
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Category *
              </label>
              <CustomSelect
                options={categoryOptions}
                value={form.categoryId || ''}
                onChange={(val) => setForm({ ...form, categoryId: val })}
                placeholder="Select category..."
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1.5">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="accent-warm-900 w-3.5 h-3.5 rounded"
              />
              <span className="text-[11px] font-medium text-warm-800">
                Active (visible on storefront)
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.codAvailable}
                onChange={(e) => setForm({ ...form, codAvailable: e.target.checked })}
                className="accent-warm-900 w-3.5 h-3.5 rounded"
              />
              <span className="text-[11px] font-medium text-warm-800">
                Cash on Delivery Available
              </span>
            </label>
          </div>
        </div>

        {/* Section 3: Product Gallery (Image Upload) */}
        <div className="bg-white border border-warm-200 rounded-md p-4 space-y-3">
          <h2 className="text-[13px] font-bold text-warm-900 border-b border-warm-100 pb-2">
            Product Images
          </h2>
          <ImageUpload
            uploadType="product-image"
            value={form.images || []}
            onChange={(urls) => setForm({ ...form, images: urls })}
            multiple={true}
            maxFiles={8}
            label="Upload Product Photos"
          />
        </div>

        {/* Section 4: Specifications Key-Value Builder */}
        <div className="bg-white border border-warm-200 rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-warm-100 pb-2">
            <div>
              <h2 className="text-[13px] font-bold text-warm-900">Technical Specifications</h2>
              <p className="text-[10px] text-warm-500">Custom key-value pairs (e.g. Material: Organic Cotton)</p>
            </div>
            <button
              type="button"
              onClick={addSpecRow}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-warm-100 text-warm-900 text-[11px] font-semibold rounded-md hover:bg-warm-200 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Spec Row</span>
            </button>
          </div>

          {(form.specifications || []).length === 0 ? (
            <div className="text-center py-4 border-2 border-dashed border-warm-100 rounded-md text-warm-400 text-[11px]">
              No specifications added yet. Click &quot;Add Spec Row&quot; to add details like Material, Weight, Dimensions, etc.
            </div>
          ) : (
            <div className="space-y-2">
              {form.specifications.map((spec, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Label (e.g. Material)"
                    value={spec.label}
                    onChange={(e) => updateSpecRow(index, 'label', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 100% Cotton)"
                    value={spec.value}
                    onChange={(e) => updateSpecRow(index, 'value', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpecRow(index)}
                    className="p-1.5 text-warm-400 hover:text-red-600 rounded-md transition-colors"
                    title="Remove specification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Product Add-ons Builder (Part 5) */}
        <div className="bg-white border border-warm-200 rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-warm-100 pb-2">
            <div>
              <h2 className="text-[13px] font-bold text-warm-900">Product Add-ons (Optional Sub-products)</h2>
              <p className="text-[10px] text-warm-500">Configure optional add-ons like premium gift boxes, extra straps, warranty, etc.</p>
            </div>
            <button
              type="button"
              onClick={addAddonRow}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 text-brand-700 text-[11px] font-semibold rounded-md hover:bg-brand-100 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Add-on Option</span>
            </button>
          </div>

          {(form.addons || []).length === 0 ? (
            <div className="text-center py-4 border-2 border-dashed border-warm-100 rounded-md text-warm-400 text-[11px]">
              No add-ons created for this product yet. Click &quot;Add Add-on Option&quot; to offer extras at purchase time.
            </div>
          ) : (
            <div className="space-y-3">
              {form.addons.map((addon, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-warm-50/60 border border-warm-200 rounded-md text-[11px]">
                  {/* Thumbnail Uploader */}
                  <div className="shrink-0">
                    <label className="block text-[9px] font-bold text-warm-600 uppercase tracking-wider mb-1">
                      Add-on Photo
                    </label>
                    <ImageUpload
                      type="review-media"
                      images={addon.imageUrl ? [addon.imageUrl] : []}
                      onChange={(urls) => updateAddonRow(index, 'imageUrl', urls[0] || '')}
                      maxFiles={1}
                    />
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <input
                      type="text"
                      placeholder="Add-on Name (e.g. Premium Gift Box)"
                      value={addon.name || ''}
                      onChange={(e) => updateAddonRow(index, 'name', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                    />
                    <div className="flex items-center gap-3">
                      <div className="w-28">
                        <NumericInput
                          disabled={addon.isFree}
                          placeholder="Price ($)"
                          value={addon.isFree ? '0' : addon.price || ''}
                          onChange={(val) => updateAddonRow(index, 'price', val)}
                          className="w-full px-2.5 py-1 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600 disabled:bg-warm-100 disabled:text-warm-400"
                        />
                      </div>
                      <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={addon.isFree || false}
                          onChange={(e) => updateAddonRow(index, 'isFree', e.target.checked)}
                          className="accent-brand-600 w-3.5 h-3.5 rounded"
                        />
                        <span className="text-[10px] font-semibold text-warm-700">Free</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeAddonRow(index)}
                    className="p-1.5 text-warm-400 hover:text-red-600 rounded-md transition-colors self-end sm:self-center"
                    title="Remove add-on"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-1.5">
          <Link
            href="/admin/products"
            className="px-3.5 py-2 border border-warm-200 text-warm-700 text-[11px] font-semibold rounded-md hover:bg-warm-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all flex items-center gap-1.5 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{isEditing ? 'Update Product' : 'Save Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}