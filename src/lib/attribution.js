// Remembers which ad brought the visitor (utm_* in the landing URL) for this browser tab,
// so the WhatsApp message can carry a short "Ref:" you can match to a creative later.
// No personal data is stored.
const KEY = 'ad_attribution';
const FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

export function captureAttribution() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const found = {};
  for (const f of FIELDS) {
    const v = params.get(f);
    if (v) found[f] = v.slice(0, 60);
  }
  if (Object.keys(found).length === 0) return; // not an ad visit, keep what we had
  try {
    sessionStorage.setItem(KEY, JSON.stringify(found));
  } catch {}
}

export function getAttribution() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}