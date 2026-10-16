'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { PIXEL_ID } from '@/lib/metaPixel';
import { CONSENT_EVENT, getConsent } from '@/lib/consent';

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

// Installs the fbq stub into window.
// fbevents.js REQUIRES the stub to already exist when it loads —
// it upgrades the stub's queue into the real implementation.
// This must run before the <Script src="fbevents.js"> is rendered.
function installStub() {
  if (typeof window === 'undefined' || window.fbq) return;
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

export default function MetaPixel() {
  const [granted, setGranted] = useState(false);
  // Becomes true only after installStub() has run, so the <Script>
  // is never rendered before window.fbq exists.
  const [stubReady, setStubReady] = useState(false);
  const initialized = useRef(false);

  // Sync consent state from localStorage
  useEffect(() => {
    const sync = () => setGranted(getConsent() === 'granted');
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  // When consent is granted: install the stub, then allow the <Script> to render.
  // When consent is revoked: signal Meta and reset so re-granting works.
  useEffect(() => {
    if (granted && PIXEL_ID) {
      installStub();
      setStubReady(true);
    } else {
      window.fbq?.('consent', 'revoke');
      // Reset so the next consent grant re-initialises cleanly
      initialized.current = false;
      setStubReady(false);
    }
  }, [granted]);

  // Called by <Script onLoad> once fbevents.js has upgraded the stub
  function handleLoad() {
    if (initialized.current) return; // guard against double-fire
    initialized.current = true;
    window.fbq('consent', 'grant');
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
    // Tell metaPixel.js helpers that the queue can now be flushed
    window.dispatchEvent(new Event('meta-pixel-ready'));
  }

  // Do not render anything until:
  //   1. PIXEL_ID is configured
  //   2. user has granted consent
  //   3. the fbq stub is in window (so fbevents.js finds it when it loads)
  if (!PIXEL_ID || !granted || !stubReady) return null;

  return (
    <>
      {/*
        Uses src= so Next.js creates a real <script> DOM element.
        strategy="afterInteractive" injects it after hydration.
        fbevents.js finds window.fbq (the stub) already in place,
        upgrades it to the full implementation, then onLoad fires.
      */}
      <Script
        id="meta-pixel"
        src="https://connect.facebook.net/en_US/fbevents.js"
        strategy="afterInteractive"
        onLoad={handleLoad}
        onError={() => console.warn('[MetaPixel] fbevents.js failed to load — ad blocker?')}
      />
      <Suspense fallback={null}>
        <RouteChangeTracker />
      </Suspense>
    </>
  );
}