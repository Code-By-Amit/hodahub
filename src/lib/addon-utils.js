/**
 * Resolves the effective price and isFree status for an add-on given a product link containing optional overrides.
 *
 * Rules:
 * 1. If link.isFreeOverride !== null:
 *    - if true => isFree = true, price = '0.00'
 *    - if false => isFree = false, price = (link.priceOverride !== null ? link.priceOverride : addon.price)
 * 2. Else if link.priceOverride !== null:
 *    - isFree = false, price = link.priceOverride
 * 3. Else:
 *    - inherit from library addon (addon.isFree, addon.price)
 */
export function resolveAddonPricing(addon, link = {}) {
  const isFreeOverride = link?.isFreeOverride !== undefined && link?.isFreeOverride !== null ? link.isFreeOverride : null;
  const priceOverride = link?.priceOverride !== undefined && link?.priceOverride !== null ? link.priceOverride : null;

  let effectiveIsFree = addon.isFree === true;
  if (isFreeOverride !== null) {
    effectiveIsFree = isFreeOverride === true;
  }

  let effectivePrice = addon.price ? Number(addon.price).toFixed(2) : '0.00';
  if (effectiveIsFree) {
    effectivePrice = '0.00';
  } else if (priceOverride !== null) {
    effectivePrice = Number(priceOverride).toFixed(2);
  }

  const hasOverride = isFreeOverride !== null || priceOverride !== null;

  return {
    ...addon,
    id: addon.id,
    addonId: addon.addonId || addon.id,
    name: addon.name,
    imageUrl: addon.imageUrl || null,
    isActive: addon.isActive !== false,
    price: effectivePrice,
    isFree: effectiveIsFree,
    defaultPrice: addon.price ? Number(addon.price).toFixed(2) : '0.00',
    defaultIsFree: addon.isFree === true,
    priceOverride: priceOverride !== null ? Number(priceOverride).toFixed(2) : null,
    isFreeOverride,
    hasOverride,
  };
}
