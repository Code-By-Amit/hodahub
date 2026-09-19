'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import { Plus, Edit2, Trash2, X, Check, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import NumericInput from '@/components/ui/NumericInput';
import CustomSelect from '@/components/ui/CustomSelect';
import FieldError from '@/components/ui/FieldError';
import { couponSchema } from '@/lib/validations';
import { flattenZodErrors } from '@/lib/zod-utils';

export default function AdminCouponsPage() {
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    code: '',
    type: 'percent',
    value: '',
    minOrderAmount: '',
    expiresAt: '',
    isActive: true,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCoupons();
  }, [pagination.page]);

  async function fetchCoupons() {
    try {
      const res = await fetch(`/api/admin/coupons?page=${pagination.page}`);
      const data = await res.json();
      setCoupons(data.coupons || []);
      setPagination(data.pagination || pagination);
    } catch {}
    setLoading(false);
  }

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      minOrderAmount: c.minOrderAmount || '',
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : '',
      isActive: c.isActive,
    });
    setErrors({});
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      code: '',
      type: 'percent',
      value: '',
      minOrderAmount: '',
      expiresAt: '',
      isActive: true,
    });
    setErrors({});
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      value: form.value ? parseFloat(form.value) : 0,
      minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : 0,
      expiresAt: form.expiresAt || null,
    };

    const validation = couponSchema.safeParse(payload);
    if (!validation.success) {
      const fieldErrors = flattenZodErrors(validation.error);
      setErrors(fieldErrors);
      toast.error(validation.error.issues?.[0]?.message || 'Please fix coupon errors');
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/coupons/${editingId}` : '/api/admin/coupons';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(editingId ? 'Coupon updated!' : 'Coupon created!');
        resetForm();
        fetchCoupons();
      } else {
        if (data.errors) setErrors(data.errors);
        toast.error(data.error || 'Failed to save coupon');
      }
    } catch {
      toast.error('Network error');
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this coupon?')) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Coupon deleted');
        fetchCoupons();
      } else toast.error('Failed to delete coupon');
    } catch {
      toast.error('Error deleting coupon');
    }
  }

  const typeOptions = [
    { value: 'percent', label: 'Percentage Discount (%)' },
    { value: 'flat', label: 'Flat Amount Discount (₹)' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-warm-900">Discount Coupons</h1>
          <p className="text-[11px] text-warm-500">Create & manage promotional discount codes</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Coupon</span>
        </button>
      </div>

      {/* Centered Coupon Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-white border border-warm-200 rounded-md shadow-xl p-4 space-y-3 animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-warm-100 pb-2">
              <h3 className="font-bold text-warm-900 text-[13px]">
                {editingId ? 'Edit Coupon' : 'Create New Coupon'}
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
                  Coupon Code *
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SUMMER20"
                  className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 font-mono focus:outline-none uppercase ${
                    errors.code ? 'border-red-500' : 'border-warm-200 focus:border-brand-600'
                  }`}
                />
                <FieldError message={errors.code} />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Discount Type
                </label>
                <CustomSelect
                  options={typeOptions}
                  value={form.type}
                  onChange={(val) => setForm({ ...form, type: val })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Discount Value ({form.type === 'percent' ? '%' : '₹'}) *
                </label>
                <NumericInput
                  value={form.value}
                  onChange={(val) => setForm({ ...form, value: val })}
                  placeholder={form.type === 'percent' ? '20' : '15.00'}
                  className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                    errors.value ? 'border-red-500' : 'border-warm-200 focus:border-brand-600'
                  }`}
                />
                <FieldError message={errors.value} />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Min Order Amount (₹)
                </label>
                <NumericInput
                  value={form.minOrderAmount}
                  onChange={(val) => setForm({ ...form, minOrderAmount: val })}
                  placeholder="0.00"
                  className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                    errors.minOrderAmount ? 'border-red-500' : 'border-warm-200 focus:border-brand-600'
                  }`}
                />
                <FieldError message={errors.minOrderAmount} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div className="pt-3 sm:pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="accent-warm-900 w-3.5 h-3.5 rounded"
                  />
                  <span className="text-[11px] font-semibold text-warm-800">
                    Active (usable by customers)
                  </span>
                </label>
              </div>
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
                <span>{editingId ? 'Update Coupon' : 'Save Coupon'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Coupon List Table */}
      <div className="bg-white rounded-md border border-warm-200 overflow-x-auto shadow-xs">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-warm-50/80 text-warm-600 text-[10px] font-semibold border-b border-warm-200">
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Discount Type</th>
              <th className="px-3 py-2 text-left">Value</th>
              <th className="px-3 py-2 text-left">Min. Order</th>
              <th className="px-3 py-2 text-left">Expiration</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-warm-400">
                  Loading coupons...
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-warm-400">
                  No coupons found. Click &quot;Add Coupon&quot; to create one.
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="hover:bg-warm-50/50 transition-colors">
                  <td className="px-3 py-2 font-mono font-bold text-warm-900">{c.code}</td>
                  <td className="px-3 py-2 text-warm-600 capitalize">{c.type}</td>
                  <td className="px-3 py-2 font-semibold text-warm-900">
                    {c.type === 'percent' ? `${c.value}%` : formatCurrency(c.value)}
                  </td>
                  <td className="px-3 py-2 text-warm-500">
                    {c.minOrderAmount ? formatCurrency(c.minOrderAmount) : '—'}
                  </td>
                  <td className="px-3 py-2 text-warm-500">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-3 py-2">
                    {c.isActive ? (
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-md border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-warm-100 text-warm-500 text-[10px] font-medium rounded-md">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(c)}
                        className="p-1 text-warm-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                        title="Edit coupon"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1 text-warm-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete coupon"
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

      {pagination.totalPages > 1 && (
        <div className="mt-3">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPagination({ ...pagination, page: p })}
          />
        </div>
      )}
    </div>
  );
}