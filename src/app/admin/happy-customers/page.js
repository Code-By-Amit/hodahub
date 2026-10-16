'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Modal from '@/components/ui/Modal';
import ImageUpload from '@/components/ui/ImageUpload';
import { useToast } from '@/components/ui/Toast';
import NumericInput from '@/components/ui/NumericInput';
import { buildOrderPatch } from '@/lib/happy-customers';
import { ArrowDown, ArrowUp, Edit2, Eye, EyeOff, Images, Plus, Trash2 } from 'lucide-react';

export default function AdminHappyCustomersPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [form, setForm] = useState({
    imageUrl: '',
    caption: '',
    isActive: true,
    sortOrder: 0,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/happy-customers');
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to load customer screenshots');
        return;
      }
      setItems(data.happyCustomers || []);
    } catch {
      toast.error('Failed to load customer screenshots');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingItem(null);
    setForm({
      imageUrl: '',
      caption: '',
      isActive: true,
      sortOrder: items.length,
    });
    setModalOpen(true);
  }

  function handleOpenEdit(item) {
    setEditingItem(item);
    setForm({
      imageUrl: item.imageUrl || '',
      caption: item.caption || '',
      isActive: item.isActive ?? true,
      sortOrder: item.sortOrder ?? 0,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.imageUrl.trim()) {
      toast.error('Customer screenshot image is required');
      return;
    }
    if (form.caption.length > 500) {
      toast.error('Caption cannot exceed 500 characters');
      return;
    }

    setSaving(true);
    try {
      const url = editingItem ? `/api/admin/happy-customers/${editingItem.id}` : '/api/admin/happy-customers';
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(editingItem ? 'Screenshot updated!' : 'Screenshot added!');
        setModalOpen(false);
        fetchItems();
      } else {
        toast.error(data.error || 'Failed to save screenshot');
      }
    } catch {
      toast.error('Network error');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this screenshot? The stored image is removed as well.')) return;
    try {
      const res = await fetch(`/api/admin/happy-customers/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Screenshot deleted');
        fetchItems();
      } else {
        toast.error(data.error || 'Failed to delete screenshot');
      }
    } catch {
      toast.error('Error deleting screenshot');
    }
  }

  async function toggleActive(item) {
    try {
      const res = await fetch(`/api/admin/happy-customers/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Screenshot ${!item.isActive ? 'published' : 'unpublished'}`);
        fetchItems();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch {
      toast.error('Error updating status');
    }
  }

  async function persistOrder(nextItems) {
    const patch = buildOrderPatch(nextItems);
    if (patch.length === 0) return true;

    const results = await Promise.all(
      patch.map(({ id, sortOrder }) =>
        fetch(`/api/admin/happy-customers/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder }),
        })
      )
    );

    return results.every((res) => res.ok);
  }

  async function moveItem(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= items.length || savingOrder) return;

    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setSavingOrder(true);

    try {
      const ok = await persistOrder(next);
      if (!ok) {
        toast.error('Failed to save the new order');
      } else {
        toast.success('Display order updated');
      }
    } catch {
      toast.error('Error updating display order');
    } finally {
      setSavingOrder(false);
      fetchItems();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-warm-900 tracking-tight">Happy Customers</h1>
          <p className="text-[11px] text-warm-500 mt-0.5">
            Manage the customer screenshot gallery shown on the homepage.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Add Screenshot
        </button>
      </div>

      <div className="bg-white rounded-md border border-warm-200 shadow-xs overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-warm-50/70 border-b border-warm-200 text-warm-600 text-[10px] uppercase tracking-wider font-semibold">
              <th className="px-3 py-2.5 text-left">Screenshot</th>
              <th className="px-3 py-2.5 text-left">Caption</th>
              <th className="px-3 py-2.5 text-center">Order</th>
              <th className="px-3 py-2.5 text-center">Status</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-warm-400 text-[11px]">
                  Loading screenshots...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-warm-400">
                  <Images className="w-8 h-8 mx-auto text-warm-300 mb-1.5" />
                  <p className="text-[11px] font-semibold text-warm-900">No customer screenshots yet.</p>
                  <p className="text-[10px] text-warm-500 mt-0.5">
                    The homepage gallery stays hidden until you publish at least one screenshot.
                  </p>
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id} className="hover:bg-warm-50/50 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="w-16 h-24 rounded-md overflow-hidden relative border border-warm-200 bg-warm-100">
                      <Image src={item.imageUrl} alt="" fill className="object-cover" sizes="64px" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {item.caption ? (
                      <p className="text-warm-900 text-[11px] line-clamp-3 max-w-xs">{item.caption}</p>
                    ) : (
                      <span className="text-warm-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold text-warm-900 text-[11px]">{item.sortOrder}</td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => toggleActive(item)}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize inline-flex items-center gap-1 ${
                        item.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-warm-100 text-warm-500'
                      }`}
                    >
                      {item.isActive ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                      {item.isActive ? 'Published' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => moveItem(index, -1)}
                        disabled={index === 0 || savingOrder}
                        className="p-1 text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveItem(index, 1)}
                        disabled={index === items.length - 1 || savingOrder}
                        className="p-1 text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1 text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-md transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors"
                        title="Delete"
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

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Customer Screenshot' : 'Add Customer Screenshot'}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">
              Screenshot Image * (JPEG, PNG or WebP, max 5MB)
            </label>
            <ImageUpload
              uploadType="testimonial-image"
              value={form.imageUrl ? [form.imageUrl] : []}
              onChange={(urls) => setForm({ ...form, imageUrl: Array.isArray(urls) ? (urls[0] || '') : (urls || '') })}
              multiple={false}
              maxFiles={1}
              maxSizeMB={5}
              accept="image/jpeg,image/png,image/webp"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">
              Caption (Optional)
            </label>
            <textarea
              rows={3}
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              placeholder="e.g. Rahul from Delhi loved his new chronograph"
              className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all resize-none"
            />
            <p className="text-[10px] text-warm-400 mt-0.5">{form.caption.length}/500 characters</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-warm-700 uppercase mb-1">Sort Order</label>
              <NumericInput
                allowDecimals={false}
                min={0}
                value={form.sortOrder}
                onChange={(val) => setForm({ ...form, sortOrder: parseInt(val || '0', 10) })}
                className="w-full px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all font-mono"
              />
            </div>
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="accent-warm-900 w-3.5 h-3.5 rounded"
                />
                <span className="text-[11px] font-semibold text-warm-900">Published on Homepage</span>
              </label>
            </div>
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
              {saving ? 'Saving...' : editingItem ? 'Update Screenshot' : 'Add Screenshot'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
