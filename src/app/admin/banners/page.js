'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import ImageUpload from '@/components/ui/ImageUpload';
import { useToast } from '@/components/ui/Toast';
import { Plus, Edit2, Trash2, Eye, EyeOff, Layers, ExternalLink } from 'lucide-react';

const PRESET_COLORS = [
  { label: 'Dark Neutral', value: '#18181b' },
  { label: 'Slate Dark', value: '#0f172a' },
  { label: 'Indigo Deep', value: '#1e1b4b' },
  { label: 'Emerald Dark', value: '#064e3b' },
  { label: 'Rose Wine', value: '#4c0519' },
  { label: 'Warm Bronze', value: '#451a03' },
];

export default function AdminBannersPage() {
  const toast = useToast();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    bgColor: '#18181b',
    linkUrl: '',
    isActive: true,
    sortOrder: 0,
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  async function fetchBanners() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/banners');
      const data = await res.json();
      setBanners(data.banners || []);
    } catch {
      toast.error('Failed to load banners');
    }
    setLoading(false);
  }

  function handleOpenCreate() {
    setEditingBanner(null);
    setForm({
      title: '',
      subtitle: '',
      imageUrl: '',
      bgColor: '#18181b',
      linkUrl: '/products',
      isActive: true,
      sortOrder: banners.length,
    });
    setModalOpen(true);
  }

  function handleOpenEdit(b) {
    setEditingBanner(b);
    setForm({
      title: b.title || '',
      subtitle: b.subtitle || '',
      imageUrl: b.imageUrl || '',
      bgColor: b.bgColor || '#18181b',
      linkUrl: b.linkUrl || '',
      isActive: b.isActive ?? true,
      sortOrder: b.sortOrder ?? 0,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.imageUrl && !form.title.trim()) {
      toast.error('Banner image or title is required');
      return;
    }
    setSaving(true);
    try {
      const url = editingBanner ? `/api/admin/banners/${editingBanner.id}` : '/api/admin/banners';
      const method = editingBanner ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(editingBanner ? 'Banner updated!' : 'Banner created!');
        setModalOpen(false);
        fetchBanners();
      } else {
        toast.error(data.error || 'Failed to save banner');
      }
    } catch {
      toast.error('Network error');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      const res = await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Banner deleted');
        fetchBanners();
      } else {
        toast.error('Failed to delete banner');
      }
    } catch {
      toast.error('Error deleting banner');
    }
  }

  async function toggleActive(b) {
    try {
      const res = await fetch(`/api/admin/banners/${b.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...b, isActive: !b.isActive }),
      });
      if (res.ok) {
        toast.success(`Banner ${!b.isActive ? 'activated' : 'deactivated'}`);
        fetchBanners();
      }
    } catch {
      toast.error('Error toggling banner status');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-warm-900 tracking-tight">Promotional Banners</h1>
          <p className="text-[11px] text-warm-500 mt-0.5">Manage real storefront carousel banners and promotional slides.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Add New Banner
        </button>
      </div>

      <div className="bg-white rounded-md border border-warm-200 shadow-xs overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-warm-50/70 border-b border-warm-200 text-warm-600 text-[10px] uppercase tracking-wider font-semibold">
              <th className="px-3 py-2.5 text-left">Banner Preview</th>
              <th className="px-3 py-2.5 text-left">Title & Subtitle</th>
              <th className="px-3 py-2.5 text-left">Link</th>
              <th className="px-3 py-2.5 text-center">Order</th>
              <th className="px-3 py-2.5 text-center">Status</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {loading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-warm-400 text-[11px]">Loading banners...</td></tr>
            ) : banners.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-warm-400">
                  <Layers className="w-8 h-8 mx-auto text-warm-300 mb-1.5" />
                  <p className="text-[11px] font-semibold text-warm-900">No promotional banners created yet.</p>
                  <p className="text-[10px] text-warm-500 mt-0.5">Click "Add New Banner" above to publish your first banner.</p>
                </td>
              </tr>
            ) : banners.map((b) => (
              <tr key={b.id} className="hover:bg-warm-50/50 transition-colors">
                <td className="px-3 py-2.5">
                  <div
                    className="w-24 h-11 rounded-md overflow-hidden relative flex items-center justify-center border border-warm-200 p-1.5 text-white text-[9px] font-bold text-center"
                    style={{ backgroundColor: b.bgColor || '#18181b' }}
                  >
                    {b.imageUrl ? (
                      <Image src={b.imageUrl} alt="" fill className="object-cover opacity-80" sizes="96px" />
                    ) : (
                      <span className="line-clamp-2 leading-tight">{b.title}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div>
                    <p className="font-semibold text-warm-900 text-[11px]">{b.title}</p>
                    {b.subtitle && <p className="text-warm-500 text-[10px] line-clamp-1 mt-0.5">{b.subtitle}</p>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[11px] text-warm-600 font-mono">
                  {b.linkUrl ? (
                    <a href={b.linkUrl} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                      {b.linkUrl} <ExternalLink className="w-2.5 h-2.5 text-warm-400" />
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2.5 text-center font-bold text-warm-900 text-[11px]">{b.sortOrder}</td>
                <td className="px-3 py-2.5 text-center">
                  <button
                    onClick={() => toggleActive(b)}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize inline-flex items-center gap-1 ${
                      b.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-warm-100 text-warm-500'
                    }`}
                  >
                    {b.isActive ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                    {b.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="p-1 text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-md transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Banner Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBanner ? 'Edit Promotional Banner' : 'Create Promotional Banner'}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">
              Banner Title (Optional)
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Summer Fashion Sale — Up to 40% Off"
              className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">
              Subtitle / Tagline (Optional)
            </label>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="e.g. Discover exclusive deals on apparel and accessories"
              className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">
              Banner Background Color
            </label>
            <div className="flex items-center gap-1.5 mb-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm({ ...form, bgColor: c.value })}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    form.bgColor === c.value ? 'border-warm-900 scale-110 shadow-xs' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
              <input
                type="color"
                value={form.bgColor}
                onChange={(e) => setForm({ ...form, bgColor: e.target.value })}
                className="w-7 h-7 rounded-md cursor-pointer border border-warm-200 p-0"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">
              Banner Image *
            </label>
            <ImageUpload
              uploadType="product-image"
              value={form.imageUrl ? [form.imageUrl] : []}
              onChange={(urls) => setForm({ ...form, imageUrl: urls[0] || '' })}
              maxFiles={1}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">
                Link URL
              </label>
              <input
                type="text"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="/products?sort=best-sellers"
                className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value || '0') })}
                className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1.5">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="accent-warm-900 w-3.5 h-3.5 rounded"
            />
            <label htmlFor="isActive" className="text-[11px] font-semibold text-warm-900 cursor-pointer">
              Active on Storefront Homepage
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-warm-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-3 py-1.5 border border-warm-200 text-[11px] font-semibold rounded-md text-warm-700 hover:bg-warm-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingBanner ? 'Update Banner' : 'Create Banner'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}