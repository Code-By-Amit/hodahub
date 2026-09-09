'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartCoupon,
  updateQuantity,
  removeItem,
  applyCoupon,
  removeCoupon,
} from '@/lib/store/cartSlice';
import { useToast } from '@/components/ui/Toast';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBag, Package, Trash2, Minus, Plus, Tag, ArrowRight, Check } from 'lucide-react';

export default function CartPage() {
  const dispatch = useDispatch();
  const toast = useToast();
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const coupon = useSelector(selectCartCoupon);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  const discount = coupon
    ? coupon.type === 'percent'
      ? (subtotal * coupon.value) / 100
      : Math.min(coupon.value, subtotal)
    : 0;
  const total = Math.max(0, subtotal - discount);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });
      const data = await res.json();
      if (res.ok) {
        dispatch(
          applyCoupon({
            code: data.coupon.code,
            type: data.coupon.type,
            value: Number(data.coupon.value),
            discount: data.discount,
          })
        );
        toast.success('Coupon code applied!');
        setCouponCode('');
      } else {
        setCouponError(data.error);
      }
    } catch {
      setCouponError('Failed to validate coupon');
    }
    setCouponLoading(false);
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-white border border-warm-200 rounded-xl p-12 max-w-md mx-auto">
          <ShoppingBag className="w-12 h-12 mx-auto text-warm-300 mb-4" />
          <h1 className="text-md font-bold text-warm-900 mb-2">Your Shopping Cart is Empty</h1>
          <p className="text-[11px] text-warm-500 mb-6">
            Looks like you haven&apos;t added any products to your cart yet.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-warm-900 text-white text-xs font-semibold rounded-lg hover:bg-warm-800 transition-all"
          >
            <span>Browse Products</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <Breadcrumbs items={[{ label: 'Cart' }]} />

      <div className="border-b border-warm-200/80 pb-4">
        <h1 className="text-md font-bold text-warm-900 tracking-tight">Shopping Cart</h1>
        <p className="text-[11px] text-warm-500 mt-1">
          Review your selected items ({items.reduce((s, i) => s + i.quantity, 0)} total)
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex gap-4 p-2.5 bg-white border border-warm-200 rounded-xl shadow-2xs items-center"
            >
              <Link
                href={`/products/${item.slug}`}
                className="relative w-20 h-20 rounded-md overflow-hidden bg-warm-50 border border-warm-100 shrink-0"
              >
                {item.image ? (
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="96px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-warm-300">
                    <Package className="w-8 h-8" />
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${item.slug}`}
                  className="text-[14px] font-semibold text-warm-900 hover:text-brand-600 transition-colors line-clamp-1"
                >
                  {item.name}
                </Link>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-[11px] font-bold text-warm-900">
                    {formatCurrency(item.discountPrice || item.price)}
                  </span>
                  {item.discountPrice && (
                    <span className="text-[11px] text-warm-400 line-through">{formatCurrency(item.price)}</span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-warm-200 rounded-lg overflow-hidden bg-white">
                    <button
                      onClick={() =>
                        dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity - 1 }))
                      }
                      className="p-1.5 text-warm-600 hover:bg-warm-50 transition-colors"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="px-3 py-1 text-[11px] font-bold text-warm-900 min-w-[32px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity + 1 }))
                      }
                      className="p-1.5 text-warm-600 hover:bg-warm-50 transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      dispatch(removeItem(item.productId));
                      toast.info('Item removed from cart');
                    }}
                    className="p-1.5 text-warm-400 hover:text-red-600 rounded-lg transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-warm-200 rounded-xl p-4 space-y-3 shadow-xs sticky top-24">
            <h2 className="text-[11px] font-bold text-warm-900 border-b border-warm-100 pb-3">
              Order Summary
            </h2>

            {/* Coupon Code Input */}
            <div>
              {coupon ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-md text-[11px]">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <Tag className="w-2.5 h-2.5 text-emerald-600" />
                    <span>{coupon.code} Applied</span>
                  </div>
                  <button
                    onClick={() => dispatch(removeCoupon())}
                    className="text-[11px] text-red-600 font-semibold hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError('');
                      }}
                      placeholder="Coupon Code"
                      className="flex-1 px-3 py-1,5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 uppercase focus:outline-none focus:border-brand-600"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                      className="px-4 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-[11px] text-red-600 font-medium">{couponError}</p>}
                </div>
              )}
            </div>

            {/* Calculations */}
            <div className="space-y-2.5 text-[11px] text-warm-700 pt-2 border-t border-warm-100">
              <div className="flex justify-between">
                <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="font-semibold text-warm-900">{formatCurrency(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount ({coupon?.code})</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Estimated Shipping</span>
                <span className="font-semibold text-emerald-700">Calculated at Checkout</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-warm-900 border-t border-warm-200 pt-3">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full flex items-center justify-center gap-2 py-2 bg-warm-900 text-white text-[12px] font-semibold rounded-md hover:bg-warm-800 active:scale-[0.99] transition-all shadow-xs"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
