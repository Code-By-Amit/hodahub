'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useDispatch, useSelector } from 'react-redux';
import { addItem } from '@/lib/store/cartSlice';
import {
  addToWishlist,
  removeFromWishlist,
  selectIsWishlisted,
} from '@/lib/store/wishlistSlice';
import { selectUser } from '@/lib/store/authSlice';
import dynamic from 'next/dynamic';
import { useToast } from '@/components/ui/Toast';
import StarRating from '@/components/ui/StarRating';
import { formatCurrency } from '@/lib/utils';

const QuickViewModal = dynamic(() => import('@/components/ui/QuickViewModal'), {
  ssr: false,
});
import { trackAddToCart as trackPixelAddToCart, trackAddToWishlist } from '@/lib/metaPixel';
import { trackAddToCart as trackGAAddToCart } from '@/lib/ga';
import { Heart, ShoppingBag, Eye, Package } from 'lucide-react';
import { wishlistApi } from '@/lib/apiClient/wishlist.api';

export default function ProductCard({ product, variant = 'default' }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const user = useSelector(selectUser);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const {
    id, name, slug, price, discountPrice, images, description,
    ratingAvg, reviewCount, createdAt, brand, brandName
  } = product || {};

  const displayBrand = brand || brandName || null;

  const productSlug = slug || id;
  const isWishlisted = useSelector(selectIsWishlisted(id));

  const mainImage = images?.[0] || '';
  const discount = discountPrice
    ? Math.round(((price - discountPrice) / price) * 100)
    : 0;

  const [isNew, setIsNew] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setIsNew(Boolean(createdAt && Date.now() - new Date(createdAt).getTime() < 14 * 86400000)), 0); return () => clearTimeout(timer); }, [createdAt]);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(addItem({
      productId: id,
      name,
      slug: productSlug,
      image: mainImage,
      price: Number(price),
      discountPrice: discountPrice ? Number(discountPrice) : null,
      codAvailable: product?.codAvailable !== false,
      quantity: 1,
    }));
    trackPixelAddToCart(product, 1);
    trackGAAddToCart(product, 1);
    toast.success(`${name} added to cart!`);
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWishlisted) {
      dispatch(removeFromWishlist(id));
      toast.info(`Removed ${name} from wishlist`);
      if (user) {
        try {
          await wishlistApi.remove(id);
        } catch { }
      }
    } else {
      dispatch(addToWishlist(product));
      trackAddToWishlist(product);
      toast.success(`Added ${name} to wishlist!`);
      if (user) {
        try {
          await wishlistApi.add(id);
        } catch { }
      }
    }
  };

  const handleOpenQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickViewOpen(true);
  };

  if (variant === 'bestseller') {
    return (
      <>
        <div className="group bg-white rounded-md border border-warm-200 hover:border-warm-300 hover:shadow-xs transition-all duration-200 overflow-hidden">
          <Link href={`/products/${productSlug}`} className="block">
            <div className="flex flex-row items-center p-2 sm:p-2.5 gap-2 sm:gap-3">
              {/* Image */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 aspect-square bg-warm-50 overflow-hidden shrink-0 rounded-md border border-warm-100">
                {mainImage ? (
                  <Image
                    src={mainImage}
                    alt={name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 80px, 96px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-warm-300 bg-warm-100">
                    <Package className="w-7 h-7" />
                  </div>
                )}
                <div className="absolute top-1 left-1 z-10">
                  <span className="px-1.5 py-0.5 bg-warm-900 text-white text-[8px] font-bold rounded-full uppercase tracking-wider">
                    Bestseller
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  {displayBrand && (
                    <span className="text-[9px] font-semibold text-warm-500 uppercase tracking-wider block mb-0.5 truncate">
                      {displayBrand}
                    </span>
                  )}
                  <h3 className="text-[11px] sm:text-xs font-semibold text-warm-900 line-clamp-1 mb-0.5">
                    {name}
                  </h3>
                  <div className="flex items-center gap-2 mb-1">
                    {Number(reviewCount) > 0 && <StarRating rating={Number(ratingAvg)} count={reviewCount} size="xs" />}
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                    <span className="text-xs sm:product-card-price font-semibold text-warm-900">
                      {formatCurrency(discountPrice || price)}
                    </span>
                    {discountPrice && (
                      <span className="text-[10px] text-warm-400 line-through">{formatCurrency(price)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 min-w-0 py-1 px-2 bg-warm-900 text-white text-[10px] font-semibold rounded-md hover:bg-warm-800 transition-colors flex items-center justify-center gap-1"
                  >
                    <ShoppingBag className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">Quick Add</span>
                  </button>
                  <button
                    onClick={handleOpenQuickView}
                    className="p-1 border border-warm-200 rounded-md text-warm-600 hover:bg-warm-50 transition-colors shrink-0"
                    title="Quick View"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <QuickViewModal
          product={product}
          isOpen={quickViewOpen}
          onClose={() => setQuickViewOpen(false)}
        />
      </>
    );
  }

  // Default card
  return (
    <>
      <div className="group bg-white product-card rounded-xl border border-warm-200 hover:border-warm-300 hover:shadow-sm transition-shadow duration-200 overflow-hidden h-full flex flex-col">
        <Link href={`/products/${productSlug}`} className="flex flex-1 flex-col">
          {/* Image */}
          <div className="relative aspect-square sm:aspect-[6/5] bg-warm-50 overflow-hidden">
            {mainImage ? (
              <Image
                src={mainImage}
                alt={name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 48vw, (max-width: 1024px) 30vw, 20vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-warm-300 bg-warm-100">
                <Package className="w-7 h-7" />
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10">
              {isNew && (
                <span className="px-1.5 py-0.5 bg-warm-900 text-white text-[8px] font-bold rounded-full uppercase tracking-wider">
                  New
                </span>
              )}
              {discount > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[8px] font-bold rounded-full">
                  -{discount}%
                </span>
              )}
            </div>

            {/* Quick actions */}
            <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-100 pointer-events-auto sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:pointer-events-none sm:group-hover:pointer-events-auto sm:group-focus-within:pointer-events-auto transition-opacity duration-200 z-10">
              <button
                className={`w-9 h-9 rounded-full shadow-xs flex items-center justify-center transition-all ${isWishlisted
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-white/90 backdrop-blur-xs text-warm-700 hover:text-rose-600 hover:scale-105'
                  }`}
                aria-label="Wishlist"
                onClick={handleToggleWishlist}
              >
                <Heart className={`w-3 h-3 ${isWishlisted ? 'fill-white' : ''}`} />
              </button>
              <button
                className="w-9 h-9 bg-white/90 backdrop-blur-xs rounded-full shadow-xs flex items-center justify-center text-warm-700 hover:text-warm-900 hover:scale-105 transition-all"
                aria-label="Quick view"
                onClick={handleOpenQuickView}
              >
                <Eye className="w-3 h-3" />
              </button>
            </div>

          </div>

          {/* Info */}
          <div className="product-card-details flex-1 flex flex-col">
            {displayBrand && (
              <span className="text-[9px] font-semibold text-warm-500 uppercase tracking-wider block mb-0.5 truncate">
                {displayBrand}
              </span>
            )}
            <h3 className="product-card-title font-medium text-warm-900 line-clamp-2">
              {name}
            </h3>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-sm font-bold text-warm-900">
                {formatCurrency(discountPrice || price)}
              </span>
              {discountPrice && (
                <span className="text-[9px] sm:text-[10px] text-warm-400 line-through">{formatCurrency(price)}</span>
              )}
            </div>
            {Number(reviewCount) > 0 && <StarRating rating={Number(ratingAvg)} count={reviewCount} size="xs" />}
          </div>
        </Link>
        <div className="px-3 pb-3"><button type="button" onClick={handleAddToCart} className="product-card-cart flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-warm-900 px-2 text-xs font-medium leading-none text-white transition-colors hover:bg-warm-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"><ShoppingBag aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /><span>Add to Cart</span></button></div>
      </div>

      {quickViewOpen && (
        <QuickViewModal
          product={product}
          isOpen={quickViewOpen}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </>
  );
}
