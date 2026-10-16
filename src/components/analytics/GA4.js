// GA4 analytics component for Next.js (App Router)
// Loads the GA script after user consent and tracks page views on route changes.

'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { getConsent, CONSENT_EVENT } from '@/lib/consent';
import { GA_ID, setReady } from '@/lib/ga';

export default function GA4() {
  const [granted, setGranted] = useState(false);
  const firstLoad = useRef(true);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Sync consent state
  useEffect(() => {
    const sync = () => setGranted(getConsent() === 'granted');
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  // If consent revoked, disable GA (no direct API to revoke, just stop sending)
  useEffect(() => {
    if (!granted) {
      // No explicit revocation for GA; we simply avoid sending further events.
    }
  }, [granted]);

  // Track page view on route change (skip first render which is handled in onLoad / initialization)
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (typeof window !== 'undefined' && GA_ID && granted && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: pathname + (searchParams?.toString() ? `?${searchParams}` : ''),
        page_location: typeof window !== 'undefined' ? window.location.href : undefined,
        page_title: document.title,
      });
    }
  }, [pathname, searchParams, granted]);

  if (!GA_ID || !granted) return null;

  return (
    <>
      <Script
        id="ga4"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        onLoad={() => {
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', GA_ID, { send_page_view: false });
          setReady();
          // Initial page view event
          gtag('event', 'page_view', {
            page_path: pathname + (searchParams?.toString() ? `?${searchParams}` : ''),
            page_location: typeof window !== 'undefined' ? window.location.href : undefined,
            page_title: document.title,
          });
        }}
      />
    </>
  );
}
