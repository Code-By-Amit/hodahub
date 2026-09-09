'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Settings, Save, Check } from 'lucide-react';

export default function AdminSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    storeName: 'HodaHub',
    contactEmail: '',
    contactPhone: '',
    codEnabled: true,
    shippingFee: '0',
    minFreeShipping: '50',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (res.ok && data.settings) {
        setForm({
          storeName: data.settings.storeName || 'HodaHub',
          contactEmail: data.settings.contactEmail || '',
          contactPhone: data.settings.contactPhone || '',
          codEnabled: data.settings.codEnabled ?? true,
          shippingFee: data.settings.shippingFee || '0',
          minFreeShipping: data.settings.minFreeShipping || '50',
        });
      }
    } catch {}
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          shippingFee: parseFloat(form.shippingFee) || 0,
          minFreeShipping: parseFloat(form.minFreeShipping) || 0,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Store settings saved successfully!');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch {
      toast.error('Network error');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="w-5 h-5 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
        <p className="text-[11px] text-warm-500">Loading store settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-warm-900">Store Settings</h1>
          <p className="text-[11px] text-warm-500">Configure global storefront preferences & checkout defaults</p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all shadow-xs disabled:opacity-60"
        >
          {saving ? (
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: General & Contact */}
        <div className="bg-white border border-warm-200 rounded-md p-4 space-y-3 shadow-xs">
          <h2 className="text-[13px] font-bold text-warm-900 border-b border-warm-100 pb-2 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-brand-600" />
            General & Contact Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Store Name *
              </label>
              <input
                type="text"
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Customer Support Email
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                placeholder="support@hodahub.com"
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Customer Support Phone
              </label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Payments & Shipping */}
        <div className="bg-white border border-warm-200 rounded-md p-4 space-y-3 shadow-xs">
          <h2 className="text-[13px] font-bold text-warm-900 border-b border-warm-100 pb-2">
            Payment & Shipping Rules
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-2.5 p-2.5 border border-warm-200 rounded-md cursor-pointer hover:bg-warm-50/50 transition-colors">
              <input
                type="checkbox"
                checked={form.codEnabled}
                onChange={(e) => setForm({ ...form, codEnabled: e.target.checked })}
                className="w-3.5 h-3.5 accent-warm-900 rounded"
              />
              <div>
                <p className="text-[11px] font-bold text-warm-900">Enable Cash on Delivery (COD)</p>
                <p className="text-[10px] text-warm-500">
                  Allow shoppers to pay in cash upon package arrival
                </p>
              </div>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Flat Rate Shipping Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.shippingFee}
                  onChange={(e) => setForm({ ...form, shippingFee: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Minimum Order for Free Shipping ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.minFreeShipping}
                  onChange={(e) => setForm({ ...form, minFreeShipping: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save button footer */}
        <div className="flex justify-end pt-1.5">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all shadow-xs disabled:opacity-60"
          >
            {saving ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{saving ? 'Saving Settings...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}