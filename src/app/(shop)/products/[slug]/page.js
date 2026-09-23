'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
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
import ProductCard from '@/components/ui/ProductCard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ImageUpload from '@/components/ui/ImageUpload';
import { formatCurrency, isVideoUrl } from '@/lib/utils';
import { toWhatsAppLink } from '@/lib/zod-utils';
import {
  Frown,
  Package,
  CheckCircle,
  XCircle,
  ShoppingCart,
  Heart,
  Minus,
  Plus,
  Star,
  User,
  Film,
  X,
  FileText,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  AlertCircle,
} from 'lucide-react';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const toast = useToast();
  const user = useSelector(selectUser);

  const [product, setProduct] = useState(null);
  const isWishlisted = useSelector((state) =>
    product?.id ? selectIsWishlisted(product.id)(state) : false
  );
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [userHasOrdered, setUserHasOrdered] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', mediaUrls: [] });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [modalMedia, setModalMedia] = useState(null);

  // Gallery zoom & gesture states
  const [zoomPos, setZoomPos] = useState({ show: false, x: 0, y: 0 });
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ show: true, x, y });
  };

  const handleMouseLeave = () => {
    setZoomPos({ show: false, x: 0, y: 0 });
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 40 && selectedImage < (product?.images?.length || 1) - 1) {
      setSelectedImage((prev) => prev + 1);
    } else if (distance < -40 && selectedImage > 0) {
      setSelectedImage((prev) => prev - 1);
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const [whatsappNumber, setWhatsappNumber] = useState('');

  useEffect(() => {
    if (slug) {
      fetchProduct();
      fetchSettings();
    }
  }, [slug]);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (res.ok && data.settings?.whatsappNumber) {
        setWhatsappNumber(data.settings.whatsappNumber);
      } else {
        setWhatsappNumber('');
      }
    } catch {}
  }

  useEffect(() => {
    if (activeTab === 'reviews' && product) {
      fetchReviews();
    }
  }, [activeTab, product, user]);

  async function fetchProduct() {
    if (!slug) return;
    const slugStr = Array.isArray(slug) ? slug[0] : slug;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(slugStr)}`);
      const data = await res.json();
      if (res.ok && data.product) {
        setProduct(data.product);
        setLoading(false);

        // Fetch related products in background without blocking UI render
        if (data.product.categorySlug) {
          fetch(`/api/products?category=${encodeURIComponent(data.product.categorySlug)}&limit=6`)
            .then((r) => r.json())
            .then((relData) => {
              let items = (relData.products || []).filter((p) => p.id !== data.product.id);
              if (items.length < 4) {
                fetch('/api/products?limit=6')
                  .then((r) => r.json())
                  .then((fallbackData) => {
                    const fallbackItems = (fallbackData.products || []).filter((p) => p.id !== data.product.id);
                    setRelatedProducts(fallbackItems.slice(0, 6));
                  })
                  .catch(() => {});
              } else {
                setRelatedProducts(items.slice(0, 6));
              }
            })
            .catch(() => {});
        }
      } else {
        setProduct(null);
        setLoading(false);
      }
    } catch {
      setProduct(null);
      setLoading(false);
    }
  }

  async function fetchReviews() {
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(slug)}/reviews`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setUserHasOrdered(!!data.userHasOrdered);
      setUserReview(data.userReview || null);
    } catch {}
    setReviewsLoading(false);
  }

  function startEditingOwnReview() {
    if (!userReview) return;
    setReviewForm({
      rating: userReview.rating || 5,
      comment: userReview.comment || '',
      mediaUrls: Array.isArray(userReview.mediaUrls) ? userReview.mediaUrls : [],
    });
    setIsEditingReview(true);
  }

  async function handleDeleteOwnReview() {
    if (!userReview) return;
    if (!confirm('Are you sure you want to delete your review?')) return;
    try {
      const res = await fetch(`/api/products/${slug}/reviews/${userReview.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Your review was deleted');
        setIsEditingReview(false);
        setReviewForm({ rating: 5, comment: '', mediaUrls: [] });
        fetchReviews();
        fetchProduct();
      } else {
        toast.error(data.error || 'Failed to delete review');
      }
    } catch {
      toast.error('Network error');
    }
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to submit a review');
      return;
    }
    if (!reviewForm.rating && (!reviewForm.comment || !reviewForm.comment.trim())) {
      toast.error('Please provide either a star rating or a review comment');
      return;
    }
    setSubmittingReview(true);
    try {
      const isEdit = isEditingReview && userReview?.id;
      const endpoint = isEdit
        ? `/api/products/${slug}/reviews/${userReview.id}`
        : `/api/products/${slug}/reviews`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(isEdit ? 'Review updated successfully!' : 'Review submitted successfully!');
        setIsEditingReview(false);
        setReviewForm({ rating: 5, comment: '', mediaUrls: [] });
        fetchReviews();
        fetchProduct();
      } else {
        toast.error(data.error || 'Failed to submit review');
      }
    } catch {
      toast.error('Network error');
    }
    setSubmittingReview(false);
  }

  const [selectedAddons, setSelectedAddons] = useState([]);
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const isOutOfStock = product?.isOutOfStock || product?.stock <= 0;

  async function handleCheckPincode(e) {
    if (e) e.preventDefault();
    const cleaned = pincodeInput.replace(/\D/g, '').slice(0, 6);
    if (cleaned.length !== 6) {
      setPincodeStatus({ type: 'error', message: 'Please enter a valid 6-digit pincode' });
      return;
    }
    setPincodeLoading(true);
    setPincodeStatus(null);
    try {
      const res = await fetch(`/api/pincode/check?pincode=${cleaned}`);
      const data = await res.json();
      if (res.ok && data.serviceable) {
        setPincodeStatus({
          type: 'success',
          message: data.message || 'Delivery available (Est. 3-7 business days)',
        });
      } else {
        setPincodeStatus({ type: 'error', message: data.error || 'Please enter a valid 6-digit pincode' });
      }
    } catch {
      setPincodeStatus({ type: 'success', message: 'Delivery available (Est. 3-7 business days)' });
    }
    setPincodeLoading(false);
  }

  function toggleAddon(addon) {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.id === addon.id);
      if (exists) {
        return prev.filter((a) => a.id !== addon.id);
      } else {
        return [...prev, { ...addon, quantity: 1 }];
      }
    });
  }

  function updateAddonQty(addonId, newQty) {
    setSelectedAddons((prev) =>
      prev.map((a) => (a.id === addonId ? { ...a, quantity: Math.max(1, newQty) } : a))
    );
  }

  function handleAddToCart() {
    if (!product || isOutOfStock) return;
    dispatch(
      addItem({
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0] || '',
        price: Number(product.price),
        discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
        codAvailable: product.codAvailable !== false,
        quantity,
        selectedAddons,
      })
    );
    toast.success(`${product.name} added to cart!`);
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        <div className="h-3.5 w-40 bg-warm-100 rounded-md animate-pulse" />
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="aspect-square rounded-md bg-warm-100 animate-pulse" />
          <div className="space-y-3">
            <div className="h-6 w-3/4 bg-warm-100 rounded-md animate-pulse" />
            <div className="h-5 w-1/3 bg-warm-100 rounded-md animate-pulse" />
            <div className="h-9 w-1/2 bg-warm-100 rounded-md animate-pulse" />
            <div className="h-16 bg-warm-100 rounded-md animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-14 text-center">
        <Frown className="w-9 h-9 mx-auto text-warm-300 mb-2.5" />
        <h2 className="text-lg font-bold text-warm-900 mb-1.5">Product Not Found</h2>
        <p className="text-[11px] text-warm-500 mb-4">
          This product may have been removed or is temporarily unavailable.
        </p>
        <Link
          href="/products"
          className="px-3.5 py-2 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors inline-block"
        >
          Browse All Products
        </Link>
      </div>
    );
  }

  const discount = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;
  const images = product.images?.length > 0 ? product.images : [];
  const specifications = Array.isArray(product.specifications) ? product.specifications : [];

  const breadcrumbItems = [
    { label: 'Products', href: '/products' },
    ...(product.categoryName
      ? [{ label: product.categoryName, href: `/categories/${product.categorySlug}` }]
      : []),
    { label: product.name },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-5">
      {/* Breadcrumb */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Main Product Showcase */}
      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Gallery Container with relative positioning for side zoom box */}
        <div className="relative space-y-2 w-full max-w-sm sm:max-w-md mx-auto lg:mx-0">
          {/* Flipkart-style desktop magnified side-by-side zoom panel */}
          {zoomPos.show && images.length > 0 && !isVideoUrl(images[selectedImage]) && (
            <div
              className="hidden lg:block absolute left-[calc(100%+1.25rem)] top-0 w-[420px] h-[420px] z-40 bg-white border-2 border-warm-300 rounded-xl shadow-2xl overflow-hidden pointer-events-none"
              style={{
                backgroundImage: `url(${images[selectedImage]})`,
                backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                backgroundSize: '250%',
              }}
            />
          )}

          <div
            className="relative aspect-square rounded-md overflow-hidden bg-warm-50 border border-warm-200 shadow-xs group"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {images.length > 0 ? (
              isVideoUrl(images[selectedImage]) ? (
                <video
                  src={images[selectedImage]}
                  controls
                  autoPlay
                  muted
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <>
                  <Image
                    src={images[selectedImage]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                  {/* Hover bounding lens on main image */}
                  {zoomPos.show && (
                    <div
                      className="hidden lg:block absolute pointer-events-none z-10 border border-brand-600/70 bg-brand-500/20 shadow-xs rounded-sm"
                      style={{
                        width: '35%',
                        height: '35%',
                        left: `clamp(0%, ${zoomPos.x - 17.5}%, 65%)`,
                        top: `clamp(0%, ${zoomPos.y - 17.5}%, 65%)`,
                      }}
                    />
                  )}
                </>
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-warm-300">
                <Package className="w-12 h-12" />
              </div>
            )}

            {discount > 0 && (
              <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-md uppercase tracking-wider z-20">
                -{discount}% OFF
              </span>
            )}

            {/* Prev / Next Slide Arrows (z-30 so always above lens and clickable) */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-warm-900 shadow-md flex items-center justify-center transition-all z-30 cursor-pointer"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-warm-900 shadow-md flex items-center justify-center transition-all z-30 cursor-pointer"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
              {images.map((img, i) => {
                const isVid = isVideoUrl(img);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`relative w-14 h-14 sm:w-12 sm:h-12 rounded-md overflow-hidden shrink-0 border-2 transition-all ${
                      selectedImage === i
                        ? 'border-brand-600 ring-2 ring-brand-600/10'
                        : 'border-warm-200 hover:border-warm-300'
                    }`}
                  >
                    {isVid ? (
                      <div className="w-full h-full bg-black flex items-center justify-center relative">
                        <video src={img} className="w-full h-full object-cover opacity-60" muted />
                        <Film className="w-4 h-4 text-white absolute" />
                      </div>
                    ) : (
                      <Image src={img} alt="" fill className="object-cover" sizes="54px" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Details & Actions */}
        <div className="space-y-3.5">
          <div>
            {product.categoryName && (
              <Link
                href={`/categories/${product.categorySlug}`}
                className="text-[10px] font-semibold text-brand-600 hover:underline uppercase tracking-wider"
              >
                {product.categoryName}
              </Link>
            )}
            <h1 className="text-lg sm:text-xl font-bold text-warm-900 tracking-tight mt-1">
              {product.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <StarRating rating={Number(product.ratingAvg)} count={product.reviewCount} size="sm" />
            <span className="text-[10px] text-warm-400">|</span>
            <button
              onClick={() => setActiveTab('reviews')}
              className="text-[10px] text-warm-600 hover:text-brand-600 font-medium hover:underline"
            >
              {product.reviewCount} customer review{product.reviewCount !== 1 ? 's' : ''}
            </button>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-xl font-extrabold text-warm-900">
              {formatCurrency(product.discountPrice || product.price)}
            </span>
            {product.discountPrice && (
              <>
                <span className="text-[12px] text-warm-400 line-through">{formatCurrency(product.price)}</span>
                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200">
                  Save {formatCurrency(product.price - product.discountPrice)}
                </span>
              </>
            )}
          </div>

          {/* Stock Availability */}
          <div>
            {!isOutOfStock ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <CheckCircle className="w-3 h-3" /> In Stock ({product.stock} units available)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
                <XCircle className="w-3.5 h-3.5" /> Out of Stock
              </span>
            )}
          </div>

          {/* Pincode Delivery Check (Part 3) */}
          <div className="bg-warm-50/80 border border-warm-200 rounded-lg p-3 space-y-2">
            <label className="block text-[11px] font-semibold text-warm-900">
              Check Delivery Availability
            </label>
            <form onSubmit={handleCheckPincode} className="flex gap-2">
              <input
                type="text"
                value={pincodeInput}
                onChange={(e) => {
                  setPincodeInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setPincodeStatus(null);
                }}
                placeholder="Enter 6-digit Pincode"
                className="flex-1 px-3 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
              />
              <button
                type="submit"
                disabled={pincodeLoading}
                className="px-3.5 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors disabled:opacity-50"
              >
                {pincodeLoading ? 'Checking...' : 'Check'}
              </button>
            </form>
            {pincodeStatus && (
              <p
                className={`text-[11px] font-medium flex items-center gap-1 ${
                  pincodeStatus.type === 'success' ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {pincodeStatus.type === 'success' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                )}
                <span>{pincodeStatus.message}</span>
              </p>
            )}
          </div>

          {/* Product Add-ons (Part 5) */}
          {Array.isArray(product.addons) && product.addons.length > 0 && (
            <div className="bg-white border border-warm-200 rounded-lg p-3 space-y-2">
              <span className="block text-[11px] font-bold text-warm-900 uppercase tracking-wider">
                Optional Add-ons
              </span>
              <div className="space-y-2">
                {product.addons.map((addon) => {
                  const selectedAddon = selectedAddons.find((a) => a.id === addon.id);
                  const isChecked = Boolean(selectedAddon);
                  const addonQty = selectedAddon?.quantity || 1;
                  return (
                    <div
                      key={addon.id}
                      className={`flex flex-wrap items-center justify-between gap-2 p-2 rounded-md border text-[11px] transition-colors ${
                        isChecked
                          ? 'border-brand-600 bg-brand-50/30 font-semibold'
                          : 'border-warm-200 bg-warm-50/40 hover:bg-warm-50'
                      }`}
                    >
                      <label
                        onClick={() => toggleAddon(addon)}
                        className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-warm-300 text-brand-600 focus:ring-brand-500"
                        />
                        {addon.imageUrl ? (
                          <img
                            src={addon.imageUrl}
                            alt={addon.name || ''}
                            className="w-8 h-8 rounded object-cover border border-warm-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-warm-100 border border-warm-200 flex items-center justify-center text-warm-400 shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <span className="text-warm-900 truncate">{addon.name}</span>
                      </label>

                      <div className="flex items-center gap-2 shrink-0">
                        {isChecked && (
                          <div className="flex items-center border border-warm-300 rounded overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateAddonQty(addon.id, addonQty - 1);
                              }}
                              disabled={addonQty <= 1}
                              className="px-1.5 py-0.5 text-warm-600 hover:bg-warm-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Decrease add-on quantity"
                            >
                              -
                            </button>
                            <span className="px-2 text-[10px] font-bold text-warm-900 min-w-[20px] text-center">
                              {addonQty}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateAddonQty(addon.id, addonQty + 1);
                              }}
                              className="px-1.5 py-0.5 text-warm-600 hover:bg-warm-100 cursor-pointer"
                              title="Increase add-on quantity"
                            >
                              +
                            </button>
                          </div>
                        )}
                        <span className="font-bold text-brand-700">
                          {addon.isFree ? 'Free' : `+${formatCurrency(Number(addon.price) * (isChecked ? addonQty : 1))}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Short Description */}
          {product.description && (
            <p className="text-[11px] sm:text-[12px] text-warm-600 leading-relaxed border-t border-b border-warm-100 py-3 line-clamp-3">
              {product.description}
            </p>
          )}

          {/* Quantity & Cart Action */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1.5">
            {!isOutOfStock && (
              <div className="flex items-center border border-warm-200 rounded-md overflow-hidden shrink-0 bg-white">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 text-warm-600 hover:bg-warm-50 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 py-2 text-warm-900 font-bold text-[11px] sm:text-[12px] text-center min-w-[40px]">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="p-2 text-warm-600 hover:bg-warm-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] sm:text-[12px] font-semibold rounded-md transition-all shadow-xs ${
                isOutOfStock
                  ? 'bg-warm-200 text-warm-400 cursor-not-allowed border border-warm-300'
                  : 'bg-warm-900 text-white hover:bg-warm-800 active:scale-[0.99]'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
            </button>

            <button
              onClick={async () => {
                if (!product) return;
                if (isWishlisted) {
                  dispatch(removeFromWishlist(product.id));
                  toast.info(`Removed ${product.name} from wishlist`);
                  if (user) {
                    try { await fetch(`/api/wishlist/${product.id}`, { method: 'DELETE' }); } catch {}
                  }
                } else {
                  dispatch(addToWishlist(product));
                  toast.success(`Added ${product.name} to wishlist!`);
                  if (user) {
                    try {
                      await fetch('/api/wishlist', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productId: product.id }),
                      });
                    } catch {}
                  }
                }
              }}
              className={`p-2 border rounded-md transition-colors shrink-0 ${
                isWishlisted
                  ? 'border-rose-300 bg-rose-50 text-rose-600'
                  : 'border-warm-200 text-warm-500 hover:text-rose-600 hover:bg-rose-50'
              }`}
              title={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
            >
              <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-600' : ''}`} />
            </button>
          </div>

          {/* WhatsApp Contact Action */}
          {whatsappNumber && whatsappNumber.trim() !== '' && (
            <button
              type="button"
              onClick={() => {
                const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
                const text = `Hi! I'm interested in *${product.name}*: ${currentUrl}`;
                const waUrl = toWhatsAppLink(whatsappNumber, text);
                window.open(waUrl, '_blank');
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-[11px] sm:text-[12px] font-bold rounded-md transition-all shadow-xs cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 fill-white/20" />
              <span>Contact on WhatsApp</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs: Description / Specifications / Reviews */}
      <div className="border-t border-warm-200/80 pt-5">
        <div className="flex gap-4 border-b border-warm-200 pb-px">
          <button
            onClick={() => setActiveTab('description')}
            className={`pb-2 text-[11px] sm:text-[12px] font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'description'
                ? 'border-warm-900 text-warm-900'
                : 'border-transparent text-warm-500 hover:text-warm-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Overview & Details</span>
          </button>

          <button
            onClick={() => setActiveTab('specifications')}
            className={`pb-2 text-[11px] sm:text-[12px] font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'specifications'
                ? 'border-warm-900 text-warm-900'
                : 'border-transparent text-warm-500 hover:text-warm-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Specifications ({specifications.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-2 text-[11px] sm:text-[12px] font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'reviews'
                ? 'border-warm-900 text-warm-900'
                : 'border-transparent text-warm-500 hover:text-warm-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Customer Reviews ({product.reviewCount})</span>
          </button>
        </div>

        {/* Tab 1: Description */}
        {activeTab === 'description' && (
          <div className="py-4 max-w-3xl">
            <p className="text-[11px] sm:text-[12px] text-warm-700 leading-relaxed whitespace-pre-wrap">
              {product.description || 'No detailed description available for this item.'}
            </p>
          </div>
        )}

        {/* Tab 2: Specifications */}
        {activeTab === 'specifications' && (
          <div className="py-4 max-w-2xl">
            {specifications.length === 0 ? (
              <p className="text-[11px] text-warm-500">No specifications listed for this product.</p>
            ) : (
              <div className="border border-warm-200 rounded-md overflow-hidden bg-white shadow-xs">
                <table className="w-full text-[11px] sm:text-[12px]">
                  <tbody className="divide-y divide-warm-100">
                    {specifications.map((spec, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-warm-50/40'}>
                        <td className="px-3 py-2 font-semibold text-warm-900 w-1/3 border-r border-warm-100">
                          {spec.label}
                        </td>
                        <td className="px-3 py-2 text-warm-700">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Reviews with Media Upload & Gallery */}
        {activeTab === 'reviews' && (
          <div className="py-4 max-w-3xl space-y-5">
            {!user ? (
              <div className="p-4 bg-warm-50 border border-warm-200 rounded-md text-[11px] sm:text-[12px] text-warm-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warm-500 shrink-0" />
                  <span>Please sign in to leave a review for products you've purchased.</span>
                </div>
                <Link
                  href="/login"
                  className="px-3 py-1 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors shrink-0"
                >
                  Sign In
                </Link>
              </div>
            ) : !userHasOrdered ? (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-md text-[11px] sm:text-[12px] text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Verified Purchase Required</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Only customers who have purchased this product can leave a review. Once your order is placed, you'll be able to rate and share feedback here.
                  </p>
                </div>
              </div>
            ) : userReview && !isEditingReview ? (
              <div className="p-4 bg-warm-50/80 border border-warm-200 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-warm-900 text-white text-[10px] font-bold rounded-md uppercase tracking-wider">
                      Your Review
                    </span>
                    <span className="text-[11px] text-warm-500">
                      {new Date(userReview.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={startEditingOwnReview}
                      className="px-2.5 py-1 bg-white border border-warm-300 text-warm-800 hover:text-brand-600 hover:border-brand-300 text-[11px] font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Review</span>
                    </button>
                    <button
                      onClick={handleDeleteOwnReview}
                      className="px-2 py-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                      title="Delete review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {userReview.rating && userReview.rating > 0 ? (
                  <StarRating rating={userReview.rating} size="sm" />
                ) : null}

                {userReview.comment && (
                  <p className="text-[11px] sm:text-[12px] text-warm-800 leading-relaxed">{userReview.comment}</p>
                )}

                {Array.isArray(userReview.mediaUrls) && userReview.mediaUrls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pt-1">
                    {userReview.mediaUrls.map((mediaUrl, idx) => {
                      const isVid = isVideoUrl(mediaUrl);
                      return (
                        <div
                          key={idx}
                          onClick={() => setModalMedia(mediaUrl)}
                          className="relative w-14 h-14 rounded-md overflow-hidden border border-warm-200 bg-warm-100 shrink-0 cursor-pointer group hover:border-brand-600 transition-colors"
                        >
                          {isVid ? (
                            <>
                              <video src={mediaUrl} className="w-full h-full object-cover" muted />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Film className="w-4 h-4 text-white" />
                              </div>
                            </>
                          ) : (
                            <img src={mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="p-3.5 sm:p-4 bg-white border border-warm-200 rounded-md space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-bold text-warm-900">
                    {isEditingReview ? 'Edit Your Review' : 'Write a Customer Review'}
                  </h3>
                  {isEditingReview && (
                    <button
                      type="button"
                      onClick={() => setIsEditingReview(false)}
                      className="text-[11px] text-warm-500 hover:text-warm-800 font-medium"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-warm-700 mb-1">Your Rating</label>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="p-0.5 text-warm-300 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            star <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-warm-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-warm-700 mb-1">Review Comment</label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    rows={3}
                    className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] sm:text-[12px] text-warm-900 focus:outline-none focus:border-brand-600 resize-none"
                    placeholder="Share your thoughts on quality, sizing, delivery..."
                  />
                </div>

                {/* Upload Photos or Short Video */}
                <div>
                  <ImageUpload
                    uploadType="review-media"
                    value={reviewForm.mediaUrls || []}
                    onChange={(urls) => setReviewForm({ ...reviewForm, mediaUrls: urls })}
                    multiple={true}
                    maxFiles={5}
                    maxSizeMB={50}
                    label="Attach Photos or Short Video Clips (Optional)"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={submittingReview || (!reviewForm.rating && !reviewForm.comment?.trim())}
                    className="px-3.5 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                  >
                    {submittingReview ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{submittingReview ? 'Saving...' : isEditingReview ? 'Update Review' : 'Submit Review'}</span>
                  </button>
                  {isEditingReview && (
                    <button
                      type="button"
                      onClick={() => setIsEditingReview(false)}
                      className="px-3 py-1.5 border border-warm-200 text-warm-600 text-[11px] font-semibold rounded-md hover:bg-warm-50 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Reviews List */}
            {reviewsLoading ? (
              <div className="space-y-2.5">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-warm-100 rounded-md animate-pulse" />
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="p-3.5 bg-white border border-warm-200 rounded-md space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-warm-100 text-warm-800 font-bold text-[10px] rounded-md flex items-center justify-center">
                          {review.userName?.[0]?.toUpperCase() || <User className="w-3.5 h-3.5 text-warm-500" />}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-warm-900">{review.userName || 'Verified Buyer'}</p>
                          <p className="text-[9px] text-warm-400">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {review.rating && review.rating > 0 ? (
                        <StarRating rating={review.rating} size="sm" />
                      ) : null}
                    </div>

                    {review.comment && (
                      <p className="text-[11px] sm:text-[12px] text-warm-700 leading-relaxed">{review.comment}</p>
                    )}

                    {/* Review Attached Media Gallery */}
                    {Array.isArray(review.mediaUrls) && review.mediaUrls.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pt-0.5">
                        {review.mediaUrls.map((mediaUrl, idx) => {
                          const isVid = isVideoUrl(mediaUrl);
                          return (
                            <div
                              key={idx}
                              onClick={() => setModalMedia(mediaUrl)}
                              className="relative w-14 h-14 rounded-md overflow-hidden border border-warm-200 bg-warm-100 shrink-0 cursor-pointer group hover:border-brand-600 transition-colors"
                            >
                              {isVid ? (
                                <>
                                  <video src={mediaUrl} className="w-full h-full object-cover" muted />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Film className="w-4 h-4 text-white" />
                                  </div>
                                </>
                              ) : (
                                <img src={mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-warm-500 text-center py-6">
                No reviews yet. Be the first to share your thoughts!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Related Products Section ("You May Also Like") */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-warm-200/80 pt-6">
          <h2 className="text-base sm:text-lg font-bold text-warm-900 mb-4">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal for Review Media */}
      {modalMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalMedia(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-md bg-black">
            <button
              onClick={() => setModalMedia(null)}
              className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X className="w-4 h-4" />
            </button>
            {isVideoUrl(modalMedia) ? (
              <video src={modalMedia} controls autoPlay className="max-h-[80vh] w-auto mx-auto" />
            ) : (
              <img src={modalMedia} alt="" className="max-h-[80vh] w-auto mx-auto object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}