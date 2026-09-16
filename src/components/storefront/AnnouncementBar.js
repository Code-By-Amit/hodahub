'use client';

import { Truck, Percent, Zap, Gift, ShieldCheck } from 'lucide-react';

export default function AnnouncementBar() {
  const messages = [
    { Icon: Truck, text: 'Free Shipping Available' },
    { Icon: Percent, text: 'Exclusive Online Deals' },
    { Icon: Zap, text: 'Fast Express Delivery' },
    { Icon: Gift, text: 'New Season Arrivals' },
    { Icon: ShieldCheck, text: 'Secure Payments Guaranteed' },
  ];

  const doubled = [...messages, ...messages];

  return (
    <div className="bg-warm-900 text-warm-200 text-[10px] font-medium overflow-hidden relative h-6 flex items-center border-b border-warm-800 print:hidden">
      <div
        className="flex whitespace-nowrap items-center"
        style={{ animation: 'ticker 35s linear infinite' }}
      >
        {doubled.map((msg, i) => (
          <div key={i} className="flex items-center shrink-0 px-4">
            <msg.Icon className="w-2.5 h-2.5 mr-1 text-warm-300 shrink-0" />
            <span className="tracking-wide uppercase text-[9px] text-warm-200">{msg.text}</span>
            {i < doubled.length - 1 && (
              <span className="ml-4 text-warm-700 text-[9px]">•</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}