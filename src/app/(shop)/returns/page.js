import ReturnPolicyContent from '@/components/storefront/ReturnPolicyContent';

export const metadata = {
  title: 'Returns & Exchanges — HodaHub',
  description: 'Hodahub offers exchange within 48 hours of delivery and store credit in place of cash refunds.',
};

export default function ReturnsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-warm-900 tracking-tight mb-4">Returns & Exchanges</h1>
      <div className="space-y-6 text-warm-700 text-sm leading-relaxed">
        <div className="p-6 bg-white rounded-2xl border border-warm-100">
          <ReturnPolicyContent />
        </div>
      </div>
    </div>
  );
}
