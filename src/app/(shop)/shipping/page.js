export const metadata = {
  title: 'Shipping Information — HodaHub',
  description: 'Shipping rates, delivery times, and policies.',
};

export default function ShippingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-warm-900 tracking-tight mb-4">Shipping Information</h1>
      <div className="space-y-6 text-warm-700 text-sm leading-relaxed">
        <p>
          We aim to process and dispatch all orders within 24 hours of placement.
        </p>
        <div className="p-6 bg-white rounded-2xl border border-warm-100 space-y-3">
          <h2 className="font-bold text-warm-900 text-base">Free Shipping Policy</h2>
          <p>Orders over $50 qualify for free standard shipping nationwide.</p>
        </div>
      </div>
    </div>
  );
}
