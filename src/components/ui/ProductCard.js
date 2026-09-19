'use client';

import { useState } from 'react';
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
import { useToast } from '@/components/ui/Toast';
import StarRating from '@/components/ui/StarRating';
import QuickViewModal from '@/components/ui/QuickViewModal';
import { formatCurrency } from '@/lib/utils';
import { Heart, ShoppingBag, Eye, Package } from 'lucide-react';

export default function ProductCard({ product, variant = 'default' }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const user = useSelector(selectUser);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const {
    id, name, slug, price, discountPrice, images, description,
    ratingAvg, reviewCount, createdAt
  } = product || {};

  const productSlug = slug || id;
  const isWishlisted = useSelector(selectIsWishlisted(id));

  const mainImage = images?.[0] || '';
  const discount = discountPrice
    ? Math.round(((price - discountPrice) / price) * 100)
    : 0;

  const isNew = createdAt && (Date.now() - new Date(createdAt).getTime()) < 14 * 24 * 60 * 60 * 1000;

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
          await fetch(`/api/wishlist/${id}`, { method: 'DELETE' });
        } catch { }
      }
    } else {
      dispatch(addToWishlist(product));
      toast.success(`Added ${name} to wishlist!`);
      if (user) {
        try {
          await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: id }),
          });
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
                  <h3 className="text-[11px] sm:text-xs font-semibold text-warm-900 line-clamp-1 mb-0.5">
                    {name}
                  </h3>
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating rating={Number(ratingAvg)} count={reviewCount} size="xs" />
                  </div>
                  <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                    <span className="text-xs sm:text-sm font-bold text-warm-900">
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
      <div className="group bg-white rounded-md border border-warm-200 hover:border-warm-300 hover:shadow-xs transition-all duration-200 overflow-hidden h-full flex flex-col">
        <Link href={`/products/${productSlug}`} className="flex flex-col h-full">
          {/* Image */}
          <div className="relative aspect-square bg-warm-50 overflow-hidden">
            {mainImage ? (
              <Image
                src={mainImage}
                alt={name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 14vw"
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
            <div className="absolute top-1.5 right-1.5 flex flex-col gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200 z-10">
              <button
                className={`w-6 h-6 rounded-full shadow-xs flex items-center justify-center transition-all ${isWishlisted
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-white/90 backdrop-blur-xs text-warm-700 hover:text-rose-600 hover:scale-105'
                  }`}
                aria-label="Wishlist"
                onClick={handleToggleWishlist}
              >
                <Heart className={`w-3 h-3 ${isWishlisted ? 'fill-white' : ''}`} />
              </button>
              <button
                className="w-6 h-6 bg-white/90 backdrop-blur-xs rounded-full shadow-xs flex items-center justify-center text-warm-700 hover:text-warm-900 hover:scale-105 transition-all"
                aria-label="Quick view"
                onClick={handleOpenQuickView}
              >
                <Eye className="w-3 h-3" />
              </button>
            </div>

            {/* Add to cart button overlay */}
            <div className="absolute bottom-1.5 left-1.5 right-1.5 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-10">
              <button
                onClick={handleAddToCart}
                className="w-full py-1.5 bg-warm-900 text-white text-[10px] font-semibold rounded-md hover:bg-warm-800 transition-colors flex items-center justify-center gap-1 shadow-sm"
              >
                <ShoppingBag className="w-3 h-3" />
                Add to Cart
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="p-2 flex-1 flex flex-col">
            <h3 className="text-[10px] sm:text-[11px] font-semibold text-warm-900 line-clamp-1 mb-0.5">
              {name}
            </h3>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-[11px] sm:text-xs font-bold text-warm-900">
                {formatCurrency(discountPrice || price)}
              </span>
              {discountPrice && (
                <span className="text-[9px] sm:text-[10px] text-warm-400 line-through">{formatCurrency(price)}</span>
              )}
            </div>
            <StarRating rating={Number(ratingAvg)} count={reviewCount} size="xs" />
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