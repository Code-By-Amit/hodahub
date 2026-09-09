'use client';

import { useState, useEffect } from 'react';
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
import { formatCurrency } from '@/lib/utils';
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
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '', mediaUrls: [] });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [modalMedia, setModalMedia] = useState(null);

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    if (activeTab === 'reviews' && product) {
      fetchReviews();
    }
  }, [activeTab, product]);

  async function fetchProduct() {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${slug}`);
      const data = await res.json();
      if (res.ok) {
        setProduct(data.product);
        // Fetch related products
        if (data.product.categorySlug) {
          const relRes = await fetch(`/api/products?category=${data.product.categorySlug}&limit=6`);
          const relData = await relRes.json();
          let items = (relData.products || []).filter((p) => p.id !== data.product.id);
          // Fallback if category has < 4 products
          if (items.length < 4) {
            const fallbackRes = await fetch('/api/products?limit=6');
            const fallbackData = await fallbackRes.json();
            items = (fallbackData.products || []).filter((p) => p.id !== data.product.id);
          }
          setRelatedProducts(items.slice(0, 6));
        }
      }
    } catch {}
    setLoading(false);
  }

  async function fetchReviews() {
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/products/${slug}/reviews`);
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch {}
    setReviewsLoading(false);
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to submit a review');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${slug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Review submitted successfully!');
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

  function handleAddToCart() {
    if (!product) return;
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
      })
    );
    toast.success(`${product.name} added to cart!`);
  }

  const isVideoUrl = (url) => {
    if (!url) return false;
    return (
      url.match(/\.(mp4|webm|mov|avi|mkv)($|\?)/i) ||
      url.includes('/video/upload/') ||
      url.endsWith('.mp4')
    );
  };

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
        {/* Gallery */}
        <div className="space-y-2 w-full max-w-sm sm:max-w-md mx-auto lg:mx-0">
          <div className="relative aspect-square rounded-md overflow-hidden bg-warm-50 border border-warm-200 shadow-xs">
            {images.length > 0 ? (
              <Image
                src={images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-warm-300">
                <Package className="w-12 h-12" />
              </div>
            )}
            {discount > 0 && (
              <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-md uppercase tracking-wider">
                -{discount}% OFF
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-14 h-14 sm:w-10 sm:h-10 rounded-md overflow-hidden shrink-0 border-2 transition-all ${
                    selectedImage === i
                      ? 'border-brand-600 ring-2 ring-brand-600/10'
                      : 'border-warm-200 hover:border-warm-300'
                  }`}
                >fffffffffffffff
                  <Image src={img} alt="" fill className="object-cover" sizes="54px" />
                </button>
              ))}
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
            {product.stock > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <CheckCircle className="w-3 h-3" /> In Stock ({product.stock} units available)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                <XCircle className="w-3 h-3" /> Out of Stock
              </span>
            )}
          </div>

          {/* Short Description */}
          {product.description && (
            <p className="text-[11px] sm:text-[12px] text-warm-600 leading-relaxed border-t border-b border-warm-100 py-3 line-clamp-3">
              {product.description}
            </p>
          )}

          {/* Quantity & Cart Action */}
          {product.stock > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 pt-1.5">
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

              <button
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-warm-900 text-white text-[11px] sm:text-[12px] font-semibold rounded-md hover:bg-warm-800 active:scale-[0.99] transition-all shadow-xs"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Add to Cart
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
            {/* Write Review Form */}
            {user ? (
              <form onSubmit={handleSubmitReview} className="p-3.5 sm:p-4 bg-white border border-warm-200 rounded-md space-y-3 shadow-xs">
                <h3 className="text-[13px] font-bold text-warm-900">Write a Customer Review</h3>

                <div>
                  <label className="block text-[10px] font-semibold text-warm-700 mb-1">Your Rating</label>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="p-0.5 text-warm-300 hover:scale-110 transition-transform"
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
                    maxFiles={4}
                    maxSizeMB={50}
                    label="Attach Photos or Short Video Clips (Optional)"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-3.5 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-all flex items-center gap-1.5 disabled:opacity-60"
                >
                  {submittingReview ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{submittingReview ? 'Submitting...' : 'Submit Review'}</span>
                </button>
              </form>
            ) : (
              <div className="p-3 bg-warm-50 border border-warm-200 rounded-md text-[11px] text-warm-600">
                Please{' '}
                <Link href="/login" className="font-semibold text-brand-600 hover:underline">
                  sign in
                </Link>{' '}
                to share your review and upload media.
              </div>
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
                      <StarRating rating={review.rating} size="sm" />
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