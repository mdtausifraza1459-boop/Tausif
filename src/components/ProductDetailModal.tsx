import React, { useState } from 'react';
import { Product, Review } from '../types.ts';
import { useStore } from '../context/StoreContext.tsx';
import {
  X,
  Star,
  Heart,
  ShoppingBag,
  Truck,
  RotateCcw,
  ShieldCheck,
  Ruler,
  Check,
  ChevronRight,
  ZoomIn,
  Sparkles,
  Phone,
  MessageCircle,
  Zap,
} from 'lucide-react';
import { SmartSizeRecommenderModal } from './SmartSizeRecommenderModal.tsx';
import { AIVirtualTryOnModal } from './AIVirtualTryOnModal.tsx';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { addToCart, buyNow, isInWishlist, toggleWishlist, setSizeGuideModalOpen, showToast } = useStore();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0] || 'M');
  const [selectedColor, setSelectedColor] = useState<string>(product.colors[0]?.name || 'Standard');
  const [quantity, setQuantity] = useState(1);
  const [zoomActive, setZoomActive] = useState(false);
  const [pincode, setPincode] = useState('');
  const [deliveryResult, setDeliveryResult] = useState<string | null>(null);

  const [sizeRecommenderOpen, setSizeRecommenderOpen] = useState(false);
  const [virtualTryOnOpen, setVirtualTryOnOpen] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  React.useEffect(() => {
    fetch(`/api/products/${product.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.reviews) {
          setReviews(data.reviews);
        }
      })
      .catch(() => {});
  }, [product.id]);

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode || pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      setDeliveryResult('Please enter a valid 6-digit Indian Postal PIN code.');
      return;
    }
    const days = 3;
    const estDate = new Date(Date.now() + days * 86400000).toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    setDeliveryResult(`Express Delivery available to PIN ${pincode}. Expected by ${estDate}. Cash on Delivery eligible.`);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName || !reviewComment) return;

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: reviewName,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (res.ok && data.review) {
        setReviews((prev) => [data.review, ...prev]);
        setReviewSuccess(true);
        setReviewName('');
        setReviewComment('');
        showToast({
          title: 'Review Submitted',
          subtitle: 'Thank you for sharing your experience.',
          type: 'success',
        });
        setTimeout(() => setReviewSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Failed to submit review', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const isLiked = isInWishlist(product.id);
  const currentImage =
    product.images[activeImageIndex] ||
    product.images[0] ||
    '/src/assets/images/category_kurtis_showcase_1794109164419.jpg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#FAF8F5] rounded-xl shadow-2xl border border-[#E5DFD7] overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans text-[#1C1917]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5DFD7] bg-white">
          <div className="flex items-center gap-2 text-xs text-[#6B625D]">
            <span>Women&apos;s Fashion</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-[#6D1D3A]">{product.category}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close product view"
            className="p-1.5 rounded-md hover:bg-[#F3EFEA] text-[#6B625D] hover:text-[#1C1917] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 lg:p-8 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Gallery Column */}
            <div className="lg:col-span-6 space-y-4">
              <div
                className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#F3EFEA] border border-[#E5DFD7] cursor-crosshair group"
                onClick={() => setZoomActive(!zoomActive)}
              >
                <img
                  src={currentImage}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover object-top transition-transform duration-300 ${
                    zoomActive ? 'scale-150' : 'group-hover:scale-105'
                  }`}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomActive(!zoomActive);
                  }}
                  className="absolute bottom-3 right-3 bg-white/95 p-2 rounded-md text-[#1C1917] border border-[#E5DFD7] shadow-sm hover:bg-white cursor-pointer"
                  title="Toggle Image Zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {product.images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveImageIndex(idx);
                        setZoomActive(false);
                      }}
                      className={`relative w-20 aspect-[3/4] rounded-md overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        activeImageIndex === idx
                          ? 'border-[#6D1D3A]'
                          : 'border-[#E5DFD7] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover object-top" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Purchase Column */}
            <div className="lg:col-span-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#6D1D3A] mb-1">
                  {product.category} · {product.brand}
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] leading-tight">
                  {product.name}
                </h2>

                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-current' : 'text-[#E5DFD7]'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#1C1917] font-mono tabular-nums">{product.rating}</span>
                  <span className="text-xs text-[#6B625D]">({product.reviewCount} verified reviews)</span>
                </div>
              </div>

              {/* Pricing Card */}
              <div className="p-4 rounded-lg bg-white border border-[#E5DFD7] flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-[#1C1917] tabular-nums">
                  ₹{product.discountedPrice.toLocaleString()}
                </span>
                {product.originalPrice > product.discountedPrice && (
                  <>
                    <span className="text-base text-[#6B625D] line-through font-mono tabular-nums">
                      ₹{product.originalPrice.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-[#166534] tabular-nums">
                      Save {product.discountPercent}%
                    </span>
                  </>
                )}
                <span className="ml-auto text-[11px] text-[#6B625D]">Inclusive of all taxes</span>
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-white rounded-lg border border-[#E5DFD7] text-xs">
                <div>
                  <span className="text-[#6B625D] block">Fabric</span>
                  <span className="font-semibold text-[#1C1917]">{product.fabric}</span>
                </div>
                <div>
                  <span className="text-[#6B625D] block">Neckline</span>
                  <span className="font-semibold text-[#1C1917]">{product.details?.neckline || 'Handcrafted'}</span>
                </div>
                <div>
                  <span className="text-[#6B625D] block">Sleeves</span>
                  <span className="font-semibold text-[#1C1917]">{product.details?.sleeves || 'Three-Quarter'}</span>
                </div>
                <div>
                  <span className="text-[#6B625D] block">Wash &amp; Care</span>
                  <span className="font-semibold text-[#1C1917]">{product.details?.washCare || 'Gentle Wash'}</span>
                </div>
              </div>

              {/* Size Selector */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#1C1917]">
                    Select Size: <strong className="text-[#6D1D3A]">{selectedSize}</strong>
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSizeRecommenderOpen(true)}
                      className="text-xs text-[#6D1D3A] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Smart Fit Finder</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSizeGuideModalOpen(true)}
                      className="text-xs text-[#6B625D] hover:text-[#1C1917] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>Size Chart</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {product.sizes.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`min-w-[44px] h-10 px-3 text-xs font-bold rounded-md border transition-colors cursor-pointer ${
                        selectedSize === sz
                          ? 'border-[#6D1D3A] bg-[#6D1D3A] text-white'
                          : 'border-[#E5DFD7] bg-white text-[#1C1917] hover:border-[#6D1D3A]'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setVirtualTryOnOpen(true)}
                  className="w-full py-2.5 px-3 bg-[#FBF2F5] hover:bg-[#F3E1E8] border border-[#6D1D3A]/25 rounded-md text-xs font-semibold text-[#6D1D3A] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Preview Silhouette with Virtual Try-On Studio</span>
                </button>
              </div>

              {/* Colour Selector */}
              {product.colors && product.colors.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#1C1917]">
                    Colour: <strong className="text-[#6D1D3A]">{selectedColor}</strong>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {product.colors.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedColor(c.name)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                          selectedColor === c.name
                            ? 'border-[#6D1D3A] bg-white text-[#1C1917] ring-1 ring-[#6D1D3A]'
                            : 'border-[#E5DFD7] bg-white text-[#6B625D] hover:border-[#6D1D3A]'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-[#E5DFD7]"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity & Stock */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#1C1917]">Quantity:</span>
                <div className="flex items-center border border-[#E5DFD7] rounded-md bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 text-sm hover:bg-[#F3EFEA] text-[#1C1917] cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3 py-1.5 text-xs font-bold font-mono tabular-nums min-w-[32px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-1.5 text-sm hover:bg-[#F3EFEA] text-[#1C1917] cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="text-xs">
                  {product.stockQuantity > 0 ? (
                    <span className="text-[#166534] font-semibold">
                      In Stock ({product.stockQuantity} pieces ready)
                    </span>
                  ) : (
                    <span className="text-[#B91C1C] font-semibold">Currently Sold Out</span>
                  )}
                </div>
              </div>

              {/* Ordering Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => addToCart(product, selectedSize, selectedColor, quantity, false)}
                  disabled={product.stockQuantity === 0}
                  className="flex-1 py-3 px-5 rounded-md border border-[#6D1D3A] bg-white hover:bg-[#FBF2F5] text-[#6D1D3A] text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Bag</span>
                </button>

                <button
                  type="button"
                  onClick={() => buyNow(product, selectedSize, selectedColor, quantity)}
                  disabled={product.stockQuantity === 0}
                  className="flex-1 py-3 px-5 rounded-md bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  <span>Buy Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  aria-label="Save to wishlist"
                  className={`p-3 rounded-md border transition-colors cursor-pointer ${
                    isLiked
                      ? 'bg-[#6D1D3A] border-[#6D1D3A] text-white'
                      : 'bg-white border-[#E5DFD7] text-[#6B625D] hover:text-[#6D1D3A] hover:border-[#6D1D3A]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Wholesale & Bulk B2B Callout (100% English) */}
              <div className="p-4 bg-white border border-[#E5DFD7] rounded-lg space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#6D1D3A]">Need Wholesale &amp; Bulk Pricing?</span>
                  <span className="text-[11px] font-semibold text-[#6B625D]">B2B &amp; Boutique Orders</span>
                </div>
                <p className="text-[11px] text-[#6B625D] leading-snug">
                  Special factory-direct wholesale rates are available for boutique owners and bulk resellers. Call or message us directly:
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <a
                    href="tel:9310078735"
                    className="flex-1 min-w-[130px] py-2 px-3 bg-[#1C1917] hover:bg-[#6D1D3A] text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call +91 9310078735</span>
                  </a>
                  <a
                    href={`https://wa.me/919310078735?text=${encodeURIComponent(
                      `Hello Zohra Luxe, I would like wholesale bulk pricing and MOQ details for "${product.name}".`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[130px] py-2 px-3 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Wholesale</span>
                  </a>
                </div>
              </div>

              {/* Delivery PIN Code Checker */}
              <div className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-2">
                <span className="text-xs font-semibold text-[#1C1917] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#6D1D3A]" />
                  <span>Check Express Delivery &amp; Cash on Delivery Availability</span>
                </span>
                <form onSubmit={handlePincodeCheck} className="flex gap-2">
                  <input
                    type="text"
                    value={pincode}
                    maxLength={6}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="Enter 6-digit PIN code"
                    className="flex-1 text-xs px-3 py-2 border border-[#E5DFD7] rounded-md focus:outline-none focus:border-[#6D1D3A] bg-[#FAF8F5]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1C1917] text-white text-xs font-semibold rounded-md hover:bg-[#6D1D3A] transition-colors cursor-pointer"
                  >
                    Check
                  </button>
                </form>
                {deliveryResult && (
                  <p className="text-xs text-[#6D1D3A] font-medium pt-1">{deliveryResult}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] text-[#6B625D] pt-2 border-t border-[#E5DFD7]">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[#6D1D3A]" />
                  <span>7-Day Doorstep Returns &amp; Exchanges</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#6D1D3A]" />
                  <span>100% Genuine Artisanal Craftsmanship</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-8 pt-6 border-t border-[#E5DFD7]">
            <h3 className="font-serif text-xl font-bold text-[#1C1917] mb-2">Craftsmanship &amp; Styling Notes</h3>
            <p className="text-sm text-[#6B625D] leading-relaxed whitespace-pre-line max-w-3xl">
              {product.description}
            </p>
          </div>

          {/* Customer Reviews */}
          <div className="mt-8 pt-6 border-t border-[#E5DFD7]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1C1917]">Customer Reviews &amp; Ratings</h3>
                <p className="text-xs text-[#6B625D]">
                  Verified customer feedback on fit, fabric texture, and finish
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-serif font-bold text-[#6D1D3A] font-mono tabular-nums">
                  {product.rating}
                </span>
                <div>
                  <div className="flex items-center text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-[11px] text-[#6B625D]">Based on {reviews.length} reviews</span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-white rounded-lg border border-[#E5DFD7] mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6D1D3A] mb-3">
                Write a Product Review
              </h4>
              {reviewSuccess && (
                <div className="mb-3 p-3 bg-[#ECFDF5] border border-[#A7F3D0] text-[#166534] text-xs rounded-md flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Thank you. Your verified review has been published.</span>
                </div>
              )}
              <form onSubmit={handleReviewSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#6B625D] block mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      placeholder="e.g. Neha Singhal"
                      className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:outline-none focus:border-[#6D1D3A]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#6B625D] block mb-1">Rating</label>
                    <div className="flex items-center gap-1 py-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-5 h-5 ${star <= reviewRating ? 'fill-current' : 'text-[#E5DFD7]'}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#6B625D] block mb-1">Comments</label>
                  <textarea
                    required
                    rows={2}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience regarding fit, fabric, and delivery..."
                    className="w-full text-xs px-3 py-2 border border-[#E5DFD7] rounded-md bg-[#FAF8F5] focus:outline-none focus:border-[#6D1D3A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 bg-[#6D1D3A] text-white text-xs font-semibold rounded-md hover:bg-[#53142B] transition-colors cursor-pointer"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>

            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-4 bg-white rounded-lg border border-[#E5DFD7] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1C1917]">{rev.customerName}</span>
                    <span className="text-[11px] text-[#6B625D]">{rev.date}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-current' : 'text-[#E5DFD7]'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[#6B625D] leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SmartSizeRecommenderModal
        product={product}
        isOpen={sizeRecommenderOpen}
        onClose={() => setSizeRecommenderOpen(false)}
        onSelectSize={(sz) => setSelectedSize(sz)}
      />

      <AIVirtualTryOnModal
        product={product}
        isOpen={virtualTryOnOpen}
        onClose={() => setVirtualTryOnOpen(false)}
      />
    </div>
  );
};
