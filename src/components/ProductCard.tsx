import React, { useState } from 'react';
import { Product } from '../types.ts';
import { useStore, getProductVariantStock } from '../context/StoreContext.tsx';
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
    getEffectivePrice,
  } = useStore();
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0] || 'M');
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isLiked = isInWishlist(product.id);
  const isCompared = isInCompare(product.id);
  const selectedColor = product.colors[selectedColorIndex]?.name || 'Standard';
  const variantAvail = getProductVariantStock(product, selectedSize, selectedColor);
  const isVariantAvailable = variantAvail > 0 && product.stockQuantity > 0;

  const primaryImage =
    product.images[0] || '/src/assets/images/category_kurtis_showcase_1794109164419.jpg';
  const secondaryImage = product.images[1] || primaryImage;
  const hasSecondary = secondaryImage !== primaryImage;

  const effectivePrice = getEffectivePrice(product);
  const hasFlashSale =
    product.flashSalePrice !== undefined && product.flashSalePrice < product.discountedPrice;

  const highlightLabel =
    product.stockQuantity === 0
      ? 'SOLD OUT'
      : hasFlashSale
      ? 'FLASH SALE'
      : product.badge ||
        (product.stockQuantity < 10
          ? 'LOW STOCK'
          : product.isBestSeller
          ? 'BEST SELLER'
          : product.isNewArrival
          ? 'NEW ARRIVAL'
          : undefined);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/?product=${encodeURIComponent(product.id)}`;
    const shareData = {
      title: `${product.name} — Zohra Luxe`,
      text: `Explore ${product.name} (${product.fabric}) at ₹${product.discountedPrice.toLocaleString()} on Zohra Luxe.`,
      url: shareUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showToast({ title: 'Product Link Copied', subtitle: product.name, type: 'success' });
      }
    } catch {
      // ignore cancelled native share
    }
  };

  return (
    <article
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex flex-col bg-white rounded-xl overflow-hidden border border-[#E6DFD3] hover:border-[#D4AF6A] hover:-translate-y-1 hover:shadow-lg hover:shadow-[#8E6D3B]/15 transition-all duration-200 relative"
    >
      {/* Editorial 3:4 Portrait Container with Smooth Secondary Crossfade */}
      <div
        className="relative aspect-[3/4] w-full bg-[#EFECE6] overflow-hidden cursor-pointer"
        onClick={() => setQuickViewProduct(product)}
      >
        {imageError ? (
          <div className="absolute inset-0 bg-[#EFECE6] flex flex-col items-center justify-center p-4 text-center">
            <span className="font-serif text-lg font-medium text-[#141413]">{product.name}</span>
            <span className="text-xs text-[#63615C] mt-1">{product.category}</span>
          </div>
        ) : (
          <>
            <img
              src={primaryImage}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className={`w-full h-full object-cover object-top transition-transform duration-500 ${
                isHovered ? 'scale-105' : 'scale-100'
              }`}
            />
            {hasSecondary && (
              <img
                src={secondaryImage}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-500 ${
                  isHovered ? 'opacity-100 scale-105' : 'opacity-0'
                }`}
              />
            )}
          </>
        )}

        {highlightLabel && (
          <span
            className={`absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded shadow-sm z-10 pointer-events-none ${
              highlightLabel === 'SOLD OUT'
                ? 'bg-[#B91C1C] text-white'
                : highlightLabel === 'FLASH SALE'
                ? 'bg-gradient-to-r from-[#881337] to-[#BE185D] text-[#F5D076]'
                : highlightLabel === 'LOW STOCK'
                ? 'bg-[#D97706] text-white'
                : highlightLabel === 'BEST SELLER'
                ? 'bg-gradient-to-r from-[#9F1239] to-[#7A1C3A] text-white'
                : 'bg-[#164E3F] text-[#F5D076]'
            }`}
          >
            {highlightLabel}
          </span>
        )}

        {/* Top-right Action Stack: Wishlist, Compare, Share */}
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
                ? 'bg-[#BE185D] text-white'
                : 'bg-white/95 text-[#9F1239] hover:bg-[#FFF1F5] hover:text-[#BE185D]'
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
            title={isCompared ? 'In comparison' : 'Compare garment'}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              isCompared
                ? 'bg-[#141413] text-[#D4AF6A]'
                : 'bg-white/90 text-[#63615C] hover:bg-white hover:text-[#141413]'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Share product"
            title="Share product link"
            className="p-2 rounded-full bg-white/90 text-[#63615C] hover:bg-white hover:text-[#141413] transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick View Trigger Overlay */}
        <div
          className={`absolute inset-x-3 bottom-3 transition-all duration-200 z-10 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setQuickViewProduct(product);
            }}
            className="w-full py-2 px-3 bg-white/95 hover:bg-[#141413] hover:text-white text-xs font-medium text-[#141413] rounded-md shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Quick View</span>
          </button>
        </div>
      </div>

      {/* Clean Metadata, Swatches & Variant Ordering Controls */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-2.5 bg-white">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[11px] text-[#63615C]">
            <span className="truncate font-semibold uppercase tracking-wider text-[#164E3F]">
              {product.category}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[#D97706] font-mono font-semibold shrink-0 tabular-nums">
              <span>{product.rating}</span>
              <Star className="w-3 h-3 fill-current" />
            </span>
          </div>

          <h3
            onClick={() => setQuickViewProduct(product)}
            className="font-serif text-[17px] font-semibold text-[#141413] hover:text-[#9F1239] transition-colors line-clamp-1 cursor-pointer leading-snug"
            title={product.name}
          >
            {product.name}
          </h3>
          <p className="text-[11px] text-[#63615C] truncate">{product.fabric}</p>
        </div>

        {/* Colour Swatch Row */}
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
                  className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                    selectedColorIndex === idx
                      ? 'ring-2 ring-offset-1 ring-[#9F1239] scale-110 border-[#9F1239]'
                      : 'border-[#E2DFD7] hover:scale-105'
                  }`}
                  style={{ backgroundColor: col.hex }}
                />
              ))}
              <span className="text-[11px] text-[#63615C] ml-1 truncate max-w-[95px]">
                {selectedColor}
              </span>
            </div>
            {(variantAvail === 0 || variantAvail <= 5) && (
              <span
                className={`text-[10px] font-mono font-semibold shrink-0 tabular-nums ${
                  variantAvail === 0 ? 'text-[#B91C1C]' : 'text-[#D97706]'
                }`}
              >
                {variantAvail === 0 ? 'Out' : `${variantAvail} left`}
              </span>
            )}
          </div>
        )}

        {/* Tabular Pricing Row */}
        <div className="flex items-baseline gap-2 flex-wrap pt-2 border-t border-[#EFECE6]">
          <span className="text-base font-bold font-mono text-[#164E3F] tabular-nums">
            ₹{effectivePrice.toLocaleString()}
          </span>
          {product.originalPrice > effectivePrice && (
            <>
              <span className="text-xs text-[#63615C] line-through font-mono tabular-nums">
                ₹{(hasFlashSale ? product.discountedPrice : product.originalPrice).toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-[#BE185D] tabular-nums">
                {hasFlashSale
                  ? `${Math.round(((product.originalPrice - effectivePrice) / product.originalPrice) * 100)}% OFF`
                  : `${product.discountPercent}% OFF`}
              </span>
            </>
          )}
        </div>

        {/* Inline Size Selection */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {product.sizes.map((sz) => {
            const avail = getProductVariantStock(product, sz, selectedColor);
            return (
              <button
                key={sz}
                type="button"
                onClick={() => setSelectedSize(sz)}
                title={avail > 0 ? `${avail} in stock` : 'Out of stock'}
                className={`text-[11px] font-medium px-2 py-0.5 rounded border transition-colors cursor-pointer shrink-0 ${
                  selectedSize === sz
                    ? 'border-[#141413] bg-[#141413] text-white'
                    : avail === 0
                    ? 'border-[#E2DFD7] bg-[#F7F6F2] text-[#A8A59E] line-through'
                    : 'border-[#E2DFD7] bg-white text-[#141413] hover:border-[#141413]'
                }`}
              >
                {sz}
              </button>
            );
          })}
        </div>

        {/* Dual Ordering CTAs */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => {
              if (isVariantAvailable) {
                addToCart(product, selectedSize, selectedColor, 1, false);
              }
            }}
            disabled={!isVariantAvailable}
            className={`py-2 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer border whitespace-nowrap ${
              !isVariantAvailable
                ? 'bg-[#EFECE6] text-[#63615C] border-[#E2DFD7] cursor-not-allowed'
                : 'bg-[#FFFDF9] hover:bg-[#FFF1F5] text-[#881337] border-[#FBCFE8] hover:border-[#9F1239]'
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
            className={`py-2 px-2.5 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
              !isVariantAvailable
                ? 'bg-[#EFECE6] text-[#63615C] cursor-not-allowed'
                : 'bg-gradient-to-r from-[#164E3F] to-[#0F3A2E] hover:from-[#881337] hover:to-[#9F1239] text-white shadow-xs'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#F5D076]" />
            <span>{!isVariantAvailable ? 'Sold Out' : 'Buy Now'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
