'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie } from 'lucide-react';
import { getConsent, setConsent } from '@/lib/consent';

const LABEL = { granted: 'accepted', denied: 'rejected' };

// Same size + same style on purpose: rejecting must be as easy as accepting
const BTN =
  'flex-1 rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400';

// Footer link so people can change their mind later:
//   <CookieSettingsButton className="text-[11px] text-warm-500 hover:underline" />
export function CookieSettingsButton({ className = '', children = 'Cookie settings' }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}
    >
      {children}
    </button>
  );
}

export default function CookieConsent() {
  const [open, setOpen] = useState(false); // banner exists in the page
  const [shown, setShown] = useState(false); // slide-in animation state
  const [current, setCurrent] = useState(null); // earlier choice, shown when reopened

  useEffect(() => {
    const show = () => {
      setCurrent(getConsent());
      setOpen(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    };

    if (getConsent() === null) show(); // first visit
    window.addEventListener('open-cookie-settings', show);
    return () => window.removeEventListener('open-cookie-settings', show);
  }, []);

  if (!open) return null;

  const choose = (value) => {
    setConsent(value);
    setShown(false);
    setTimeout(() => setOpen(false), 250);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-desc"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5"
    >
      <div
        className={`pointer-events-auto relative mx-auto max-w-3xl overflow-hidden rounded-2xl bg-warm-900 text-white shadow-2xl ring-1 ring-white/10 transition-all duration-300 motion-reduce:transition-none ${
          shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        {/* accent bar */}
        <div className="h-1 bg-gradient-to-r from-orange-500 to-amber-400" />

        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
          <div className="flex flex-1 items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
              <Cookie className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="cookie-title" className="text-[14px] font-bold">
                Your cookie choice
              </h2>
              <p id="cookie-desc" className="mt-0.5 text-[12px] leading-relaxed text-white/75">
                We use cookies to improve our site and to show you relevant offers and ads. They stay off
                unless you accept.{' '}
                <Link href="/privacy" className="font-semibold text-white underline underline-offset-2">
                  Privacy policy
                </Link>
              </p>
              {current && (
                <p className="mt-1 text-[11px] text-white/50">
                  Right now you have {LABEL[current]} them. You can change this any time.
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2 sm:w-60">
            <button type="button" onClick={() => choose('denied')} className={BTN}>
              Reject
            </button>
            <button type="button" onClick={() => choose('granted')} className={BTN}>
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}