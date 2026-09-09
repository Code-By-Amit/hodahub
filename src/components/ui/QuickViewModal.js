'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
import { formatCurrency } from '@/lib/utils';
import { X, ShoppingBag, Heart, Package, ArrowRight, Minus, Plus } from 'lucide-react';

export default function QuickViewModal({ product, isOpen, onClose }) {
  const dispatch = useDispatch();
  const toast = useToast();
  const user = useSelector(selectUser);

  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const isWishlisted = useSelector(
    (state) => product?.id ? selectIsWishlisted(product.id)(state) : false
  );

  useEffect(() => {
    setSelectedImgIndex(0);
    setQuantity(1);
  }, [product]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const {
    id,
    name,
    slug,
    price,
    discountPrice,
    images = [],
    description,
    ratingAvg,
    reviewCount,
    codAvailable,
    stock = 10,
  } = product;

  const mainImage = images[selectedImgIndex] || images[0] || '';
  const discount = discountPrice
    ? Math.round(((price - discountPrice) / price) * 100)
    : 0;

  const handleAddToCart = () => {
    dispatch(
      addItem({
        productId: id,
        name,
        slug,
        image: images[0] || '',
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : null,
        codAvailable: codAvailable !== false,
        quantity,
      })
    );
    toast.success(`${quantity} x ${name} added to cart!`);
    onClose();
  };

  const handleToggleWishlist = async () => {
    if (isWishlisted) {
      dispatch(removeFromWishlist(id));
      toast.info('Removed from wishlist');
      if (user) {
        try {
          await fetch(`/api/wishlist/${id}`, { method: 'DELETE' });
        } catch {}
      }
    } else {
      dispatch(addToWishlist(product));
      toast.success('Added to wishlist!');
      if (user) {
        try {
          await fetch('/api/wishlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: id }),
          });
        } catch {}
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-3xl bg-white rounded-md shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-warm-400 hover:text-warm-900 rounded-full hover:bg-warm-100 transition-colors z-20"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
            {/* Image Gallery */}
            <div className="space-y-3">
              <div className="relative aspect-square rounded-md bg-warm-50 border border-warm-200 overflow-hidden">
                {mainImage ? (
                  <Image
                    src={mainImage}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-warm-300">
                    <Package className="w-16 h-16" />
                  </div>
                )}

                {discount > 0 && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 bg-rose-600 text-white text-xs font-bold rounded-full">
                    -{discount}% OFF
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImgIndex(idx)}
                      className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        selectedImgIndex === idx
                          ? 'border-warm-900 ring-2 ring-warm-900/20'
                          : 'border-warm-200 hover:border-warm-400'
                      }`}
                    >
                      <Image src={img} alt="" fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-md font-bold text-warm-900 tracking-tight mb-2">
                  {name}
                </h2>

                <div className="flex items-center gap-2 mb-2">
                  <StarRating rating={Number(ratingAvg)} count={reviewCount} />
                  <span className="text-[11px] text-warm-400">|</span>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    In Stock ({stock})
                  </span>
                </div>

                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-[15px] font-extrabold text-warm-900">
                    {formatCurrency(discountPrice || price)}
                  </span>
                  {discountPrice && (
                    <span className="text-[15px] text-warm-400 line-through">
                      {formatCurrency(price)}
                    </span>
                  )}
                </div>

                <p className="text-[12px] text-warm-600 leading-relaxed line-clamp-3 mb-6">
                  {description || 'High quality curated product designed for premium everyday use.'}
                </p>
              </div>

              {/* Action Buttons & Quantity */}
              <div className="space-y-4 pt-4 border-t border-warm-100">
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-bold text-warm-700 uppercase tracking-wider">
                    Quantity:
                  </span>
                  <div className="flex items-center border border-warm-200 rounded-md bg-warm-50">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 text-warm-600 hover:text-warm-900 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-4 text-center text-[12px] font-bold text-warm-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-2 text-warm-600 hover:text-warm-900 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 py-2 bg-warm-900 text-white text-[11px] font-bold rounded-md hover:bg-warm-800 transition-colors flex items-center justify-center gap-2 shadow-xs"
                  >
                    <ShoppingBag className="w-3 h-3" />
                    Add to Cart ({formatCurrency((discountPrice || price) * quantity)})
                  </button>

                  <button
                    onClick={handleToggleWishlist}
                    className={`p-2 border rounded-md transition-all ${ isWishlisted ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-warm-200 text-warm-700 hover:bg-warm-50' }`} aria-label="Toggle wishlist" >
                    <Heart className={`w-3 h-3 ${isWishlisted ? 'fill-rose-600' : ''}`} />
                  </button>
                </div>

                <div className="pt-2 text-center">
                  <Link
                    href={`/products/${slug}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline"
                  >
                    View Full Details <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
