export const metadata = {
  title: 'Returns & Exchanges — HodaHub',
  description: 'Learn about our 30-day return policy and exchange procedures.',
};

export default function ReturnsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-warm-900 tracking-tight mb-4">Returns & Exchanges</h1>
      <div className="space-y-6 text-warm-700 text-sm leading-relaxed">
        <p>
          We want you to be completely satisfied with your purchase. If you are not happy with your order, you may request a return within 30 days of delivery.
        </p>
        <div className="p-6 bg-white rounded-2xl border border-warm-100 space-y-3">
          <h2 className="font-bold text-warm-900 text-base">How to Return an Item</h2>
          <p>Go to <strong>My Orders</strong>, select your order, and click <strong>Request Return</strong>. Once approved by our team, refunds are issued back to your original payment method or store credit.</p>
        </div>
      </div>
    </div>
  );
}
