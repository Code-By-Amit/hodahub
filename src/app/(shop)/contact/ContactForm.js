'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import FieldError from '@/components/ui/FieldError';
import { contactSchema } from '@/lib/validations';
import { useZodForm } from '@/hooks/useZodForm';
import { FiMail, FiUser, FiSend } from 'react-icons/fi';

export default function ContactForm({ contactEmail }) {
  const toast = useToast();
  const { values: form, errors, handleChange, validate, setServerErrors, reset } = useZodForm(
    { name: '', email: '', subject: '', message: '' },
    contactSchema
  );

  const [loading, setLoading] = useState(false);
  const isFormDisabled = !contactEmail || contactEmail.trim() === '';

  async function handleSubmit(e) {
    e.preventDefault();

    if (isFormDisabled) {
      toast.error('Contact form is temporarily unavailable.');
      return;
    }

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
    <div className="lg:col-span-2 p-6 sm:p-8 bg-white rounded-2xl border border-warm-200 shadow-xs">
      {isFormDisabled && (
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
                disabled={isFormDisabled}
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
                disabled={isFormDisabled}
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
            disabled={isFormDisabled}
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
            disabled={isFormDisabled}
            required
          />
          <FieldError message={errors.message} />
        </div>

        <button
          type="submit"
          disabled={loading || isFormDisabled}
          className="inline-flex items-center justify-center gap-2 px-6 py-1.5 bg-warm-900 text-white font-bold text-[11px] rounded-lg hover:bg-warm-800 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
        >
          <FiSend className="w-3 h-3" />
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
}
