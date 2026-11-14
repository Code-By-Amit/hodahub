'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analyticsApi } from '@/lib/apiClient/analytics.api';
import useConsent from '@/hooks/useConsent';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef('');
  const consent = useConsent();

  useEffect(() => {
    // Ignore admin routes
    if (consent !== 'granted' || !pathname || pathname.startsWith('/admin') || pathname.startsWith('/api') || pathname.startsWith('/orders/') || pathname.startsWith('/reset-password')) {
      return;
    }

    const fullPath = pathname;
    if (lastTracked.current === fullPath) return;
    lastTracked.current = fullPath;

    async function sendPing() {
      try {
        await analyticsApi.track({
          path: fullPath,
          consent: 'granted',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        });
      } catch (err) {
        // Silent catch for analytics failure
      }
    }

    sendPing();
  }, [pathname, searchParams, consent]);

  return null;
}
