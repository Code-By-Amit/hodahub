export function guestOrderQuery() {
  if (typeof window === 'undefined') return '';
  const accessCode = new URLSearchParams(window.location.search).get('accessCode');
  return accessCode ? '?accessCode=' + encodeURIComponent(accessCode) : '';
}
