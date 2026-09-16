/**
 * Looks up Indian pincode details using India Post public API
 * @param {string} pincode 6-digit Indian postal code
 * @returns {Promise<{ city: string, state: string } | null>}
 */
export async function lookupPincode(pincode) {
  const cleaned = String(pincode || '').trim();
  if (!/^\d{6}$/.test(cleaned)) {
    return null;
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0]?.PostOffice) && data[0].PostOffice.length > 0) {
      const po = data[0].PostOffice[0];
      const city = po.District || po.Division || po.Block || po.Circle || '';
      const state = po.State || '';
      return { city, state };
    }
  } catch (err) {
    console.error('Pincode lookup error:', err);
  }

  return null;
}
