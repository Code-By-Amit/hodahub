import { formatCurrency } from '@/lib/utils';
import { FiTruck, FiShield, FiRefreshCw, FiHeadphones } from 'react-icons/fi';

const badges = [
  { icon: FiTruck, title: 'Free Shipping', desc: `On orders over ${formatCurrency(50)}` },
  { icon: FiShield, title: 'Secure Payments', desc: '100% secure checkout' },
  { icon: FiRefreshCw, title: 'Easy Returns', desc: '30-day return policy' },
  { icon: FiHeadphones, title: '24/7 Support', desc: 'Always here to help' },
];

export default function TrustBadges() {
  return (
    <section className="border-y border-warm-100 bg-white">
      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {badges.map((badge, i) => (
            <div
              key={i}
              className="flex items-center gap-4 justify-center lg:justify-start"
            >
              <div className="w-8 h-8 rounded-md bg-warm-50 flex items-center justify-center shrink-0">
                <badge.icon className="w-4 h-4 text-warm-700" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-warm-900">{badge.title}</h3>
                <p className="text-[11px] text-warm-500">{badge.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
