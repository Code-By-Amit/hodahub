'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Package,
  X,
  Layers,
  ChevronDown,
  RotateCcw,
  Search,
} from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';
import CustomSelect from '@/components/ui/CustomSelect';
import NumericInput from '@/components/ui/NumericInput';
import FieldError from '@/components/ui/FieldError';
import { productSchema, productAddonSchema } from '@/lib/validations';
import { flattenZodErrors } from '@/lib/zod-utils';

export default function NewProductPage() {
  return <ProductForm />;
}

export function ProductForm({ initialData, productId }) {
  const router = useRouter();
  const toast = useToast();
  const isEditing = !!productId;

  const [categories, setCategories] = useState([]);
  const [libraryAddons, setLibraryAddons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Dropdown combobox UI state
  const [addonDropdownOpen, setAddonDropdownOpen] = useState(false);
  const [addonSearch, setAddonSearch] = useState('');
  const dropdownRef = useRef(null);

  // Inline Modal State for Creating Add-on on the fly
  const [showInlineAddonModal, setShowInlineAddonModal] = useState(false);
  const [inlineForm, setInlineForm] = useState({
    name: '',
    price: '0',
    isFree: false,
    imageUrl: '',
    isActive: true,
  });
  const [inlineErrors, setInlineErrors] = useState({});
  const [inlineSaving, setInlineSaving] = useState(false);

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
    addonLinks: [],
    productLink: '',
    isActive: true,
    codAvailable: true,
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      const initialLinks = Array.isArray(initialData.addonLinks) && initialData.addonLinks.length > 0
        ? initialData.addonLinks
        : (initialData.addonIds || []).map((id) => ({ addonId: id, priceOverride: null, isFreeOverride: null }));

      setForm((prev) => ({
        ...prev,
        ...initialData,
        addonLinks: initialLinks,
      }));
    }
  }, [initialData]);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});

    // Fetch ONLY ACTIVE library add-ons for the selection dropdown
    fetch('/api/admin/addons?active=true')
      .then((r) => r.json())
      .then((d) => setLibraryAddons(d.addons || []))
      .catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAddonDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleNameChange(name) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setForm((prev) => ({ ...prev, name, slug }));
    if (errors.name || errors.slug) {
      setErrors((prev) => ({ ...prev, name: null, slug: null }));
    }
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

  // --- Add-on Link & Override Helpers ---
  const isAddonLinked = (addonId) => {
    return (form.addonLinks || []).some((link) => link.addonId === addonId);
  };

  const toggleAddonLink = (addonId) => {
    setForm((prev) => {
      const current = prev.addonLinks || [];
      const exists = current.some((l) => l.addonId === addonId);
      if (exists) {
        return {
          ...prev,
          addonLinks: current.filter((l) => l.addonId !== addonId),
        };
      } else {
        return {
          ...prev,
          addonLinks: [...current, { addonId, priceOverride: null, isFreeOverride: null }],
        };
      }
    });
  };

  const updateAddonOverride = (addonId, field, value) => {
    setForm((prev) => {
      const current = prev.addonLinks || [];
      const updated = current.map((link) => {
        if (link.addonId === addonId) {
          return {
            ...link,
            [field]: value,
          };
        }
        return link;
      });
      return { ...prev, addonLinks: updated };
    });
  };

  const resetAddonOverride = (addonId) => {
    setForm((prev) => {
      const current = prev.addonLinks || [];
      const updated = current.map((link) => {
        if (link.addonId === addonId) {
          return {
            ...link,
            priceOverride: null,
            isFreeOverride: null,
          };
        }
        return link;
      });
      return { ...prev, addonLinks: updated };
    });
  };

  // --- Create Library Add-on Inline Modal Submit ---
  async function handleCreateInlineAddon(e) {
    e.preventDefault();
    const payload = {
      name: inlineForm.name.trim(),
      price: inlineForm.isFree ? 0 : parseFloat(inlineForm.price) || 0,
      isFree: inlineForm.isFree === true,
      imageUrl: inlineForm.imageUrl || null,
      isActive: inlineForm.isActive !== false,
    };

    const validation = productAddonSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors = flattenZodErrors(validation.error);
      setInlineErrors(fieldErrors);
      toast.error(validation.error.issues?.[0]?.message || 'Please fix add-on errors');
      return;
    }
    setInlineErrors({});
    setInlineSaving(true);

    try {
      const res = await fetch('/api/admin/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.addon) {
        toast.success(`Add-on "${data.addon.name}" created and added to library!`);
        
        // Add to active library list state
        if (data.addon.isActive) {
          setLibraryAddons((prev) => [data.addon, ...prev]);
        }
        
        // Automatically link to current product
        setForm((prev) => ({
          ...prev,
          addonLinks: [
            ...(prev.addonLinks || []),
            { addonId: data.addon.id, priceOverride: null, isFreeOverride: null },
          ],
        }));

        // Reset modal state
        setInlineForm({ name: '', price: '0', isFree: false, imageUrl: '', isActive: true });
        setShowInlineAddonModal(false);
      } else {
        if (data.errors) setInlineErrors(data.errors);
        toast.error(data.error || 'Failed to create add-on');
      }
    } catch {
      toast.error('Network error creating add-on');
    }
    setInlineSaving(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Clean spec rows
    const cleanSpecs = (form.specifications || []).filter(
      (s) => s.label.trim() !== '' && s.value.trim() !== ''
    );

    // Clean addon links
    const cleanAddonLinks = (form.addonLinks || []).map((link) => ({
      addonId: link.addonId,
      priceOverride: link.isFreeOverride === true ? null : (link.priceOverride !== null && link.priceOverride !== '' ? parseFloat(link.priceOverride) : null),
      isFreeOverride: link.isFreeOverride === true ? true : (link.isFreeOverride === false ? false : null),
    }));

    const payload = {
      ...form,
      price: form.price ? parseFloat(form.price) : 0,
      discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : null,
      stock: form.stock !== '' ? parseInt(form.stock, 10) : 0,
      categoryId: form.categoryId,
      specifications: cleanSpecs,
      addonLinks: cleanAddonLinks,
      addonIds: cleanAddonLinks.map((l) => l.addonId),
    };

    const validation = productSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors = flattenZodErrors(validation.error);
      setErrors(fieldErrors);
      toast.error(validation.error.issues?.[0]?.message || 'Please fix product validation errors');
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const url = isEditing ? `/api/admin/products/${productId}` : '/api/admin/products';
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(isEditing ? 'Product updated successfully!' : 'Product created successfully!');
        router.push('/admin/products');
      } else {
        if (data.errors) setErrors(data.errors);
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

  const filteredLibraryAddons = libraryAddons.filter((a) =>
    a.name.toLowerCase().includes(addonSearch.toLowerCase())
  );

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
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                  errors.name ? 'border-red-500' : 'border-warm-200 focus:border-brand-600'
                }`}
                placeholder="e.g. Minimalist Leather Watch"
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
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 font-mono focus:outline-none ${
                  errors.slug ? 'border-red-500' : 'border-warm-200 focus:border-brand-600'
                }`}
                placeholder="minimalist-leather-watch"
              />
              <FieldError message={errors.slug} />
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
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                  errors.price ? 'border-red-500' : 'border-warm-200 focus:border-brand-600'
                }`}
                placeholder="99.99"
              />
              <FieldError message={errors.price} />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Sale Price ($)
              </label>
              <NumericInput
                value={form.discountPrice || ''}
                onChange={(val) => setForm({ ...form, discountPrice: val })}
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                  errors.discountPrice ? 'border-red-500' : 'border-warm-200 focus:border-brand-600'
                }`}
                placeholder="79.99"
              />
              <FieldError message={errors.discountPrice} />
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
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                  errors.stock ? 'border-red-500' : 'border-warm-200 focus:border-brand-600'
                }`}
              />
              <FieldError message={errors.stock} />
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
              <FieldError message={errors.categoryId} />
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

        {/* Section 5: Reusable Add-on Library Multi-Select & Custom Pricing Overrides */}
        <div className="bg-white border border-warm-200 rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-warm-100 pb-2">
            <div>
              <h2 className="text-[13px] font-bold text-warm-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-600" />
                Product Add-ons (Optional Sub-products)
              </h2>
              <p className="text-[10px] text-warm-500">
                Select add-ons from your library and optionally override price/free status for this specific product.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowInlineAddonModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-50 text-brand-700 text-[11px] font-semibold rounded-md hover:bg-brand-100 transition-colors shrink-0"
            >
              <Plus className="w-3 h-3" />
              <span>+ Create New Add-on</span>
            </button>
          </div>

          {/* Part B Multi-Select Combobox Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-[10px] font-semibold text-warm-700 mb-1">
              Select Add-ons from Library
            </label>
            <button
              type="button"
              onClick={() => setAddonDropdownOpen(!addonDropdownOpen)}
              className="w-full px-3 py-2 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 flex items-center justify-between text-left focus:outline-none focus:border-brand-600 shadow-2xs"
            >
              <span className="truncate text-warm-700">
                {(form.addonLinks || []).length === 0
                  ? 'Click to select add-ons from library...'
                  : `${form.addonLinks.length} Add-on${form.addonLinks.length > 1 ? 's' : ''} Linked`}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-warm-400 transition-transform ${addonDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Options Popup */}
            {addonDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-warm-200 rounded-md shadow-lg z-30 p-2 space-y-2 max-h-64 overflow-y-auto">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-warm-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={addonSearch}
                    onChange={(e) => setAddonSearch(e.target.value)}
                    placeholder="Search active add-ons..."
                    className="w-full pl-8 pr-2.5 py-1 bg-warm-50 border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                  />
                </div>

                {/* Options List */}
                {filteredLibraryAddons.length === 0 ? (
                  <div className="p-3 text-center text-warm-400 text-[10px]">
                    No active add-ons found in library matching &quot;{addonSearch}&quot;
                  </div>
                ) : (
                  filteredLibraryAddons.map((addon) => {
                    const isSelected = isAddonLinked(addon.id);
                    return (
                      <div
                        key={addon.id}
                        onClick={() => toggleAddonLink(addon.id)}
                        className={`flex items-center justify-between p-2 rounded-md border cursor-pointer select-none transition-all text-[11px] ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50/40 font-semibold'
                            : 'border-warm-100 bg-white hover:bg-warm-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="accent-brand-600 w-3.5 h-3.5 rounded shrink-0"
                          />
                          {addon.imageUrl ? (
                            <img
                              src={addon.imageUrl}
                              alt=""
                              className="w-7 h-7 rounded object-cover border border-warm-200 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded bg-warm-100 border border-warm-200 flex items-center justify-center text-warm-400 shrink-0">
                              <Package className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span className="text-warm-900 truncate">{addon.name}</span>
                        </div>

                        <span className="font-bold text-brand-700 shrink-0 ml-2">
                          {addon.isFree ? 'Free' : `₹${addon.price}`}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Linked Add-on Rows with Custom Overrides */}
          {(form.addonLinks || []).length === 0 ? (
            <div className="text-center py-5 border-2 border-dashed border-warm-100 rounded-md text-warm-400 text-[11px] space-y-1">
              <p>No add-ons linked to this product yet.</p>
              <p className="text-[10px]">
                Use the dropdown above to select existing library add-ons or click &quot;+ Create New Add-on&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              <span className="block text-[10px] font-bold text-warm-900 uppercase tracking-wider">
                Linked Add-ons & Custom Pricing Overrides ({form.addonLinks.length})
              </span>

              {form.addonLinks.map((link) => {
                const libAddon = libraryAddons.find((a) => a.id === link.addonId) || {
                  id: link.addonId,
                  name: link.name || 'Library Add-on',
                  price: link.defaultPrice || '0.00',
                  isFree: link.defaultIsFree || false,
                  imageUrl: link.imageUrl || null,
                };

                const isFreeEffective = link.isFreeOverride === true || (link.isFreeOverride === null && libAddon.isFree);
                const currentPriceVal = link.priceOverride !== null && link.priceOverride !== undefined ? link.priceOverride : libAddon.price;
                const hasOverride = link.priceOverride !== null || link.isFreeOverride !== null;

                return (
                  <div
                    key={link.addonId}
                    className="p-3 bg-warm-50/70 border border-warm-200 rounded-md space-y-2 text-[11px]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-warm-200/60 pb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {libAddon.imageUrl ? (
                          <img
                            src={libAddon.imageUrl}
                            alt=""
                            className="w-8 h-8 rounded object-cover border border-warm-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-warm-100 border border-warm-200 flex items-center justify-center text-warm-400 shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-warm-900 truncate">{libAddon.name}</p>
                          <p className="text-[9px] text-warm-500">
                            Library Default:{' '}
                            <span className="font-semibold">
                              {libAddon.isFree ? 'Free' : `₹${libAddon.price}`}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {hasOverride && (
                          <button
                            type="button"
                            onClick={() => resetAddonOverride(link.addonId)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-warm-300 text-warm-600 hover:text-warm-900 text-[9px] font-semibold rounded transition-colors"
                            title="Reset to library default"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Reset to Default</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleAddonLink(link.addonId)}
                          className="p-1 text-warm-400 hover:text-red-600 rounded transition-colors"
                          title="Unlink from product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Override Inputs */}
                    <div className="flex flex-wrap items-center gap-4 pt-0.5">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-semibold text-warm-700">
                          Price for this product (₹):
                        </label>
                        <div className="w-28">
                          <NumericInput
                            disabled={isFreeEffective}
                            placeholder={`(default: ₹${libAddon.price})`}
                            value={isFreeEffective ? '0' : currentPriceVal}
                            onChange={(val) => {
                              // If value matches library default or empty, clear override
                              if (val === '' || parseFloat(val) === parseFloat(libAddon.price)) {
                                updateAddonOverride(link.addonId, 'priceOverride', null);
                              } else {
                                updateAddonOverride(link.addonId, 'priceOverride', val);
                              }
                            }}
                            className="w-full px-2 py-1 bg-white border border-warm-200 rounded text-[11px] text-warm-900 focus:outline-none focus:border-brand-600 disabled:bg-warm-100 disabled:text-warm-400"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={link.isFreeOverride === true}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            updateAddonOverride(
                              link.addonId,
                              'isFreeOverride',
                              checked ? true : (libAddon.isFree ? null : false)
                            );
                          }}
                          className="accent-brand-600 w-3.5 h-3.5 rounded"
                        />
                        <span className="text-[10px] font-semibold text-warm-800">
                          Free for this product
                        </span>
                      </label>

                      {hasOverride && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          Custom Override Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
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

      {/* Part A Inline Modal: Create New Add-on on the fly */}
      {showInlineAddonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleCreateInlineAddon}
            className="w-full max-w-md bg-white border border-warm-200 rounded-md shadow-xl p-4 space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-warm-100 pb-2">
              <h3 className="font-bold text-warm-900 text-[13px]">Create New Add-on for Library</h3>
              <button
                type="button"
                onClick={() => setShowInlineAddonModal(false)}
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
                value={inlineForm.name}
                onChange={(e) => {
                  setInlineForm({ ...inlineForm, name: e.target.value });
                  if (inlineErrors.name) setInlineErrors({ ...inlineErrors, name: null });
                }}
                placeholder="e.g. Rolex OG Gift Box"
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                  inlineErrors.name ? 'border-red-500' : 'border-warm-200 focus:border-brand-600'
                }`}
              />
              <FieldError message={inlineErrors.name} />
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Price (₹)
                </label>
                <NumericInput
                  disabled={inlineForm.isFree}
                  value={inlineForm.isFree ? '0' : inlineForm.price}
                  onChange={(val) => {
                    setInlineForm({ ...inlineForm, price: val });
                    if (inlineErrors.price) setInlineErrors({ ...inlineErrors, price: null });
                  }}
                  placeholder="900"
                  className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                    inlineErrors.price ? 'border-red-500' : 'border-warm-200 focus:border-brand-600'
                  }`}
                />
                <FieldError message={inlineErrors.price} />
              </div>

              <div className="pb-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inlineForm.isFree}
                    onChange={(e) =>
                      setInlineForm({
                        ...inlineForm,
                        isFree: e.target.checked,
                        price: e.target.checked ? '0' : inlineForm.price,
                      })
                    }
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
                value={inlineForm.imageUrl ? [inlineForm.imageUrl] : []}
                onChange={(urls) => setInlineForm({ ...inlineForm, imageUrl: Array.isArray(urls) ? urls[0] || '' : urls })}
                multiple={false}
                label="Add-on Photo / Thumbnail"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inlineForm.isActive}
                  onChange={(e) => setInlineForm({ ...inlineForm, isActive: e.target.checked })}
                  className="accent-warm-900 w-3.5 h-3.5 rounded"
                />
                <span className="text-[11px] font-medium text-warm-800">
                  Active (selectable when linking to products)
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-warm-100">
              <button
                type="button"
                onClick={() => setShowInlineAddonModal(false)}
                className="px-3 py-1.5 border border-warm-200 text-warm-700 text-[11px] font-semibold rounded-md hover:bg-warm-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inlineSaving}
                className="px-3.5 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all flex items-center gap-1.5 disabled:opacity-60"
              >
                {inlineSaving ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Save & Auto-Link Add-on</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}