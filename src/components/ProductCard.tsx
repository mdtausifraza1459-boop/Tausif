import React, { useState, useEffect } from 'react';
import { Product } from '../types.ts';
import { useStore, getProductVariantStock } from '../context/StoreContext.tsx';
import {
  getEffectiveOriginalPrice,
  getEffectiveSizePrice,
  getProductPriceRange,
  getSizeDiscountPercent,
  getStartingSize,
  isSizeAvailableForPurchase,
} from '../utils/pricing.ts';
import { Heart, Star, ShoppingBag, Eye, Zap, GitCompare, Share2 } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    isInWishlist,
    toggleWishlist,
    isInCompare,
    toggleCompare,
    addToCart,
    buyNow,
    setQuickViewProduct,
    showToast,
  } = useStore();

  const [selectedSize, setSelectedSize] = useState<string>(() => getStartingSize(product));
  const [userSelectedSize, setUserSelectedSize] = useState<boolean>(false);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setSelectedSize(getStartingSize(product));
    setUserSelectedSize(false);
    setSelectedColorIndex(0);
    setImageError(false);
  }, [product.id]);

  const isLiked = isInWishlist(product.id);
  const isCompared = isInCompare(product.id);
  const selectedColor = product.colors[selectedColorIndex]?.name || 'Standard';
  const variantAvail = getProductVariantStock(product, selectedSize, selectedColor);
  const isVariantAvailable =
    isSizeAvailableForPurchase(product, selectedSize, selectedColor) && variantAvail > 0;

  const primaryImage =
    product.images[0] || '/src/assets/images/category_kurtis_showcase_1794109164419.jpg';

  const priceRange = getProductPriceRange(product);
  const effectivePrice = getEffectiveSizePrice(product, selectedSize);
  const originalPriceForSize = getEffectiveOriginalPrice(product, selectedSize);
  const effectiveDiscountPercent = getSizeDiscountPercent(originalPriceForSize, effectivePrice);
  const hasFlashSale = Boolean(
    product.flashSaleDiscountPercent ||
      (product.flashSalePrice !== undefined && product.flashSalePrice < product.discountedPrice)
  );

  const highlightLabel =
    product.stockQuantity === 0
      ? 'Sold Out'
      : hasFlashSale
      ? 'Flash Sale'
      : product.isBestSeller
      ? 'Best Seller'
      : product.isNewArrival
      ? 'New'
      : product.stockQuantity < 8
      ? 'Limited'
      : undefined;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/?product=${encodeURIComponent(product.id)}`;
    const shareData = {
      title: `${product.name} — Zohra Luxe`,
      text: `Explore ${product.name} at ₹${effectivePrice.toLocaleString()} on Zohra Luxe.`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showToast({ title: 'Link Copied', subtitle: product.name, type: 'success' });
      }
    } catch {
      // ignore cancelled native share
    }
  };

  return (
    <article
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex flex-col bg-white rounded-xl overflow-hidden border border-[#EADFD8] hover:border-[#D4B2B8] hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#9E5660]/10 transition-all duration-200 relative"
    >
      {/* 3:4 Portrait Showcase (Single Clean Product Photo) */}
      <div
        className="relative aspect-[3/4] w-full bg-[#F4EDE2] overflow-hidden cursor-pointer"
        onClick={() => setQuickViewProduct(product)}
      >
        {imageError ? (
          <div className="absolute inset-0 bg-[#F4EDE2] flex flex-col items-center justify-center p-4 text-center">
            <span className="font-serif text-lg font-medium text-[#191615]">{product.name}</span>
            <span className="text-xs text-[#665E5B] mt-1">{product.category}</span>
          </div>
        ) : (
          <img
            src={primaryImage}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover object-top transition-transform duration-500 ${
              isHovered ? 'scale-[1.03]' : 'scale-100'
            }`}
          />
        )}

        {highlightLabel && (
          <span
            className={`absolute top-2.5 left-2.5 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded z-10 pointer-events-none ${
              highlightLabel === 'Sold Out'
                ? 'bg-[#B91C1C] text-white'
                : highlightLabel === 'Flash Sale'
                ? 'bg-[#9E5660] text-white'
                : 'bg-white/95 text-[#191615] border border-[#EADFD8]'
            }`}
          >
            {highlightLabel}
          </span>
        )}

        {/* Action Rail */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            aria-label={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}
            title={isLiked ? 'Remove from wishlist' : 'Save to wishlist'}
            className={`p-2 rounded-full transition-colors cursor-pointer shadow-xs ${
              isLiked
                ? 'bg-[#9E5660] text-white'
                : 'bg-white/95 text-[#665E5B] hover:text-[#9E5660]'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCompare(product);
            }}
            aria-label={isCompared ? 'Remove from comparison' : 'Compare product'}
            title="Compare"
            className={`p-2 rounded-full transition-colors cursor-pointer shadow-xs ${
              isCompared
                ? 'bg-[#191615] text-white'
                : 'bg-white/95 text-[#665E5B] hover:text-[#191615]'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Share product"
            title="Share"
            className="p-2 rounded-full bg-white/95 text-[#665E5B] hover:text-[#191615] transition-colors cursor-pointer shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick View Bar */}
        <div
          className={`hidden sm:block absolute inset-x-3 bottom-3 transition-all duration-200 z-10 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuickViewProduct(product);
            }}
            className="w-full py-2 px-3 bg-white/95 hover:bg-[#191615] hover:text-white text-xs font-medium text-[#191615] rounded-md shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Quick View</span>
          </button>
        </div>
      </div>

      {/* Concise Editorial Product Metadata */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2.5 bg-white">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[11px] text-[#665E5B]">
            <span className="truncate font-medium uppercase tracking-wider text-[#9E5660]">
              {product.category}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[#B58A4A] font-mono font-semibold shrink-0 tabular-nums">
              <span>{product.rating}</span>
              <Star className="w-3 h-3 fill-current" />
            </span>
          </div>

          <h3
            onClick={() => setQuickViewProduct(product)}
            className="font-serif text-[17px] sm:text-[18px] font-semibold text-[#191615] hover:text-[#9E5660] transition-colors line-clamp-1 cursor-pointer leading-snug"
            title={product.name}
          >
            {product.name}
          </h3>
          <p className="text-[11px] text-[#665E5B] truncate">{product.fabric}</p>
        </div>

        {/* Colour Swatches */}
        {product.colors && product.colors.length > 0 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {product.colors.slice(0, 4).map((col, idx) => (
                <button
                  key={col.name}
                  type="button"
                  onClick={() => setSelectedColorIndex(idx)}
                  title={col.name}
                  aria-label={`Select color ${col.name}`}
                  className={`w-3.5 h-3.5 rounded-full border transition-transform cursor-pointer ${
                    selectedColorIndex === idx
                      ? 'ring-2 ring-offset-1 ring-[#9E5660] scale-110 border-[#9E5660]'
                      : 'border-[#EADFD8] hover:scale-105'
                  }`}
                  style={{ backgroundColor: col.hex }}
                />
              ))}
              <span className="text-[11px] text-[#665E5B] ml-1 truncate max-w-[90px]">
                {selectedColor}
              </span>
            </div>
            {(variantAvail === 0 || variantAvail <= 5) && (
              <span
                className={`text-[10px] font-mono font-medium shrink-0 tabular-nums ${
                  variantAvail === 0 ? 'text-[#B91C1C]' : 'text-[#B58A4A]'
                }`}
              >
                {variantAvail === 0 ? 'Out' : `${variantAvail} left`}
              </span>
            )}
          </div>
        )}

        {/* Dynamic Size-Aware Price Display */}
        <div className="pt-2 border-t border-[#F4EDE2] space-y-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-base font-bold font-mono text-[#191615] tabular-nums">
              ₹{effectivePrice.toLocaleString()}
            </span>
            {originalPriceForSize > effectivePrice && (
              <>
                <span className="text-xs text-[#665E5B] line-through font-mono tabular-nums">
                  ₹{originalPriceForSize.toLocaleString()}
                </span>
                <span className="text-[11px] font-semibold text-[#9E5660] tabular-nums">
                  {effectiveDiscountPercent}% OFF
                </span>
              </>
            )}
            <span className="ml-auto text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#F9EEF0] text-[#9E5660]">
              {selectedSize}
            </span>
          </div>
          {priceRange.hasRange && !userSelectedSize && (
            <p className="text-[10px] font-mono text-[#665E5B] tabular-nums">
              By size: ₹{priceRange.min.toLocaleString()} – ₹{priceRange.max.toLocaleString()}
            </p>
          )}
        </div>

        {/* Size Buttons with Live Price & Unavailability Handling */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {product.sizes.map((sz) => {
            const available = isSizeAvailableForPurchase(product, sz, selectedColor);
            const szStock = getProductVariantStock(product, sz, selectedColor);
            return (
              <button
                key={sz}
                type="button"
                disabled={!available}
                onClick={() => {
                  setSelectedSize(sz);
                  setUserSelectedSize(true);
                }}
                title={
                  available
                    ? `${sz} · ₹${getEffectiveSizePrice(product, sz).toLocaleString()} (${szStock} in stock)`
                    : `${sz} unavailable`
                }
                className={`text-[11px] font-medium px-2 py-1 rounded border transition-colors shrink-0 ${
                  !available
                    ? 'border-[#EADFD8] bg-[#FAF8F4] text-[#B8AFA8] line-through cursor-not-allowed opacity-70'
                    : selectedSize === sz
                    ? 'border-[#9E5660] bg-[#9E5660] text-white cursor-pointer'
                    : 'border-[#EADFD8] bg-white text-[#191615] hover:border-[#9E5660] cursor-pointer'
                }`}
              >
                {sz}
              </button>
            );
          })}
        </div>

        {/* CTAs */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => {
              if (isVariantAvailable) {
                addToCart(product, selectedSize, selectedColor, 1, false);
              }
            }}
            disabled={!isVariantAvailable}
            className={`py-2 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border whitespace-nowrap ${
              !isVariantAvailable
                ? 'bg-[#F4EDE2] text-[#665E5B] border-[#EADFD8] cursor-not-allowed'
                : 'bg-white hover:bg-[#F9EEF0] text-[#191615] hover:text-[#9E5660] border-[#EADFD8] hover:border-[#9E5660] cursor-pointer'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Add to Bag</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isVariantAvailable) {
                buyNow(product, selectedSize, selectedColor, 1);
              }
            }}
            disabled={!isVariantAvailable}
            className={`py-2 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 whitespace-nowrap ${
              !isVariantAvailable
                ? 'bg-[#F4EDE2] text-[#665E5B] cursor-not-allowed'
                : 'bg-[#9E5660] hover:bg-[#84424C] text-white cursor-pointer'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{!isVariantAvailable ? 'Unavailable' : 'Buy Now'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
