// GA4 analytics component for Next.js (App Router)
// Loads the GA script after user consent and tracks page views on route changes.

'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import useConsent from '@/hooks/useConsent';
import { GA_ID, setReady } from '@/lib/ga';

export default function GA4() {
  const granted = useConsent() === 'granted';
  const firstLoad = useRef(true);
  const pathname = usePathname();
  const searchParams = useSearchParams();


  // Track page view on route change (skip first render which is handled in onLoad / initialization)
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (typeof window !== 'undefined' && GA_ID && granted && window.gtag && !(pathname?.startsWith('/admin') || pathname?.startsWith('/orders') || pathname?.startsWith('/reset-password') || pathname?.startsWith('/verify-otp'))) {
      window.gtag('event', 'page_view', {
        page_path: pathname,
        page_location: typeof window !== 'undefined' ? window.location.origin + pathname : undefined,
        page_title: document.title,
      });
    }
  }, [pathname, searchParams, granted]);

  if (!GA_ID || !granted || (pathname?.startsWith('/admin') || pathname?.startsWith('/orders') || pathname?.startsWith('/reset-password') || pathname?.startsWith('/verify-otp'))) return null;

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
