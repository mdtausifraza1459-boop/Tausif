import React, { useState, useEffect } from 'react';
import { Product, Review, ProductQuestion } from '../types.ts';
import { useStore, getProductVariantStock } from '../context/StoreContext.tsx';
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
  GitCompare,
  Share2,
  Bell,
  Tag,
  Video,
  Flag,
  ImagePlus,
  Building2,
  HelpCircle,
  Send,
  Layers,
} from 'lucide-react';
import { SmartSizeRecommenderModal } from './SmartSizeRecommenderModal.tsx';
import { AIVirtualTryOnModal } from './AIVirtualTryOnModal.tsx';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const {
    addToCart,
    buyNow,
    isInWishlist,
    toggleWishlist,
    isInCompare,
    toggleCompare,
    setSizeGuideModalOpen,
    setWholesaleModalOpen,
    setQuickViewProduct,
    setAuthModalOpen,
    showToast,
    user,
    token,
    refreshUserProfile,
  } = useStore();

  const [activeMedia, setActiveMedia] = useState<{ type: 'image' | 'video'; index: number }>({
    type: 'image',
    index: 0,
  });
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0] || 'M');
  const [selectedColor, setSelectedColor] = useState<string>(product.colors[0]?.name || 'Standard');
  const [quantity, setQuantity] = useState(1);
  const [zoomActive, setZoomActive] = useState(false);
  const [pincode, setPincode] = useState('');
  const [deliveryResult, setDeliveryResult] = useState<string | null>(null);

  const [sizeRecommenderOpen, setSizeRecommenderOpen] = useState(false);
  const [virtualTryOnOpen, setVirtualTryOnOpen] = useState(false);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [completeTheLook, setCompleteTheLook] = useState<Product[]>([]);
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [questionText, setQuestionText] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [infoTab, setInfoTab] = useState<'craft' | 'care' | 'measurements'>('craft');

  const [reviewName, setReviewName] = useState(user?.name || '');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [alertBusy, setAlertBusy] = useState<string | null>(null);

  useEffect(() => {
    setActiveMedia({ type: 'image', index: 0 });
    setSelectedSize(product.sizes[0] || 'M');
    setSelectedColor(product.colors[0]?.name || 'Standard');
    setQuantity(1);
    setZoomActive(false);

    fetch(`/api/products/${product.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.reviews) setReviews(data.reviews);
        if (data?.related) setRelatedProducts(data.related);
        if (data?.completeTheLook) setCompleteTheLook(data.completeTheLook);
        if (data?.questions) setQuestions(data.questions);
      })
      .catch(() => {});
  }, [product.id]);

  useEffect(() => {
    if (user?.name && !reviewName) {
      setReviewName(user.name);
    }
  }, [user?.name]);

  const variantStock = getProductVariantStock(product, selectedSize, selectedColor);

  useEffect(() => {
    if (variantStock > 0 && quantity > variantStock) {
      setQuantity(variantStock);
    }
  }, [variantStock, quantity]);

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
    setDeliveryResult(
      `Express Delivery available to PIN ${pincode}. Expected by ${estDate}. Cash on Delivery eligible.`
    );
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `${product.name} — ₹${product.discountedPrice.toLocaleString()} at Zohra Luxe`;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text, url });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} (${url})`);
      showToast({ title: 'Link Copied', subtitle: 'Shareable product link copied to clipboard.', type: 'info' });
    } catch {
      showToast({ title: product.name, subtitle: 'Copy URL from browser bar to share.', type: 'info' });
    }
  };

  const handleToggleAlert = async (alertType: 'stock' | 'price') => {
    if (!user || !token) {
      setAuthModalOpen(true);
      showToast({
        title: 'Sign In Required',
        subtitle: 'Sign in to receive price-drop and restock alerts.',
        type: 'info',
      });
      return;
    }
    setAlertBusy(alertType);
    try {
      const res = await fetch('/api/user/alerts/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: product.id, alertType }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshUserProfile();
        const isActive =
          alertType === 'stock'
            ? (data.stockAlerts || []).includes(product.id)
            : Boolean((data.priceDropAlerts || {})[product.id]);
        showToast({
          title: isActive ? 'Alert Activated' : 'Alert Removed',
          subtitle:
            alertType === 'stock'
              ? isActive
                ? 'We will notify you when restocked.'
                : 'Back-in-stock alert turned off.'
              : isActive
              ? 'We will notify you if the price drops.'
              : 'Price-drop alert turned off.',
          type: 'success',
        });
      }
    } catch {
      showToast({ title: 'Alert Failed', subtitle: 'Could not update alert settings.', type: 'error' });
    } finally {
      setAlertBusy(null);
    }
  };

  const handleReviewPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, Math.max(0, 3 - reviewImages.length));
    files.forEach((file) => {
      if (file.size > 2_000_000) {
        showToast({ title: 'File Too Large', subtitle: `${file.name} exceeds 2MB limit.`, type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setReviewImages((prev) => [...prev, reader.result as string].slice(0, 3));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customerName: reviewName.trim(),
          rating: reviewRating,
          comment: reviewComment.trim(),
          images: reviewImages,
        }),
      });
      const data = await res.json();
      if (res.ok && data.review) {
        setReviews((prev) => [data.review, ...prev]);
        setReviewSuccess(true);
        setReviewComment('');
        setReviewImages([]);
        showToast({
          title: 'Review Submitted',
          subtitle: 'Thank you for sharing your experience.',
          type: 'success',
        });
        setTimeout(() => setReviewSuccess(false), 4000);
      } else {
        showToast({ title: 'Review Error', subtitle: data.error || 'Could not save review.', type: 'error' });
      }
    } catch {
      showToast({ title: 'Network Error', subtitle: 'Could not submit review.', type: 'error' });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReportReview = async (reviewId: string) => {
    setReportingId(reviewId);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer flagged for moderation review' }),
      });
      if (res.ok) {
        showToast({
          title: 'Review Flagged',
          subtitle: 'Our moderation team has received your report.',
          type: 'info',
        });
      }
    } catch {
      // ignore
    } finally {
      setReportingId(null);
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;
    setSubmittingQuestion(true);
    try {
      const res = await fetch(`/api/products/${product.id}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customerName: user?.name || reviewName || 'Boutique Guest',
          customerEmail: user?.email,
          question: questionText.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.question) {
        setQuestions((prev) => [data.question, ...prev]);
        setQuestionText('');
        showToast({
          title: 'Question Submitted',
          subtitle: 'Our styling & product team will respond shortly.',
          type: 'success',
        });
      } else {
        showToast({ title: 'Could Not Submit', subtitle: data.error || 'Please try again.', type: 'error' });
      }
    } catch {
      showToast({ title: 'Network Error', subtitle: 'Could not post question.', type: 'error' });
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const isLiked = isInWishlist(product.id);
  const compared = isInCompare(product.id);
  const stockAlertActive = Boolean(user?.stockAlerts?.includes(product.id));
  const priceAlertActive = Boolean(user?.priceDropAlerts && user.priceDropAlerts[product.id]);

  const currentImage =
    product.images[activeMedia.index] ||
    product.images[0] ||
    '/src/assets/images/category_kurtis_showcase_1794109164419.jpg';
  const videos = product.videos || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#F7F6F2] rounded-xl shadow-2xl border border-[#E2DFD7] overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans text-[#141413]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2DFD7] bg-white">
          <div className="flex items-center gap-2 text-xs text-[#63615C] min-w-0">
            <span>Women&apos;s Fashion</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            <span className="font-semibold text-[#164E3F] truncate">{product.category}</span>
            {product.sku && (
              <>
                <span className="text-[#E2DFD7]">|</span>
                <span className="font-mono text-[11px] text-[#63615C]">SKU: {product.sku}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleCompare(product)}
              className={`px-2.5 py-1.5 rounded-md border text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${
                compared
                  ? 'bg-[#164E3F] text-white border-[#164E3F]'
                  : 'bg-[#F7F6F2] text-[#141413] border-[#E2DFD7] hover:border-[#141413]'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{compared ? 'In Compare' : 'Compare'}</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="px-2.5 py-1.5 rounded-md border border-[#E2DFD7] bg-[#F7F6F2] hover:border-[#141413] text-[11px] font-medium text-[#141413] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close product view"
              className="p-1.5 rounded-md hover:bg-[#EFECE6] text-[#63615C] hover:text-[#141413] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 lg:p-8 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Gallery Column (Images & Videos) */}
            <div className="lg:col-span-6 space-y-4">
              {activeMedia.type === 'video' && videos[activeMedia.index] ? (
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#141413] border border-[#E2DFD7] flex items-center justify-center">
                  <video
                    src={videos[activeMedia.index]}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div
                  className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[#EFECE6] border border-[#E2DFD7] cursor-crosshair group"
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
                    className="absolute bottom-3 right-3 bg-white/95 p-2 rounded-md text-[#141413] border border-[#E2DFD7] shadow-sm hover:bg-white cursor-pointer"
                    title="Toggle Image Zoom"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              )}

              {(product.images.length > 1 || videos.length > 0) && (
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={`img-${idx}`}
                      type="button"
                      onClick={() => {
                        setActiveMedia({ type: 'image', index: idx });
                        setZoomActive(false);
                      }}
                      className={`relative w-20 aspect-[3/4] rounded-md overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        activeMedia.type === 'image' && activeMedia.index === idx
                          ? 'border-[#164E3F]'
                          : 'border-[#E2DFD7] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover object-top" />
                    </button>
                  ))}
                  {videos.map((_, vIdx) => (
                    <button
                      key={`vid-${vIdx}`}
                      type="button"
                      onClick={() => {
                        setActiveMedia({ type: 'video', index: vIdx });
                        setZoomActive(false);
                      }}
                      className={`relative w-20 aspect-[3/4] rounded-md overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-[#141413] text-white flex flex-col items-center justify-center gap-1 ${
                        activeMedia.type === 'video' && activeMedia.index === vIdx
                          ? 'border-[#164E3F]'
                          : 'border-[#E2DFD7] opacity-85 hover:opacity-100'
                      }`}
                    >
                      <Video className="w-5 h-5 text-[#D4AF6A]" />
                      <span className="text-[10px] font-semibold">Runway {vIdx + 1}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Purchase Column */}
            <div className="lg:col-span-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#164E3F] mb-1">
                  {product.category} · {product.brand}
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#141413] leading-tight">
                  {product.name}
                </h2>

                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center text-[#8E6D3B]">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-current' : 'text-[#E2DFD7]'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#141413] font-mono tabular-nums">{product.rating}</span>
                  <span className="text-xs text-[#63615C]">({reviews.length || product.reviewCount} reviews)</span>
                </div>
              </div>

              {/* Pricing Card */}
              <div className="p-4 rounded-lg bg-white border border-[#E2DFD7] space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-[#141413] tabular-nums">
                    ₹{(product.flashSalePrice && product.flashSalePrice < product.discountedPrice
                      ? product.flashSalePrice
                      : product.discountedPrice
                    ).toLocaleString()}
                  </span>
                  {product.originalPrice > (product.flashSalePrice || product.discountedPrice) && (
                    <>
                      <span className="text-base text-[#63615C] line-through font-mono tabular-nums">
                        ₹{(product.flashSalePrice ? product.discountedPrice : product.originalPrice).toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-[#166534] tabular-nums">
                        {product.flashSalePrice
                          ? 'Flash Sale Active'
                          : `Save ${product.discountPercent}%`}
                      </span>
                    </>
                  )}
                  <span className="ml-auto text-[11px] text-[#63615C]">Inclusive of all taxes</span>
                </div>
                {product.flashSalePrice && product.flashSaleEndsAt && (
                  <p className="text-[11px] font-mono text-[#164E3F] font-semibold">
                    Limited Flash Offer ends {new Date(product.flashSaleEndsAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-white rounded-lg border border-[#E2DFD7] text-xs">
                <div>
                  <span className="text-[#63615C] block">Fabric</span>
                  <span className="font-semibold text-[#141413]">{product.fabric}</span>
                </div>
                <div>
                  <span className="text-[#63615C] block">Neckline</span>
                  <span className="font-semibold text-[#141413]">{product.details?.neckline || 'Handcrafted'}</span>
                </div>
                <div>
                  <span className="text-[#63615C] block">Sleeves</span>
                  <span className="font-semibold text-[#141413]">{product.details?.sleeves || 'Three-Quarter'}</span>
                </div>
                <div>
                  <span className="text-[#63615C] block">Wash &amp; Care</span>
                  <span className="font-semibold text-[#141413]">{product.details?.washCare || 'Gentle Wash'}</span>
                </div>
              </div>

              {/* Size Selector */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#141413]">
                    Select Size: <strong className="text-[#164E3F]">{selectedSize}</strong>
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSizeRecommenderOpen(true)}
                      className="text-xs text-[#164E3F] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Smart Fit Finder</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSizeGuideModalOpen(true)}
                      className="text-xs text-[#63615C] hover:text-[#141413] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      <span>Size Chart</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {product.sizes.map((sz) => {
                    const szStock = getProductVariantStock(product, sz, selectedColor);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`min-w-[44px] h-10 px-3 text-xs font-bold rounded-md border transition-colors cursor-pointer ${
                          selectedSize === sz
                            ? 'border-[#164E3F] bg-[#164E3F] text-white'
                            : szStock === 0
                            ? 'border-[#E2DFD7] bg-[#EFECE6] text-[#63615C] line-through'
                            : 'border-[#E2DFD7] bg-white text-[#141413] hover:border-[#164E3F]'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setVirtualTryOnOpen(true)}
                  className="w-full py-2.5 px-3 bg-[#ECF4F1] hover:bg-[#DCECE6] border border-[#164E3F]/25 rounded-md text-xs font-semibold text-[#164E3F] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Preview Silhouette with Virtual Try-On Studio</span>
                </button>
              </div>

              {/* Colour Selector */}
              {product.colors && product.colors.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#141413]">
                    Colour: <strong className="text-[#164E3F]">{selectedColor}</strong>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {product.colors.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setSelectedColor(c.name)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                          selectedColor === c.name
                            ? 'border-[#164E3F] bg-white text-[#141413] ring-1 ring-[#164E3F]'
                            : 'border-[#E2DFD7] bg-white text-[#63615C] hover:border-[#164E3F]'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-[#E2DFD7]"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity & Per-Variant Stock */}
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#141413]">Quantity:</span>
                <div className="flex items-center border border-[#E2DFD7] rounded-md bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 text-sm hover:bg-[#EFECE6] text-[#141413] cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3 py-1.5 text-xs font-bold font-mono tabular-nums min-w-[32px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    disabled={quantity >= variantStock}
                    onClick={() => setQuantity(Math.min(Math.max(1, variantStock), quantity + 1))}
                    className="px-3 py-1.5 text-sm hover:bg-[#EFECE6] text-[#141413] disabled:opacity-40 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <div className="text-xs">
                  {variantStock > 0 ? (
                    <span className="text-[#166534] font-semibold">
                      In Stock ({variantStock} left in {selectedSize} · {selectedColor})
                    </span>
                  ) : (
                    <span className="text-[#B91C1C] font-semibold">
                      Sold out in Size {selectedSize} ({selectedColor})
                    </span>
                  )}
                </div>
              </div>

              {/* Ordering Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => addToCart(product, selectedSize, selectedColor, quantity, false)}
                  disabled={variantStock === 0}
                  className="flex-1 py-3 px-5 rounded-md border border-[#141413] bg-white hover:bg-[#EFECE6] text-[#141413] text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Bag</span>
                </button>

                <button
                  type="button"
                  onClick={() => buyNow(product, selectedSize, selectedColor, quantity)}
                  disabled={variantStock === 0}
                  className="flex-1 py-3 px-5 rounded-md bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                      ? 'bg-[#164E3F] border-[#164E3F] text-white'
                      : 'bg-white border-[#E2DFD7] text-[#63615C] hover:text-[#164E3F] hover:border-[#164E3F]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Back-in-Stock & Price-Drop Alerts */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={alertBusy === 'stock'}
                  onClick={() => handleToggleAlert('stock')}
                  className={`flex-1 py-2 px-3 rounded-md border text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    stockAlertActive
                      ? 'bg-[#ECF4F1] text-[#164E3F] border-[#164E3F]'
                      : 'bg-white text-[#63615C] border-[#E2DFD7] hover:border-[#141413]'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{stockAlertActive ? 'Restock Alert Active' : 'Notify When Restocked'}</span>
                </button>
                <button
                  type="button"
                  disabled={alertBusy === 'price'}
                  onClick={() => handleToggleAlert('price')}
                  className={`flex-1 py-2 px-3 rounded-md border text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    priceAlertActive
                      ? 'bg-[#ECF4F1] text-[#164E3F] border-[#164E3F]'
                      : 'bg-white text-[#63615C] border-[#E2DFD7] hover:border-[#141413]'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{priceAlertActive ? 'Price Alert Active' : 'Notify on Price Drop'}</span>
                </button>
              </div>

              {/* Wholesale & Bulk B2B Callout (100% English) */}
              <div className="p-4 bg-white border border-[#E2DFD7] rounded-lg space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#164E3F]">Need Wholesale &amp; Bulk Pricing?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setWholesaleModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-[#8E6D3B] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Open B2B Portal</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#63615C] leading-snug">
                  Special factory-direct wholesale rates are available for boutique owners and bulk resellers:
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <a
                    href="tel:9310078735"
                    className="flex-1 min-w-[130px] py-2 px-3 bg-[#141413] hover:bg-[#164E3F] text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call +91 9310078735</span>
                  </a>
                  <a
                    href={`https://wa.me/919310078735?text=${encodeURIComponent(
                      `Hello Zohra Luxe, I would like wholesale bulk pricing and MOQ details for "${product.name}" (SKU: ${product.sku || product.id}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[130px] py-2 px-3 bg-[#ECF4F1] hover:bg-[#DCECE6] border border-[#164E3F]/30 text-[#164E3F] text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Wholesale</span>
                  </a>
                </div>
              </div>

              {/* Delivery PIN Code Checker */}
              <div className="p-4 bg-white rounded-lg border border-[#E2DFD7] space-y-2">
                <span className="text-xs font-semibold text-[#141413] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#164E3F]" />
                  <span>Check Express Delivery &amp; Cash on Delivery Availability</span>
                </span>
                <form onSubmit={handlePincodeCheck} className="flex gap-2">
                  <input
                    type="text"
                    value={pincode}
                    maxLength={6}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="Enter 6-digit PIN code"
                    className="flex-1 text-xs px-3 py-2 border border-[#E2DFD7] rounded-md focus:outline-none focus:border-[#164E3F] bg-[#F7F6F2]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#141413] text-white text-xs font-semibold rounded-md hover:bg-[#164E3F] transition-colors cursor-pointer"
                  >
                    Check
                  </button>
                </form>
                {deliveryResult && (
                  <p className="text-xs text-[#164E3F] font-medium pt-1">{deliveryResult}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] text-[#63615C] pt-2 border-t border-[#E2DFD7]">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[#164E3F]" />
                  <span>7-Day Doorstep Returns &amp; Exchanges</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#164E3F]" />
                  <span>100% Genuine Artisanal Craftsmanship</span>
                </div>
              </div>
            </div>
          </div>

          {/* Craftsmanship, Fabric & Care Guide, Garment Measurements */}
          <div className="mt-8 pt-6 border-t border-[#E2DFD7] space-y-4">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#E2DFD7] pb-3">
              {[
                { id: 'craft', label: 'Craftsmanship & Styling Notes' },
                { id: 'care', label: 'Fabric & Care Guide' },
                { id: 'measurements', label: 'Garment Pattern Specs' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setInfoTab(t.id as any)}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                    infoTab === t.id
                      ? 'bg-[#141413] text-white border-[#141413]'
                      : 'bg-white text-[#63615C] border-[#E2DFD7] hover:text-[#141413]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {infoTab === 'craft' && (
              <div className="space-y-4">
                <p className="text-sm text-[#63615C] leading-relaxed whitespace-pre-line max-w-3xl">
                  {product.description}
                </p>
                {product.stylingNotes && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-md border border-[#E2DFD7]">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8E6D3B] block mb-0.5">Jewellery Pairing</span>
                      <p className="text-[#141413]">{product.stylingNotes.jewellery}</p>
                    </div>
                    <div className="p-3 bg-white rounded-md border border-[#E2DFD7]">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8E6D3B] block mb-0.5">Footwear</span>
                      <p className="text-[#141413]">{product.stylingNotes.footwear}</p>
                    </div>
                    {product.stylingNotes.bag && (
                      <div className="p-3 bg-white rounded-md border border-[#E2DFD7]">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8E6D3B] block mb-0.5">Clutch / Bag</span>
                        <p className="text-[#141413]">{product.stylingNotes.bag}</p>
                      </div>
                    )}
                    {product.stylingNotes.dupatta && (
                      <div className="p-3 bg-white rounded-md border border-[#E2DFD7]">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8E6D3B] block mb-0.5">Dupatta Drape</span>
                        <p className="text-[#141413]">{product.stylingNotes.dupatta}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {infoTab === 'care' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs bg-white p-4 rounded-lg border border-[#E2DFD7]">
                <div>
                  <span className="text-[#63615C] block text-[11px]">Textile Composition</span>
                  <strong className="text-[#141413]">{product.fabric}</strong>
                </div>
                <div>
                  <span className="text-[#63615C] block text-[11px]">Artisanal Origin</span>
                  <strong className="text-[#141413]">{product.fabricCareGuide?.origin || 'Curated Indian Atelier'}</strong>
                </div>
                <div>
                  <span className="text-[#63615C] block text-[11px]">Weave &amp; Finish</span>
                  <strong className="text-[#141413]">{product.fabricCareGuide?.weave || product.details?.pattern || 'Fine Loom'}</strong>
                </div>
                <div>
                  <span className="text-[#63615C] block text-[11px]">Washing Method</span>
                  <strong className="text-[#141413]">{product.fabricCareGuide?.washMethod || product.details?.washCare}</strong>
                </div>
                <div>
                  <span className="text-[#63615C] block text-[11px]">Steam &amp; Ironing</span>
                  <strong className="text-[#141413]">{product.fabricCareGuide?.ironing || 'Low steam press on reverse'}</strong>
                </div>
                <div>
                  <span className="text-[#63615C] block text-[11px]">Wardrobe Storage</span>
                  <strong className="text-[#141413]">{product.fabricCareGuide?.storage || 'Cool dry cotton muslin cover'}</strong>
                </div>
              </div>
            )}

            {infoTab === 'measurements' && (
              <div className="bg-white rounded-lg border border-[#E2DFD7] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F6F2] border-b border-[#E2DFD7] text-[#164E3F]">
                    <tr>
                      <th className="p-2.5">Garment Size</th>
                      <th className="p-2.5">Garment Bust (in)</th>
                      <th className="p-2.5">Garment Waist (in)</th>
                      <th className="p-2.5">Garment Hip (in)</th>
                      <th className="p-2.5">Length (in)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE6] font-mono">
                    {Object.entries(
                      product.measurements || {
                        XS: { bustIn: 34, waistIn: 28, hipIn: 37, lengthIn: 44 },
                        S: { bustIn: 36, waistIn: 30, hipIn: 39, lengthIn: 45 },
                        M: { bustIn: 38, waistIn: 32, hipIn: 41, lengthIn: 46 },
                        L: { bustIn: 40, waistIn: 34, hipIn: 43, lengthIn: 46 },
                        XL: { bustIn: 42, waistIn: 36, hipIn: 45, lengthIn: 47 },
                        XXL: { bustIn: 44, waistIn: 38, hipIn: 47, lengthIn: 47 },
                      }
                    ).map(([sz, spec]) => (
                      <tr key={sz} className={selectedSize === sz ? 'bg-[#ECF4F1]/60' : ''}>
                        <td className="p-2.5 font-sans font-bold text-[#141413]">{sz}</td>
                        <td className="p-2.5">{spec.bustIn}&ldquo;</td>
                        <td className="p-2.5">{spec.waistIn}&ldquo;</td>
                        <td className="p-2.5">{spec.hipIn}&ldquo;</td>
                        <td className="p-2.5">{spec.lengthIn}&ldquo;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Complete the Look Matching Pieces */}
          {completeTheLook.length > 0 && (
            <div className="mt-8 pt-6 border-t border-[#E2DFD7] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#8E6D3B]" />
                  <h3 className="font-serif text-xl font-bold text-[#141413]">Complete the Look</h3>
                </div>
                <span className="text-[11px] text-[#63615C]">Coordinating silhouettes paired by our stylists</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {completeTheLook.map((match) => (
                  <div
                    key={match.id}
                    className="bg-white border border-[#E2DFD7] rounded-lg p-3 flex items-center gap-3"
                  >
                    <img
                      src={match.images[0]}
                      alt={match.name}
                      referrerPolicy="no-referrer"
                      onClick={() => setQuickViewProduct(match)}
                      className="w-16 h-20 object-cover rounded border border-[#E2DFD7] cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-[#8E6D3B] font-semibold">
                        {match.category}
                      </p>
                      <button
                        type="button"
                        onClick={() => setQuickViewProduct(match)}
                        className="text-xs font-semibold text-[#141413] hover:text-[#164E3F] truncate block w-full text-left cursor-pointer"
                      >
                        {match.name}
                      </button>
                      <p className="text-xs font-mono font-bold text-[#164E3F]">
                        ₹{(match.flashSalePrice || match.discountedPrice).toLocaleString()}
                      </p>
                      <button
                        type="button"
                        disabled={!match.inStock || match.stockQuantity <= 0}
                        onClick={() =>
                          addToCart(match, match.sizes[0] || 'M', match.colors[0]?.name || 'Standard', 1, false)
                        }
                        className="px-2.5 py-1 bg-[#141413] hover:bg-[#164E3F] text-white text-[10px] font-semibold rounded cursor-pointer disabled:opacity-40"
                      >
                        + Add Pairing
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Reviews */}
          <div className="mt-8 pt-6 border-t border-[#E2DFD7]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#141413]">Customer Reviews &amp; Ratings</h3>
                <p className="text-xs text-[#63615C]">
                  Customer feedback on fit, fabric texture, and finish (Verified Purchase badges require a delivered order)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-serif font-bold text-[#164E3F] font-mono tabular-nums">
                  {product.rating}
                </span>
                <div>
                  <div className="flex items-center text-[#8E6D3B]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-[11px] text-[#63615C]">Based on {reviews.length} reviews</span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-white rounded-lg border border-[#E2DFD7] mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#164E3F] mb-3">
                Write a Product Review
              </h4>
              {reviewSuccess && (
                <div className="mb-3 p-3 bg-[#ECFDF5] border border-[#A7F3D0] text-[#166534] text-xs rounded-md flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Thank you. Your review has been published.</span>
                </div>
              )}
              <form onSubmit={handleReviewSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[#63615C] block mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      placeholder="e.g. Neha Singhal"
                      className="w-full text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:outline-none focus:border-[#164E3F]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#63615C] block mb-1">Rating</label>
                    <div className="flex items-center gap-1 py-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="text-[#8E6D3B] hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-5 h-5 ${star <= reviewRating ? 'fill-current' : 'text-[#E2DFD7]'}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#63615C] block mb-1">Comments</label>
                  <textarea
                    required
                    rows={2}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your experience regarding fit, fabric, and delivery..."
                    className="w-full text-xs px-3 py-2 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:outline-none focus:border-[#164E3F]"
                  />
                </div>

                {/* Optional Photo Upload (up to 3 images) */}
                <div className="flex flex-wrap items-center gap-3">
                  {reviewImages.map((img, idx) => (
                    <div key={idx} className="relative w-14 h-16 rounded border border-[#E2DFD7] overflow-hidden">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setReviewImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {reviewImages.length < 3 && (
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-[#E2DFD7] rounded-md text-[11px] text-[#63615C] hover:border-[#164E3F] hover:text-[#164E3F] cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>Add Photos ({reviewImages.length}/3)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleReviewPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 bg-[#164E3F] text-white text-xs font-semibold rounded-md hover:bg-[#0F3A2E] transition-colors cursor-pointer"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>

            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-4 bg-white rounded-lg border border-[#E2DFD7] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#141413]">{rev.customerName}</span>
                      {rev.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#ECFDF5] text-[#166534] text-[10px] font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[#63615C]">{rev.date}</span>
                      <button
                        type="button"
                        disabled={reportingId === rev.id}
                        onClick={() => handleReportReview(rev.id)}
                        title="Report inappropriate review"
                        className="text-[11px] text-[#63615C] hover:text-[#B91C1C] flex items-center gap-1 cursor-pointer"
                      >
                        <Flag className="w-3 h-3" />
                        <span>Report</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[#8E6D3B]">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-current' : 'text-[#E2DFD7]'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[#63615C] leading-relaxed">{rev.comment}</p>
                  {rev.images && rev.images.length > 0 && (
                    <div className="flex gap-2 pt-1">
                      {rev.images.map((im, i) => (
                        <img
                          key={i}
                          src={im}
                          alt="Review photo"
                          className="w-14 h-16 object-cover rounded border border-[#E2DFD7]"
                        />
                      ))}
                    </div>
                  )}
                  {rev.adminReply && (
                    <div className="mt-2 p-2.5 bg-[#F7F6F2] border border-[#E2DFD7] rounded text-xs">
                      <span className="font-semibold text-[#164E3F] block text-[11px]">
                        Store Response ({rev.adminReply.author})
                      </span>
                      <p className="text-[#141413] text-xs mt-0.5">{rev.adminReply.message}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Customer Product Questions & Answers */}
          <div className="mt-8 pt-6 border-t border-[#E2DFD7] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#164E3F]" />
                <h3 className="font-serif text-xl font-bold text-[#141413]">Product Questions &amp; Answers</h3>
              </div>
              <span className="text-[11px] font-mono text-[#63615C]">{questions.length} Q&amp;A</span>
            </div>

            <form onSubmit={handleQuestionSubmit} className="flex gap-2">
              <input
                type="text"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Ask a question about fabric translucency, sizing, dupatta length, or care..."
                className="flex-1 text-xs px-3 py-2.5 bg-white border border-[#E2DFD7] rounded-md focus:outline-none focus:border-[#164E3F]"
              />
              <button
                type="submit"
                disabled={submittingQuestion || !questionText.trim()}
                className="px-4 py-2 bg-[#141413] hover:bg-[#164E3F] text-white text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingQuestion ? 'Sending...' : 'Ask'}</span>
              </button>
            </form>

            {questions.length === 0 ? (
              <p className="text-xs text-[#63615C]">
                No questions posted for this garment yet. Ask anything and our atelier team will reply.
              </p>
            ) : (
              <div className="space-y-2.5">
                {questions.map((q) => (
                  <div key={q.id} className="p-3.5 bg-white border border-[#E2DFD7] rounded-lg space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#141413]">Q: {q.question}</span>
                      <span className="text-[10px] text-[#63615C] font-mono">
                        {q.customerName} · {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {q.answer ? (
                      <p className="text-[#164E3F] bg-[#ECF4F1]/60 p-2 rounded text-[11px]">
                        <strong>Atelier Answer ({q.answeredBy || 'Zohra Luxe'}):</strong> {q.answer}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#8E6D3B] italic">Awaiting response from styling desk.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related & Similar Styles */}
          {relatedProducts.length > 0 && (
            <div className="mt-8 pt-6 border-t border-[#E2DFD7] space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#141413]">Related &amp; Similar Styles</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {relatedProducts.map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => setQuickViewProduct(rel)}
                    className="text-left bg-white rounded-lg border border-[#E2DFD7] hover:border-[#141413] overflow-hidden transition-colors cursor-pointer group"
                  >
                    <div className="aspect-[3/4] bg-[#EFECE6] overflow-hidden">
                      <img
                        src={rel.images[0]}
                        alt={rel.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-2.5 space-y-0.5">
                      <p className="text-xs font-semibold text-[#141413] truncate">{rel.name}</p>
                      <p className="text-xs font-mono font-bold text-[#164E3F] tabular-nums">
                        ₹{rel.discountedPrice.toLocaleString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
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
