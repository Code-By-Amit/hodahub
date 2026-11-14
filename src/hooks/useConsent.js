'use client';
import { useSyncExternalStore } from 'react';
import { getConsent, CONSENT_EVENT } from '@/lib/consent';
function subscribe(callback) {
  window.addEventListener(CONSENT_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => { window.removeEventListener(CONSENT_EVENT, callback); window.removeEventListener('storage', callback); };
}
export default function useConsent() { return useSyncExternalStore(subscribe, getConsent, () => null); }
