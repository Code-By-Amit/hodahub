const CLOUDINARY_SECURE_URL_PATTERN =
  /^https?:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(?:v\d+\/)?(.+?)\.(jpe?g|png|webp)$/i;

/**
 * Cloudinary deletes by public_id (folder/filename, no extension), which the browser upload flow never
 * returns — so it is derived from the stored secure_url. Non-Cloudinary URLs yield null, meaning no
 * remote cleanup is attempted.
 */
export function extractCloudinaryPublicId(imageUrl) {
  if (!imageUrl) return null;
  const match = CLOUDINARY_SECURE_URL_PATTERN.exec(String(imageUrl).trim());
  return match ? match[2] || null : null;
}

/**
 * Reordering assigns each row the position it occupies in the admin list, so only the rows whose
 * stored sort_order differs actually need a write.
 */
export function buildOrderPatch(items = []) {
  return items.reduce((patch, item, index) => {
    if (item.sortOrder !== index) {
      patch.push({ id: item.id, sortOrder: index });
    }
    return patch;
  }, []);
}

/** Screenshots whose image failed to load are dropped so the gallery never shows a broken frame. */
export function selectVisibleScreenshots(items = [], failedIds = {}) {
  return items.filter((item) => !failedIds[item.id]);
}
