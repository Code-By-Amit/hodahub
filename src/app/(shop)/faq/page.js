export const metadata = {
  title: 'Frequently Asked Questions — HodaHub',
  description: 'Answers to common questions regarding orders, shipping, and returns.',
};

const faqs = [
  {
    q: 'How long does delivery take?',
    a: 'Standard shipping usually takes 3 to 5 business days depending on your location. Express shipping is delivered within 1 to 2 business days.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept Cash on Delivery (COD) and all major credit cards, debit cards, UPI, and net banking via Razorpay.',
  },
  {
    q: 'How can I track my order status?',
    a: 'You can view real-time order status updates in your account under "My Orders", complete with tracking timeline details.',
  },
  {
    q: 'What is your return policy?',
    a: 'We offer a hassle-free 30-day return policy on eligible delivered products directly through your order management page.',
  },
];

export default function FAQPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-warm-900 tracking-tight mb-2">Frequently Asked Questions</h1>
      <p className="text-warm-500 text-sm mb-10">Find answers to common questions about orders, payments, and shipping.</p>

      <div className="space-y-6">
        {faqs.map((faq, i) => (
          <div key={i} className="p-6 bg-white rounded-2xl border border-warm-100 shadow-sm">
            <h3 className="text-base font-bold text-warm-900 mb-2">{faq.q}</h3>
            <p className="text-sm text-warm-600 leading-relaxed">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
