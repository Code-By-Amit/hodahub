// Positive positions first; unranked brands retain deterministic alphabetical order.
export function compareBrandOrder(a, b) {
  const rank = (value) => Number(value) > 0 ? Number(value) : Number.MAX_SAFE_INTEGER;
  return rank(a.sortOrder) - rank(b.sortOrder) || a.name.localeCompare(b.name) || String(a.slug || '').localeCompare(String(b.slug || ''));
}

export function brandSlug(name = '') {
  return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'brand';
}

// Resolve legacy labels to registered identities before allocating public URLs.
export function buildBrandCatalog(rows, registered = []) {
  const byId = new Map(registered.map((brand) => [brand.id, brand]));
  const byName = new Map(registered.map((brand) => [brandSlug(brand.name), brand]));
  const groups = new Map();
  for (const row of rows) {
    const name = row.brandRelName || row.brandText?.trim();
    if (!name) continue;
    const record = byId.get(row.brandRelId) || byName.get(brandSlug(name));
    const slug = record?.slug || row.brandRelSlug;
    const key = slug ? 'registered:' + slug : 'legacy:' + brandSlug(name);
    let item = groups.get(key);
    if (!item) {
      item = { name: record?.name || name, dbSlug: slug, productCount: 0, image: null, logo: record?.logoUrl || row.brandLogoUrl, sortOrder: record?.sortOrder || row.brandSortOrder || 0, aliases: new Set() };
      groups.set(key, item);
    }
    item.productCount++;
    item.aliases.add(name);
    if (row.brandText?.trim()) item.aliases.add(row.brandText.trim());
    if (!item.image) item.image = row.images?.[0] || null;
  }
  const used = new Set([...registered.map((item) => item.slug), ...Array.from(groups.values()).map((item) => item.dbSlug)].filter(Boolean));
  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name)).map((item) => {
    const base = brandSlug(item.name);
    let slug = item.dbSlug || base;
    if (!item.dbSlug) {
      let suffix = 2;
      while (used.has(slug)) slug = base + '-' + suffix++;
      used.add(slug);
    }
    return { name: item.name, slug, productCount: item.productCount, image: item.image || item.logo || null, sortOrder: item.sortOrder, aliases: Array.from(item.aliases) };
  }).sort(compareBrandOrder);
}
