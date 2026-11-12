import React, { useState } from 'react';
import { Product } from '../types.ts';
import { useStore } from '../context/StoreContext.tsx';
import { Heart, Star, ShoppingBag, Eye, Zap } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { isInWishlist, toggleWishlist, addToCart, buyNow, setQuickViewProduct } = useStore();
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0] || 'M');
  const [selectedColor] = useState<string>(product.colors[0]?.name || 'Standard');
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const isLiked = isInWishlist(product.id);
  const primaryImage = product.images[0] || '/src/assets/images/category_kurtis_showcase_1794109164419.jpg';
  const secondaryImage = product.images[1] || primaryImage;

  const highlightLabel =
    product.stockQuantity === 0
      ? 'SOLD OUT'
      : product.badge ||
        (product.stockQuantity < 10
          ? 'LOW STOCK'
          : product.isBestSeller
          ? 'BEST SELLER'
          : product.isNewArrival
          ? 'NEW ARRIVAL'
          : undefined);

  return (
    <article
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex flex-col bg-white rounded-lg overflow-hidden border border-[#E5DFD7] hover:border-[#6D1D3A] transition-all duration-200 relative"
    >
      {/* Clean 3:4 Product Image Container */}
      <div
        className="relative aspect-[3/4] w-full bg-[#F3EFEA] overflow-hidden cursor-pointer"
        onClick={() => setQuickViewProduct(product)}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 bg-[#F3EFEA] flex items-center justify-center">
            <span className="font-serif text-sm text-[#6B625D]">Zohra Luxe</span>
          </div>
        )}

        <img
          src={isHovered && secondaryImage ? secondaryImage : primaryImage}
          alt={product.name}
          referrerPolicy="no-referrer"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover object-top transition-transform duration-500 ${
            isHovered ? 'scale-105' : 'scale-100'
          }`}
        />

        {highlightLabel && (
          <span
            className={`absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded z-10 pointer-events-none ${
              highlightLabel === 'SOLD OUT'
                ? 'bg-[#B91C1C] text-white'
                : highlightLabel === 'LOW STOCK'
                ? 'bg-[#B45309] text-white'
                : 'bg-[#1C1917]/85 text-white'
            }`}
          >
            {highlightLabel}
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          aria-label={isLiked ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full transition-colors z-10 cursor-pointer ${
            isLiked
              ? 'bg-[#6D1D3A] text-white'
              : 'bg-white/90 text-[#6B625D] hover:bg-white hover:text-[#6D1D3A]'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        {/* Quick View Bar */}
        <div
          className={`absolute inset-x-3 bottom-3 transition-all duration-200 z-10 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQuickViewProduct(product);
            }}
            className="w-full py-2 px-3 bg-white/95 hover:bg-[#1C1917] hover:text-white text-xs font-semibold text-[#1C1917] rounded-md shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Quick View</span>
          </button>
        </div>
      </div>

      {/* Product Metadata & Ordering Controls */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5 bg-white">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[11px] text-[#6B625D]">
            <span className="truncate font-medium">
              {product.category} · {product.fabric}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[#166534] font-bold shrink-0 tabular-nums">
              <span>{product.rating}</span>
              <Star className="w-3 h-3 fill-current" />
            </span>
          </div>

          <h3
            onClick={() => setQuickViewProduct(product)}
            className="text-sm font-semibold text-[#1C1917] hover:text-[#6D1D3A] transition-colors line-clamp-1 cursor-pointer"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        {/* Pricing Row */}
        <div className="flex items-baseline justify-between gap-2 pt-1.5 border-t border-[#E5DFD7]">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold font-mono text-[#1C1917] tabular-nums">
              ₹{product.discountedPrice.toLocaleString()}
            </span>
            {product.originalPrice > product.discountedPrice && (
              <>
                <span className="text-xs text-[#6B625D] line-through font-mono tabular-nums">
                  ₹{product.originalPrice.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-[#166534] tabular-nums">
                  {product.discountPercent}% off
                </span>
              </>
            )}
          </div>
          {product.stockQuantity > 0 && product.stockQuantity < 10 && (
            <span className="text-[11px] text-[#B45309] font-semibold">
              {product.stockQuantity} left
            </span>
          )}
        </div>

        {/* Interactive Size Selector */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <span className="text-[11px] text-[#6B625D] mr-1">Size:</span>
          {product.sizes.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => setSelectedSize(sz)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                selectedSize === sz
                  ? 'border-[#6D1D3A] bg-[#6D1D3A] text-white'
                  : 'border-[#E5DFD7] bg-white text-[#1C1917] hover:border-[#6D1D3A]'
              }`}
            >
              {sz}
            </button>
          ))}
        </div>

        {/* Wholesale Note in English */}
        <div className="flex items-center justify-between text-[11px] text-[#6B625D] pt-0.5">
          <span>Bulk Wholesale Inquiry:</span>
          <a
            href="tel:9310078735"
            onClick={(e) => e.stopPropagation()}
            className="text-[#6D1D3A] font-mono font-semibold hover:underline"
          >
            +91 9310078735
          </a>
        </div>

        {/* Dual Ordering CTAs: Add to Bag + Instant Buy Now */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              if (product.stockQuantity > 0) {
                addToCart(product, selectedSize, selectedColor, 1, false);
              }
            }}
            disabled={product.stockQuantity === 0}
            className={`py-2 px-2.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border ${
              product.stockQuantity === 0
                ? 'bg-[#F3EFEA] text-[#6B625D] border-[#E5DFD7] cursor-not-allowed'
                : 'bg-white hover:bg-[#FBF2F5] text-[#6D1D3A] border-[#6D1D3A]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Add to Bag</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (product.stockQuantity > 0) {
                buyNow(product, selectedSize, selectedColor, 1);
              }
            }}
            disabled={product.stockQuantity === 0}
            className={`py-2 px-2.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              product.stockQuantity === 0
                ? 'bg-[#F3EFEA] text-[#6B625D] cursor-not-allowed'
                : 'bg-[#6D1D3A] hover:bg-[#53142B] text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{product.stockQuantity === 0 ? 'Sold Out' : 'Buy Now'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};
