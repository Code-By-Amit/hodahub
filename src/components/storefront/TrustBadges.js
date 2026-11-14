import Link from 'next/link';
import { getCachedStoreSettings } from '@/lib/store-settings';
import { formatCurrency } from '@/lib/utils';
import { FiTruck, FiShield, FiRefreshCw, FiHeadphones } from 'react-icons/fi';

export default async function TrustBadges() {
const settings = await getCachedStoreSettings();
const badges = [
  { icon: FiTruck, title: 'Free Shipping', desc: `On orders of ${formatCurrency(Number(settings.minFreeShipping ?? 50))} or more` },
  { icon: FiShield, title: 'Secure Payments', desc: '100% secure checkout' },
  { icon: FiRefreshCw, title: 'Easy Exchanges', desc: '48-hour exchange & store credit (no cash refunds)', href: '/returns' },
  { icon: FiHeadphones, title: 'Customer Support', desc: 'Contact our team for help' },
];

  return (
    <section className="border-y border-warm-100 bg-white">
      <div className="store-container py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {badges.map((badge, i) => {
            const Content = (
              <div className="flex items-center gap-3 sm:gap-4 justify-start">
                <div className="w-8 h-8 rounded-md bg-warm-50 flex items-center justify-center shrink-0">
                  <badge.icon className="w-4 h-4 text-warm-700" />
                </div>
                <div>
                  <h3 className="text-[13px] sm:text-[14px] font-semibold text-warm-900 group-hover:text-brand-600 transition-colors">
                    {badge.title}
                  </h3>
                  <p className="text-[10.5px] sm:text-[11px] text-warm-500 leading-snug">
                    {badge.desc}
                  </p>
                </div>
              </div>
            );

            return badge.href ? (
              <Link
                key={i}
                href={badge.href}
                className="group block rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                title="View return & exchange policy"
              >
                {Content}
              </Link>
            ) : (
              <div key={i}>
                {Content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
