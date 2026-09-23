'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Settings, Save, Check, MapPin, Clock, Share2 } from 'lucide-react';
import NumericInput from '@/components/ui/NumericInput';
import PhoneInput from '@/components/ui/PhoneInput';
import FieldError from '@/components/ui/FieldError';
import { storeSettingsSchema } from '@/lib/validations';
import { useZodForm } from '@/hooks/useZodForm';

export default function AdminSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { values: form, setValues: setForm, errors, handleChange, validate, setServerErrors } = useZodForm(
    {
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
      maxOtpRequestsPerDay: '4',
      otpResendCooldownSeconds: '45',
    },
    storeSettingsSchema
  );

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
          shippingFee: String(data.settings.shippingFee ?? '0'),
          minFreeShipping: String(data.settings.minFreeShipping ?? '50'),
          codAdvanceAmount: String(data.settings.codAdvanceAmount ?? '99'),
          orderExpirationMinutes: String(data.settings.orderExpirationMinutes || 15),
          maxOtpRequestsPerDay: String(data.settings.maxOtpRequestsPerDay || 4),
          otpResendCooldownSeconds: String(data.settings.otpResendCooldownSeconds || 45),
        });
      }
    } catch {}
    setLoading(false);
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();

    const payloadToValidate = {
      ...form,
      shippingFee: parseFloat(form.shippingFee) || 0,
      minFreeShipping: parseFloat(form.minFreeShipping) || 0,
      codAdvanceAmount: parseFloat(form.codAdvanceAmount) || 0,
      orderExpirationMinutes: parseInt(form.orderExpirationMinutes) || 15,
      maxOtpRequestsPerDay: parseInt(form.maxOtpRequestsPerDay) || 4,
      otpResendCooldownSeconds: parseInt(form.otpResendCooldownSeconds) || 45,
    };

    const clientCheck = storeSettingsSchema.safeParse(payloadToValidate);
    if (!clientCheck.success) {
      validate();
      toast.error('Please fix validation errors before saving');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadToValidate),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Store settings saved successfully!');
      } else {
        setServerErrors(data);
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
                onChange={(e) => handleChange('storeName', e.target.value)}
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                  errors.storeName ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                }`}
                required
              />
              <FieldError message={errors.storeName} />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Customer Support Email
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                placeholder="e.g. support@yourdomain.com"
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                  errors.contactEmail ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                }`}
              />
              <FieldError message={errors.contactEmail} />
            </div>

            <div>
              <PhoneInput
                label="Customer Support Phone"
                value={form.contactPhone}
                onChange={(val) => handleChange('contactPhone', val)}
                error={errors.contactPhone}
              />
            </div>

            <div>
              <PhoneInput
                label="WhatsApp Contact Number"
                value={form.whatsappNumber}
                onChange={(val) => handleChange('whatsappNumber', val)}
                error={errors.whatsappNumber}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-warm-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-warm-500" />
                Physical / Business Address
              </label>
              <textarea
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={2}
                placeholder="e.g. Plot 45, Sector 18, Gurugram, Haryana - 122015"
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none resize-none ${
                  errors.address ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                }`}
              />
              <FieldError message={errors.address} />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-warm-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-warm-500" />
                Business Operating Hours
              </label>
              <input
                type="text"
                value={form.businessHours}
                onChange={(e) => handleChange('businessHours', e.target.value)}
                placeholder="e.g. Mon - Sat: 9:00 AM - 6:00 PM IST"
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                  errors.businessHours ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                }`}
              />
              <FieldError message={errors.businessHours} />
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
                onChange={(e) => handleChange('instagramUrl', e.target.value)}
                placeholder="https://instagram.com/hodahub"
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                  errors.instagramUrl ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                }`}
              />
              <FieldError message={errors.instagramUrl} />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Facebook URL
              </label>
              <input
                type="url"
                value={form.facebookUrl}
                onChange={(e) => handleChange('facebookUrl', e.target.value)}
                placeholder="https://facebook.com/hodahub"
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                  errors.facebookUrl ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                }`}
              />
              <FieldError message={errors.facebookUrl} />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Twitter / X URL
              </label>
              <input
                type="url"
                value={form.twitterUrl}
                onChange={(e) => handleChange('twitterUrl', e.target.value)}
                placeholder="https://twitter.com/hodahub"
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                  errors.twitterUrl ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                }`}
              />
              <FieldError message={errors.twitterUrl} />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                YouTube URL
              </label>
              <input
                type="url"
                value={form.youtubeUrl}
                onChange={(e) => handleChange('youtubeUrl', e.target.value)}
                placeholder="https://youtube.com/@hodahub"
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                  errors.youtubeUrl ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                }`}
              />
              <FieldError message={errors.youtubeUrl} />
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
                onChange={(e) => handleChange('codEnabled', e.target.checked)}
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
                  onChange={(val) => handleChange('shippingFee', val)}
                  className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                    errors.shippingFee ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                  }`}
                />
                <FieldError message={errors.shippingFee} />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Min Order for Free Shipping (₹)
                </label>
                <NumericInput
                  value={form.minFreeShipping}
                  onChange={(val) => handleChange('minFreeShipping', val)}
                  className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                    errors.minFreeShipping ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                  }`}
                />
                <FieldError message={errors.minFreeShipping} />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  COD Advance Payment (₹)
                </label>
                <NumericInput
                  value={form.codAdvanceAmount}
                  onChange={(val) => handleChange('codAdvanceAmount', val)}
                  className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none ${
                    errors.codAdvanceAmount ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                  }`}
                />
                <FieldError message={errors.codAdvanceAmount} />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                  Abandoned Order Expiration (Minutes)
                </label>
                <NumericInput
                  allowDecimals={false}
                  min={1}
                  value={form.orderExpirationMinutes}
                  onChange={(val) => handleChange('orderExpirationMinutes', val)}
                  placeholder="15"
                  className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none font-mono ${
                    errors.orderExpirationMinutes ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                  }`}
                />
                <FieldError message={errors.orderExpirationMinutes} />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Mobile OTP Rate Limiting & Security Rules */}
        <div className="bg-white border border-warm-200 rounded-md p-4 space-y-3 shadow-xs">
          <h2 className="text-[13px] font-bold text-warm-900 border-b border-warm-100 pb-2 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-brand-600" />
            Mobile + OTP Authentication Security & Rate Limits
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                Max OTP Requests Per Mobile (Per Day)
              </label>
              <NumericInput
                allowDecimals={false}
                min={1}
                max={50}
                value={form.maxOtpRequestsPerDay}
                onChange={(val) => handleChange('maxOtpRequestsPerDay', val)}
                placeholder="4"
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none font-mono ${
                  errors.maxOtpRequestsPerDay ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                }`}
              />
              <p className="text-[9px] text-warm-500 mt-1">Default: 4 requests/day</p>
              <FieldError message={errors.maxOtpRequestsPerDay} />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 mb-1">
                OTP Resend Cooldown (Seconds)
              </label>
              <NumericInput
                allowDecimals={false}
                min={5}
                max={600}
                value={form.otpResendCooldownSeconds}
                onChange={(val) => handleChange('otpResendCooldownSeconds', val)}
                placeholder="45"
                className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none font-mono ${
                  errors.otpResendCooldownSeconds ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-brand-600'
                }`}
              />
              <p className="text-[9px] text-warm-500 mt-1">Default: 45 seconds</p>
              <FieldError message={errors.otpResendCooldownSeconds} />
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