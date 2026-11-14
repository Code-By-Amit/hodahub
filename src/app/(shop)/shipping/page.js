import { getCachedStoreSettings } from '@/lib/store-settings';
import { formatCurrency } from '@/lib/utils';
export const metadata = {
  title: 'Shipping Information — HodaHub',
  description: 'Shipping rates, delivery times, and policies.',
};

export default async function ShippingPage() {
  const settings = await getCachedStoreSettings();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <h1 className="text-2xl font-bold text-warm-900 tracking-tight mb-4">Shipping Information</h1>
      <div className="space-y-6 text-warm-700 text-sm leading-relaxed">
        <p>
          We aim to process and dispatch all orders within 24 hours of placement.
        </p>
        <div className="p-6 bg-white rounded-xl border border-warm-100 space-y-3">
          <h2 className="font-bold text-warm-900 text-base">Free Shipping Policy</h2>
          <p>Orders of {formatCurrency(Number(settings.minFreeShipping ?? 50))} or more qualify for free standard shipping to eligible locations. Shipping below this threshold is {formatCurrency(Number(settings.shippingFee ?? 0))}. Final charges appear at checkout.</p>
        </div>
      </div>
    </div>
  );
}
