// Remembers the visitor's cookie choice: 'granted' | 'denied' | null (not asked yet)
const KEY = 'cookie_consent_v1';
export const CONSENT_EVENT = 'consent-change';

export function getConsent() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// If someone accepted before and now rejects, Meta's cookies from the earlier "accept" must go.
// Meta sets them on the top-level domain, so try every parent domain (the browser ignores invalid ones).
function clearMetaCookies() {
  const parts = window.location.hostname.split('.');
  const domains = [undefined, ...parts.slice(0, -1).map((_, i) => `.${parts.slice(i).join('.')}`)];
  for (const name of ['_fbp', '_fbc']) {
    for (const d of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`;
    }
  }
}

export function setConsent(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {}
  if (value === 'denied') clearMetaCookies();
  window.dispatchEvent(new Event(CONSENT_EVENT));
}