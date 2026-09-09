export const metadata = {
  title: 'Privacy Policy — HodaHub',
  description: 'Understand how HodaHub collects, protects, and uses your personal data.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-warm-900 tracking-tight mb-4">Privacy Policy</h1>
      <p className="text-warm-500 text-sm mb-8">Last updated: September 2026</p>

      <div className="prose prose-warm max-w-none space-y-6 text-warm-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-warm-900 mb-2">1. Information We Collect</h2>
          <p>
            When you register an account, make a purchase, or interact with HodaHub, we collect personal information such as your name, email address, phone number, shipping address, and payment details processed via secure payment gateways.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-warm-900 mb-2">2. How We Use Your Information</h2>
          <p>
            Your information is used strictly to fulfill orders, process payments, manage customer accounts, send order updates and verification OTPs, and improve our services. We do not sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-warm-900 mb-2">3. Data Security</h2>
          <p>
            We enforce industry-standard encryption protocols (HTTPS/TLS), secure hashed password storage, and database rate-limiting to protect your data against unauthorized access.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-warm-900 mb-2">4. Your Rights</h2>
          <p>
            You may view, update, or delete your account information at any time via your account profile or by contacting our support team.
          </p>
        </section>
      </div>
    </div>
  );
}
