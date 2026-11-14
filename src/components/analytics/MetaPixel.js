'use client';

import { Suspense, useEffect, useRef } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { PIXEL_ID } from '@/lib/metaPixel';
import useConsent from '@/hooks/useConsent';

// Fires fbq('track', 'PageView') on every client-side route change.
// The first PageView is fired from handleLoad so we skip it here.
function RouteChangeTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.fbq?.('track', 'PageView');
  }, [pathname, searchParams]);

  return null;
}

// Installs the fbq stub into window and immediately queues 'init' and first 'PageView'.
// fbevents.js upgrades the stub's queue into the real implementation.
function installStub(pixelId) {
  if (typeof window === 'undefined') return;
  if (!window.fbq) {
    const n = function (...args) {
      if (n.callMethod) n.callMethod.apply(n, args);
      else n.queue.push(args);
    };
    window.fbq = n;
    window._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
  }
  if (pixelId && !window._fbq_initialized) {
    window._fbq_initialized = true;
    window.fbq('consent', 'grant');
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
  }
}

export default function MetaPixel() {
  const pathname = usePathname();
  const granted = useConsent() === 'granted';


  // When consent is active: install the stub with init and PageView, then load fbevents.js.
  // When consent is revoked: signal Meta to revoke cookies.
  useEffect(() => {
    if (granted && PIXEL_ID && !(pathname?.startsWith('/admin') || pathname?.startsWith('/orders') || pathname?.startsWith('/reset-password') || pathname?.startsWith('/verify-otp'))) {
      installStub(PIXEL_ID);
    } else {
      window.fbq?.('consent', 'revoke');
    }
  }, [granted, pathname]);

  // Called by <Script onLoad> once fbevents.js is loaded
  function handleLoad() {
    window.dispatchEvent(new Event('meta-pixel-ready'));
  }

  // Do not render in admin or if pixel ID missing or consent denied
  if (!PIXEL_ID || !granted || (pathname?.startsWith('/admin') || pathname?.startsWith('/orders') || pathname?.startsWith('/reset-password') || pathname?.startsWith('/verify-otp'))) return null;

  return (
    <>
      <Script
        id="meta-pixel"
        src="https://connect.facebook.net/en_US/fbevents.js"
        strategy="afterInteractive"
        onLoad={handleLoad}
        onError={() => console.warn('[MetaPixel] fbevents.js failed to load — ad blocker?')}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <Suspense fallback={null}>
        <RouteChangeTracker />
      </Suspense>
    </>
  );
}