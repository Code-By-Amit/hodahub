export const metadata = {
  title: 'Terms of Service — HodaHub',
  description: 'Terms and conditions governing the use of HodaHub storefront.',
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-warm-900 tracking-tight mb-4">Terms of Service</h1>
      <p className="text-warm-500 text-sm mb-8">Last updated: September 2026</p>

      <div className="prose prose-warm max-w-none space-y-6 text-warm-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-warm-900 mb-2">1. Agreement to Terms</h2>
          <p>
            By accessing or using HodaHub, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-warm-900 mb-2">2. Products & Pricing</h2>
          <p>
            All products listed are subject to availability. Prices and promotional discounts are subject to change without prior notice. We reserve the right to correct pricing errors or cancel orders if necessary.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-warm-900 mb-2">3. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. HodaHub is not liable for unauthorized account access resulting from weak credentials.
          </p>
        </section>
      </div>
    </div>
  );
}
