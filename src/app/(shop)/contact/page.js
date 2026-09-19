'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import FieldError from '@/components/ui/FieldError';
import { contactSchema } from '@/lib/validations';
import { useZodForm } from '@/hooks/useZodForm';
import { FiMail, FiUser, FiSend, FiPhone, FiMapPin, FiClock } from 'react-icons/fi';

export default function ContactPage() {
  const toast = useToast();
  const { values: form, setValues: setForm, errors, handleChange, validate, setServerErrors, reset } = useZodForm(
    { name: '', email: '', subject: '', message: '' },
    contactSchema
  );

  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    storeName: 'HodaHub',
    contactEmail: '',
    contactPhone: '',
    address: '',
    businessHours: '',
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    const clientCheck = contactSchema.safeParse(form);
    if (!clientCheck.success) {
      validate();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Message sent successfully!');
        reset({ name: '', email: '', subject: '', message: '' });
      } else {
        setServerErrors(data);
        toast.error(data.error || 'Failed to send message');
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <Breadcrumbs items={[{ label: 'Contact Us' }]} />

      <div className="max-w-3xl mx-auto text-center py-4">
        <h1 className="text-2xl font-bold text-warm-900 tracking-tight">Contact {settings.storeName}</h1>
        <p className="text-xs text-warm-500 mt-2">
          Have questions about your order or our products? We&apos;re here to help!
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {/* Info Box */}
        <div className="lg:col-span-1 p-6 bg-warm-900 text-white rounded-2xl space-y-6">
          <div>
            <h2 className="text-base font-bold">Get in Touch</h2>
            <p className="text-[11px] text-warm-400 mt-1">Our support team usually responds within 24 hours.</p>
          </div>

          <div className="space-y-4 text-[11px] text-warm-300">
            {settings.contactEmail && (
              <div className="flex items-start gap-3">
                <FiMail className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Email Us</p>
                  <a href={`mailto:${settings.contactEmail}`} className="text-[11px] text-warm-400 hover:underline">
                    {settings.contactEmail}
                  </a>
                </div>
              </div>
            )}

            {settings.contactPhone && (
              <div className="flex items-start gap-3">
                <FiPhone className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Call Us</p>
                  <a href={`tel:${settings.contactPhone}`} className="text-[11px] text-warm-400 hover:underline">
                    {settings.contactPhone}
                  </a>
                </div>
              </div>
            )}

            {settings.address && (
              <div className="flex items-start gap-3">
                <FiMapPin className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Location</p>
                  <p className="text-[11px] text-warm-400 leading-relaxed">{settings.address}</p>
                </div>
              </div>
            )}

            {settings.businessHours && (
              <div className="flex items-start gap-3">
                <FiClock className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Business Hours</p>
                  <p className="text-[11px] text-warm-400">{settings.businessHours}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2 p-6 sm:p-8 bg-white rounded-2xl border border-warm-200 shadow-xs">
          {!settings.contactEmail && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px] mb-4 font-medium">
              Contact form is temporarily unavailable.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-warm-700 uppercase mb-1">Your Name *</label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400 w-4 h-4" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-[11px] outline-none transition-colors ${
                      errors.name ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-warm-900'
                    }`}
                    placeholder="Jane Doe"
                    disabled={!settings.contactEmail}
                    required
                  />
                </div>
                <FieldError message={errors.name} />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-warm-700 uppercase mb-1">Your Email *</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-400 w-4 h-4" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-[11px] outline-none transition-colors ${
                      errors.email ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-warm-900'
                    }`}
                    placeholder="jane@example.com"
                    disabled={!settings.contactEmail}
                    required
                  />
                </div>
                <FieldError message={errors.email} />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-warm-700 uppercase mb-1">Subject *</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg text-[11px] outline-none transition-colors ${
                  errors.subject ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-warm-900'
                }`}
                placeholder="Order Inquiry, Product Info..."
                disabled={!settings.contactEmail}
                required
              />
              <FieldError message={errors.subject} />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-warm-700 uppercase mb-1">Message *</label>
              <textarea
                value={form.message}
                onChange={(e) => handleChange('message', e.target.value)}
                rows={4}
                className={`w-full px-4 py-2.5 border rounded-lg text-[11px] outline-none transition-colors resize-none ${
                  errors.message ? 'border-red-500 bg-red-50/20' : 'border-warm-200 focus:border-warm-900'
                }`}
                placeholder="How can we help you?"
                disabled={!settings.contactEmail}
                required
              />
              <FieldError message={errors.message} />
            </div>

            <button
              type="submit"
              disabled={loading || !settings.contactEmail}
              className="inline-flex items-center justify-center gap-2 px-6 py-1.5 bg-warm-900 text-white font-bold text-[11px] rounded-lg hover:bg-warm-800 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
            >
              <FiSend className="w-3 h-3" />
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
