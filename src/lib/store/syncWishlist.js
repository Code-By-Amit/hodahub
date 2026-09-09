import { setWishlist, clearWishlist } from './wishlistSlice';

/**
 * Merges guest wishlist items with server DB wishlist and loads user DB wishlist
 * @param {Function} dispatch Redux dispatch
 * @param {Array} guestWishlistItems Current items in Redux before sync
 */
export async function syncWishlistOnAuth(dispatch, guestWishlistItems = []) {
  try {
    if (Array.isArray(guestWishlistItems) && guestWishlistItems.length > 0) {
      const productIds = guestWishlistItems.map((item) => item.id).filter(Boolean);
      if (productIds.length > 0) {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds }),
        });
      }
    }
  } catch (err) {
    console.error('Failed to merge guest wishlist:', err);
  } finally {
    // Clear local guest wishlist state so it never re-merges stale items
    dispatch(clearWishlist());
  }

  // Fetch full database wishlist for authenticated user
  try {
    const wishlistRes = await fetch('/api/wishlist');
    if (wishlistRes.ok) {
      const wishlistData = await wishlistRes.json();
      dispatch(setWishlist(wishlistData.items || []));
    }
  } catch (err) {
    console.error('Failed to fetch DB wishlist:', err);
  }
}
