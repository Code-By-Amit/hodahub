'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Settings, Save, Check, MapPin, Clock, Share2 } from 'lucide-react';
import NumericInput from '@/components/ui/NumericInput';

export default function AdminSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    storeName: 'HodaHub',
    contactEmail: '',
    contactPhone: '',
    whatsappNumber: '',
    address: '',
    businessHours: '',
    instagramUrl: '',
    facebookUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
    codEnabled: true,
    shippingFee: '0',
    minFreeShipping: '50',
    codAdvanceAmount: '99',
    orderExpirationMinutes: '15',
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
          whatsappNumber: data.settings.whatsappNumber || '',
          address: data.settings.address || '',
          businessHours: data.settings.businessHours || '',
          instagramUrl: data.settings.instagramUrl || '',
          facebookUrl: data.settings.facebookUrl || '',
          twitterUrl: data.settings.twitterUrl || '',
          youtubeUrl: data.settings.youtubeUrl || '',
          codEnabled: data.settings.codEnabled ?? true,
          shippingFee: data.settings.shippingFee || '0',
          minFreeShipping: data.settings.minFreeShipping || '50',
          codAdvanceAmount: data.settings.codAdvanceAmount || '99',
          orderExpirationMinutes: String(data.settings.orderExpirationMinutes || 15),
        });
      }
    } catch {}
    setLoading(false);
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          shippingFee: parseFloat(form.shippingFee) || 0,
          minFreeShipping: parseFloat(form.minFreeShipping) || 0,
          codAdvanceAmount: parseFloat(form.codAdvanceAmount) || 0,
          orderExpirationMinutes: parseInt(form.orderExpirationMinutes) || 15,
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
          <p className="text-[11px] text-warm-500">Configure global storefront details, contact info & checkout defaults</p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
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
        {/* Section 1: General & Contact Information */}
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
                placeholder="e.g. support@yourdomain.com"
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Customer Support Phone
              </label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                WhatsApp Contact Number (with country code, e.g. 919876543210)
              </label>
              <input
                type="text"
                value={form.whatsappNumber}
                onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                placeholder="e.g. 919876543210"
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-warm-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-warm-500" />
                Physical / Business Address
              </label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
                placeholder="e.g. Plot 45, Sector 18, Gurugram, Haryana - 122015"
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600 resize-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-warm-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-warm-500" />
                Business Operating Hours
              </label>
              <input
                type="text"
                value={form.businessHours}
                onChange={(e) => setForm({ ...form, businessHours: e.target.value })}
                placeholder="e.g. Mon - Sat: 9:00 AM - 6:00 PM IST"
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Social Media Links */}
        <div className="bg-white border border-warm-200 rounded-md p-4 space-y-3 shadow-xs">
          <h2 className="text-[13px] font-bold text-warm-900 border-b border-warm-100 pb-2 flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-brand-600" />
            Social Media Links (Displayed in Footer)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Instagram URL
              </label>
              <input
                type="url"
                value={form.instagramUrl}
                onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
                placeholder="https://instagram.com/hodahub"
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Facebook URL
              </label>
              <input
                type="url"
                value={form.facebookUrl}
                onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })}
                placeholder="https://facebook.com/hodahub"
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Twitter / X URL
              </label>
              <input
                type="url"
                value={form.twitterUrl}
                onChange={(e) => setForm({ ...form, twitterUrl: e.target.value })}
                placeholder="https://twitter.com/hodahub"
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                YouTube URL
              </label>
              <input
                type="url"
                value={form.youtubeUrl}
                onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                placeholder="https://youtube.com/@hodahub"
                className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Payments & Shipping */}
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
                  Allow shoppers to select COD with upfront token advance payment
                </p>
              </div>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Flat Rate Shipping Fee (₹)
                </label>
                <NumericInput
                  value={form.shippingFee}
                  onChange={(val) => setForm({ ...form, shippingFee: val })}
                  className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Min Order for Free Shipping (₹)
                </label>
                <NumericInput
                  value={form.minFreeShipping}
                  onChange={(val) => setForm({ ...form, minFreeShipping: val })}
                  className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  COD Advance Payment (₹)
                </label>
                <NumericInput
                  value={form.codAdvanceAmount}
                  onChange={(val) => setForm({ ...form, codAdvanceAmount: val })}
                  className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Abandoned Order Expiration (Minutes)
                </label>
                <NumericInput
                  allowDecimals={false}
                  min={1}
                  value={form.orderExpirationMinutes}
                  onChange={(val) => setForm({ ...form, orderExpirationMinutes: val })}
                  placeholder="15"
                  className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600 font-mono"
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
            className="flex items-center gap-1.5 px-4 py-2 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
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