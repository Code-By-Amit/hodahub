import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { getCachedStoreSettings } from '@/lib/store-settings';
import ContactForm from './ContactForm';
import { FiMail, FiPhone, FiMapPin, FiClock } from 'react-icons/fi';

export const revalidate = 3600; // Cache page for 1 hour (revalidated on admin settings update)

export default async function ContactPage() {
  const settings = await getCachedStoreSettings();

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
        <ContactForm contactEmail={settings.contactEmail} />
      </div>
    </div>
  );
}
