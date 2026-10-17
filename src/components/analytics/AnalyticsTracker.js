'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analyticsApi } from '@/lib/apiClient/analytics.api';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef('');

  useEffect(() => {
    // Ignore admin routes
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api')) {
      return;
    }

    const fullPath = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    if (lastTracked.current === fullPath) return;
    lastTracked.current = fullPath;

    async function sendPing() {
      try {
        await analyticsApi.track({
          path: fullPath,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        });
      } catch (err) {
        // Silent catch for analytics failure
      }
    }

    sendPing();
  }, [pathname, searchParams]);

  return null;
}
