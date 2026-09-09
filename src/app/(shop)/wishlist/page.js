'use client';

import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { selectWishlistItems, clearWishlist } from '@/lib/store/wishlistSlice';
import { selectUser } from '@/lib/store/authSlice';
import ProductCard from '@/components/ui/ProductCard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { useToast } from '@/components/ui/Toast';
import { Heart, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';

export default function WishlistPage() {
  const dispatch = useDispatch();
  const toast = useToast();
  const wishlistItems = useSelector(selectWishlistItems);
  const user = useSelector(selectUser);

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear your wishlist?')) {
      dispatch(clearWishlist());
      toast.info('Wishlist cleared');
      if (user) {
        // Clear each item in database
        try {
          await Promise.all(
            wishlistItems.map((item) =>
              fetch(`/api/wishlist/${item.id}`, { method: 'DELETE' })
            )
          );
        } catch {}
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-3">
      <Breadcrumbs items={[{ label: 'Wishlist' }]} />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-warm-200/80 pb-5">
        <div>
          <h1 className="text-base  font-bold text-warm-900 tracking-tight flex items-center gap-2.5">
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
            My Wishlist
          </h1>
          <p className="text-[11px] text-warm-500 mt-1">
            {wishlistItems.length} saved item{wishlistItems.length !== 1 ? 's' : ''} in your wishlist
          </p>
        </div>

        {wishlistItems.length > 0 && (
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-warm-200 rounded-md text-[11px] font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors self-start sm:self-auto"
          >
            <Trash2 className="w-2.5 h-2.5" />
            Clear Wishlist
          </button>
        )}
      </div>

      {wishlistItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-4 sm:gap-5">
          {wishlistItems.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-warm-200 rounded-2xl p-12 text-center max-w-lg mx-auto my-8">
          <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
            <Heart className="w-4 h-4" />
          </div>
          <h2 className="text-[18px] font-bold text-warm-900 mb-1">
            Your Wishlist is Empty
          </h2>
          <p className="text-[11px] text-warm-500 max-w-sm mx-auto mb-6 leading-relaxed">
            Save items you love by clicking the heart icon on any product. Revisit them anytime to compare or add to cart!
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors shadow-xs"
          >
            <ShoppingBag className="w-2.5 h-2.5" />
            Explore Products
          </Link>
        </div>
      )}
    </div>
  );
}
