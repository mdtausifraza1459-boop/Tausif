/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect, Component } from 'react';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { Product } from './types.ts';
import { getEffectiveSizePrice, getProductPriceRange } from './utils/pricing.ts';
import { Header } from './components/Header.tsx';
import { HeroBanner } from './components/HeroBanner.tsx';
import { CategoryBar } from './components/CategoryBar.tsx';
import { FilterSidebar } from './components/FilterSidebar.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { CustomerAccountModal } from './components/CustomerAccountModal.tsx';
import { OrderTrackingModal } from './components/OrderTrackingModal.tsx';
import { SizeGuideModal } from './components/SizeGuideModal.tsx';
import { ProductComparisonModal } from './components/ProductComparisonModal.tsx';
import { WholesalePortalModal } from './components/WholesalePortalModal.tsx';
import { InfoPagesModal } from './components/InfoPagesModal.tsx';
import { CustomerReviewsSection } from './components/CustomerReviewsSection.tsx';
import { NewsletterSection } from './components/NewsletterSection.tsx';
import { WhatsAppButton } from './components/WhatsAppButton.tsx';
import { Footer } from './components/Footer.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { PWAInstallBanner } from './components/PWAInstallBanner.tsx';
import { LookbookOutfitModal } from './components/LookbookOutfitModal.tsx';
import { DigitalGiftCardModal } from './components/DigitalGiftCardModal.tsx';
import { AIShoppingAssistant } from './components/AIShoppingAssistant.tsx';
import {
  SlidersHorizontal,
  ArrowUpDown,
  Home,
  Grid,
  Truck,
  Heart,
  ShoppingBag,
  X,
  CheckCircle2,
  GitCompare,
  Shield,
  Sparkles,
  Clock,
  Wrench,
} from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: Error): ErrorBoundaryState {
    return { hasError: true, message: err?.message || 'Unexpected rendering error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-6 text-[#191615] font-sans">
          <div className="max-w-md w-full bg-white border border-[#EADFD8] rounded-xl p-8 text-center space-y-4 shadow-sm">
            <h1 className="font-serif text-2xl font-semibold">Something needs a quick refresh</h1>
            <p className="text-xs text-[#665E5B]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#9E5660] text-white text-xs font-semibold uppercase tracking-wider rounded-md cursor-pointer"
            >
              Reload Storefront
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const StoreContent: React.FC = () => {
  const {
    products,
    settings,
    loading,
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    quickViewProduct,
    setQuickViewProduct,
    activeView,
    cartItemCount,
    setCartDrawerOpen,
    setCheckoutModalOpen,
    setTrackingModalOpen,
    setAuthModalOpen,
    wishlist,
    setActiveView,
    toast,
    dismissToast,
    compareList,
    setCompareModalOpen,
    clearCompare,
    recentlyViewed,
    setLookbookModalOpen,
    setGiftCardModalOpen,
    flashSales,
  } = useStore();

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [trendingOnly, setTrendingOnly] = useState(false);

  // Fetch server-computed recommendations based on recently viewed IDs
  useEffect(() => {
    const idsParam = recentlyViewed.slice(0, 6).join(',');
    let cancelled = false;
    fetch(`/api/products/recommendations?ids=${encodeURIComponent(idsParam)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];
        if (!cancelled && list.length > 0) {
          setRecommendedProducts(list.slice(0, 4));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [recentlyViewed]);

  // Dynamic Schema.org Product JSON-LD when Quick View PDP is open
  useEffect(() => {
    const existingScript = document.getElementById('zohra-product-jsonld');
    if (existingScript) existingScript.remove();

    if (!quickViewProduct) return;

    const script = document.createElement('script');
    script.id = 'zohra-product-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: quickViewProduct.name,
      sku: quickViewProduct.sku || quickViewProduct.id,
      image: quickViewProduct.images,
      description: quickViewProduct.description,
      brand: {
        '@type': 'Brand',
        name: quickViewProduct.brand || settings?.brandName || 'Zohra Luxe',
      },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: getEffectiveSizePrice(quickViewProduct),
        availability:
          quickViewProduct.inStock && quickViewProduct.stockQuantity > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
      },
      ...(quickViewProduct.reviewCount > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: quickViewProduct.rating,
              reviewCount: quickViewProduct.reviewCount,
            },
          }
        : {}),
    });
    document.head.appendChild(script);
    return () => {
      document.getElementById('zohra-product-jsonld')?.remove();
    };
  }, [quickViewProduct, settings?.brandName]);

  const recentlyViewedProducts = useMemo(() => {
    return recentlyViewed
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p))
      .slice(0, 4);
  }, [recentlyViewed, products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const range = getProductPriceRange(p);

        if (filters.category !== 'All' && p.category.toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const priceMatch = q.match(/under\s*(?:rs\.?|inr|₹)?\s*(\d+)/i);
          if (priceMatch) {
            const maxP = parseInt(priceMatch[1], 10);
            if (range.min > maxP) return false;
          }

          const cleanTerms = q
            .replace(/under\s*(?:rs\.?|inr|₹)?\s*\d+/gi, '')
            .trim()
            .split(/\s+/)
            .filter(Boolean);

          if (cleanTerms.length > 0) {
            const haystack = `${p.name} ${p.sku || ''} ${p.category} ${p.brand || ''} ${p.fabric} ${
              p.sleeveType || ''
            } ${p.kurtiLength || ''} ${p.occasion || ''} ${p.description} ${p.colors
              ?.map((c) => c.name)
              .join(' ')}`.toLowerCase();
            if (!cleanTerms.every((term) => haystack.includes(term))) return false;
          }
        }

        if (filters.sizes.length > 0 && !filters.sizes.some((s) => p.sizes.includes(s))) {
          return false;
        }

        if (
          filters.colors.length > 0 &&
          !filters.colors.some((c) =>
            p.colors.some((pc) => pc.name.toLowerCase().includes(c.toLowerCase()))
          )
        ) {
          return false;
        }

        if (
          filters.fabrics.length > 0 &&
          !filters.fabrics.some((f) => p.fabric.toLowerCase().includes(f.toLowerCase()))
        ) {
          return false;
        }

        if (
          filters.sleeveTypes.length > 0 &&
          !filters.sleeveTypes.some((slv) => p.sleeveType && p.sleeveType.toLowerCase() === slv.toLowerCase())
        ) {
          return false;
        }

        if (
          filters.kurtiLengths.length > 0 &&
          !filters.kurtiLengths.some((len) => p.kurtiLength && p.kurtiLength.toLowerCase() === len.toLowerCase())
        ) {
          return false;
        }

        if (
          filters.occasions.length > 0 &&
          !filters.occasions.some(
            (occ) => p.occasion && p.occasion.toLowerCase().includes(occ.toLowerCase())
          )
        ) {
          return false;
        }

        if (filters.minDiscount > 0 && p.discountPercent < filters.minDiscount) return false;
        if (filters.minRating > 0 && p.rating < filters.minRating) return false;
        if (filters.inStockOnly && (!p.inStock || p.stockQuantity <= 0)) return false;
        if (range.min > filters.priceRange[1]) return false;
        if (filters.newArrivalsOnly && !p.isNewArrival) return false;
        if (filters.bestSellersOnly && !p.isBestSeller) return false;
        if (trendingOnly && !p.isTrending) return false;

        return true;
      })
      .sort((a, b) => {
        const aPrice = getProductPriceRange(a).min;
        const bPrice = getProductPriceRange(b).min;
        if (filters.sortBy === 'price-asc') return aPrice - bPrice;
        if (filters.sortBy === 'price-desc') return bPrice - aPrice;
        if (filters.sortBy === 'rating') return b.rating - a.rating;
        if (filters.sortBy === 'popularity') return b.reviewCount - a.reviewCount;
        if (filters.sortBy === 'discount') return b.discountPercent - a.discountPercent;
        if (filters.sortBy === 'newest') return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
        return 0;
      });
  }, [products, filters, searchQuery, trendingOnly]);

  if (activeView === 'admin') {
    return <AdminPortal />;
  }

  // Maintenance mode gate for storefront shoppers while still letting authorized owners sign in
  if (settings?.maintenanceMode) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-6 font-sans text-[#191615]">
        <div className="max-w-lg w-full bg-white border border-[#EADFD8] rounded-xl p-8 text-center space-y-5 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#F9EEF0] text-[#9E5660] flex items-center justify-center mx-auto">
            <Wrench className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <p className="font-serif text-xs uppercase tracking-[0.25em] text-[#B58A4A] font-semibold">
              {settings?.brandName || 'ZOHRA LUXE'} Atelier
            </p>
            <h1 className="font-serif text-3xl font-semibold">Scheduled Storefront Maintenance</h1>
            <p className="text-sm text-[#665E5B] leading-relaxed">
              We are curating our seasonal collection. For assistance, call{' '}
              <span className="font-mono font-semibold text-[#9E5660]">
                +91 {settings?.whatsappNumber || '9310078735'}
              </span>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('admin')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#EADFD8] hover:border-[#9E5660] text-xs font-medium text-[#665E5B] hover:text-[#191615] rounded-md transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-[#9E5660]" />
            <span>Store Admin Sign In</span>
          </button>
        </div>
      </div>
    );
  }

  const quickTabs = [
    {
      label: 'All Styles',
      active:
        filters.category === 'All' &&
        filters.priceRange[1] === 10000 &&
        filters.minDiscount === 0 &&
        filters.minRating === 0 &&
        !filters.newArrivalsOnly &&
        !filters.bestSellersOnly &&
        !trendingOnly,
      action: () => {
        setTrendingOnly(false);
        setFilters((prev) => ({
          ...prev,
          category: 'All',
          priceRange: [0, 10000],
          minDiscount: 0,
          minRating: 0,
          newArrivalsOnly: false,
          bestSellersOnly: false,
        }));
      },
    },
    {
      label: 'New Arrivals',
      active: filters.newArrivalsOnly,
      action: () => {
        setTrendingOnly(false);
        setFilters((prev) => ({
          ...prev,
          newArrivalsOnly: !prev.newArrivalsOnly,
          bestSellersOnly: false,
        }));
      },
    },
    {
      label: 'Best Sellers',
      active: filters.bestSellersOnly,
      action: () => {
        setTrendingOnly(false);
        setFilters((prev) => ({
          ...prev,
          bestSellersOnly: !prev.bestSellersOnly,
          newArrivalsOnly: false,
        }));
      },
    },
    {
      label: 'Trending Now',
      active: trendingOnly,
      action: () => {
        setTrendingOnly((v) => !v);
        setFilters((prev) => ({
          ...prev,
          newArrivalsOnly: false,
          bestSellersOnly: false,
        }));
      },
    },
    {
      label: 'Special Offers',
      active: filters.minDiscount === 30,
      action: () =>
        setFilters((prev) => ({ ...prev, minDiscount: prev.minDiscount === 30 ? 0 : 30 })),
    },
    {
      label: 'Under ₹999',
      active: filters.priceRange[1] === 999,
      action: () =>
        setFilters((prev) => ({
          ...prev,
          priceRange: prev.priceRange[1] === 999 ? [0, 10000] : [0, 999],
        })),
    },
  ];

  const activeCatalogHeading = filters.newArrivalsOnly
    ? 'New Arrivals'
    : filters.bestSellersOnly
    ? 'Best Sellers'
    : trendingOnly
    ? 'Trending Now'
    : filters.minDiscount >= 30
    ? 'Special Offers'
    : filters.category === 'All'
    ? "Women's Collection"
    : filters.category;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F4] text-[#191615] pb-16 md:pb-0 font-sans">
      <PWAInstallBanner />
      <Header />

      <HeroBanner />

      <CategoryBar />

      {/* Main Catalog Workspace */}
      <main id="catalog-section" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Live Flash Sale Strip when active */}
        {flashSales.length > 0 && (
          <div className="mb-6 bg-[#191615] text-white rounded-xl border border-[#EADFD8]/30 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 bg-[#9E5660] text-white font-mono text-[10px] font-bold uppercase tracking-wider rounded">
                Special Offer
              </span>
              <p className="text-xs sm:text-sm font-medium">
                {flashSales[0].title} —{' '}
                <span className="text-[#E8C5C8] font-mono font-semibold">
                  Up to {flashSales[0].discountPercent}% Off
                </span>
              </p>
            </div>
            <span className="text-[11px] font-mono text-[#E8C5C8]">
              Ends{' '}
              {new Date(flashSales[0].endsAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {/* Segmented Quick Collection Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 no-scrollbar mb-3">
          {quickTabs.map((tab, idx) => (
            <button
              key={idx}
              type="button"
              onClick={tab.action}
              className={`shrink-0 px-3.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                tab.active
                  ? 'bg-[#9E5660] text-white border-[#9E5660] shadow-xs'
                  : 'bg-white text-[#191615] border-[#EADFD8] hover:border-[#9E5660] hover:bg-[#F9EEF0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Shop by Occasion Selector + Lookbook Shortcut */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-[#EADFD8]">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#665E5B] shrink-0 mr-1">
              Occasion:
            </span>
            {['Wedding', 'Party', 'Festive', 'Eid', 'Office', 'Casual', 'Daily Wear'].map((occ) => {
              const active = filters.occasions.includes(occ);
              return (
                <button
                  key={occ}
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      occasions: prev.occasions.includes(occ)
                        ? prev.occasions.filter((o) => o !== occ)
                        : [...prev.occasions, occ],
                    }))
                  }
                  className={`shrink-0 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#191615] text-white border-[#191615]'
                      : 'bg-white text-[#665E5B] border-[#EADFD8] hover:border-[#9E5660] hover:text-[#191615]'
                  }`}
                >
                  {occ}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLookbookModalOpen(true)}
              className="px-3 py-1.5 bg-[#F9EEF0] hover:bg-[#F3DDE1] border border-[#EADFD8] text-[#9E5660] text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B58A4A]" />
              <span>Lookbooks</span>
            </button>
            <button
              type="button"
              onClick={() => setGiftCardModalOpen(true)}
              className="px-3 py-1.5 bg-white hover:bg-[#191615] hover:text-white border border-[#EADFD8] text-[#191615] text-xs font-semibold rounded-md cursor-pointer transition-colors whitespace-nowrap"
            >
              Gift Cards
            </button>
          </div>
        </div>

        {/* Section Header, Count & Sort Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-[#EADFD8]">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#191615]">
              {activeCatalogHeading}
            </h2>
            <span className="text-xs font-semibold text-[#9E5660] font-mono tabular-nums">
              {filteredProducts.length} styles {searchQuery && `· “${searchQuery}”`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden px-3.5 py-2 border border-[#EADFD8] bg-white hover:border-[#9E5660] rounded-md text-xs font-semibold text-[#191615] flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#9E5660]" />
              <span>Filters ({filteredProducts.length})</span>
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#665E5B] hidden sm:inline-flex items-center gap-1 font-medium">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#9E5660]" />
                <span>Sort:</span>
              </span>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: e.target.value as any,
                  }))
                }
                className="bg-white border border-[#EADFD8] text-xs font-medium text-[#191615] rounded-md px-3 py-2 focus:outline-none focus:border-[#9E5660] cursor-pointer"
              >
                <option value="relevance">Relevance</option>
                <option value="popularity">Popularity</option>
                <option value="newest">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="discount">Biggest Discount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Sidebar + Product Grid */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="hidden lg:block shrink-0 sticky top-28">
            <FilterSidebar totalCount={filteredProducts.length} />
          </div>

          {mobileFilterOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex justify-end">
              <div className="bg-white w-full max-w-xs p-5 rounded-xl overflow-y-auto max-h-[92vh] space-y-4 shadow-2xl border border-[#EADFD8]">
                <div className="flex justify-between items-center border-b border-[#EADFD8] pb-3">
                  <h3 className="font-serif text-lg font-semibold text-[#191615]">Filters</h3>
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(false)}
                    className="text-xs font-medium text-[#9E5660] px-3 py-1 bg-[#F9EEF0] rounded border border-[#EADFD8] cursor-pointer"
                  >
                    Done
                  </button>
                </div>
                <FilterSidebar totalCount={filteredProducts.length} />
              </div>
            </div>
          )}

          <div className="flex-1 w-full">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[3/4] bg-[#F4EDE2] rounded-xl border border-[#EADFD8]"
                  />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-xl border border-[#EADFD8] space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#F9EEF0] text-[#9E5660] flex items-center justify-center mx-auto">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <p className="font-serif text-2xl font-semibold text-[#191615]">
                  No products found.
                </p>
                <p className="text-xs text-[#665E5B] max-w-md mx-auto">
                  Clear your active filters to view the complete Zohra Luxe collection.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setTrendingOnly(false);
                    setFilters({
                      category: 'All',
                      sizes: [],
                      colors: [],
                      fabrics: [],
                      sleeveTypes: [],
                      kurtiLengths: [],
                      occasions: [],
                      minDiscount: 0,
                      minRating: 0,
                      inStockOnly: false,
                      priceRange: [0, 10000],
                      sortBy: 'relevance',
                      newArrivalsOnly: false,
                      bestSellersOnly: false,
                    });
                  }}
                  className="px-5 py-2.5 bg-[#9E5660] hover:bg-[#84424C] text-white text-xs font-medium tracking-wider uppercase rounded-md transition-colors cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recently Viewed Section */}
        {recentlyViewedProducts.length > 0 && (
          <section className="mt-14 pt-10 border-t border-[#EADFD8] space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#F9EEF0] text-[#9E5660] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[#191615]">Recently Viewed</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {recentlyViewedProducts.map((item) => (
                <ProductCard key={`recent-${item.id}`} product={item} />
              ))}
            </div>
          </section>
        )}

        {/* Personalized Recommendations Section */}
        {recommendedProducts.length > 0 && (
          <section className="mt-14 pt-10 border-t border-[#EADFD8] space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#F9EEF0] text-[#9E5660] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[#191615]">Just for You</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {recommendedProducts.map((item) => (
                <ProductCard key={`rec-${item.id}`} product={item} />
              ))}
            </div>
          </section>
        )}
      </main>

      <CustomerReviewsSection />

      <NewsletterSection />

      <Footer />

      <WhatsAppButton />

      {/* Floating Compare Bar */}
      {compareList.length > 0 && (
        <div className="fixed bottom-16 md:bottom-6 left-4 z-40 bg-[#191615] text-white border border-[#EADFD8]/30 rounded-lg shadow-2xl px-4 py-2.5 flex items-center gap-3">
          <GitCompare className="w-4 h-4 text-[#E8C5C8] shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-[#E8C5C8]">{compareList.length}</span>{' '}
            <span className="text-white/90">
              {compareList.length === 1 ? 'style' : 'styles'} to compare
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCompareModalOpen(true)}
            className="px-3 py-1 bg-[#9E5660] hover:bg-[#84424C] text-white text-[11px] font-bold uppercase tracking-wider rounded cursor-pointer transition-colors"
          >
            Compare
          </button>
          <button
            type="button"
            onClick={clearCompare}
            aria-label="Clear compare list"
            className="text-white/70 hover:text-white p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Non-blocking Floating Ordering Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 md:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-white border border-[#EADFD8] rounded-lg shadow-xl p-3.5 flex items-start gap-3 text-[#191615]"
        >
          {toast.image ? (
            <img
              src={toast.image}
              alt=""
              referrerPolicy="no-referrer"
              className="w-11 h-14 object-cover rounded border border-[#EADFD8] shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#F9EEF0] text-[#9E5660] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#191615] truncate">{toast.title}</p>
            {toast.subtitle && (
              <p className="text-[11px] text-[#665E5B] mt-0.5 truncate">{toast.subtitle}</p>
            )}
            {toast.showBagActions && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    dismissToast();
                    setCartDrawerOpen(true);
                  }}
                  className="px-2.5 py-1 bg-[#F9EEF0] hover:bg-[#F3DDE1] text-[#9E5660] rounded text-[11px] font-semibold cursor-pointer"
                >
                  View Bag
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dismissToast();
                    setCheckoutModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-[#9E5660] hover:bg-[#84424C] text-white rounded text-[11px] font-semibold cursor-pointer transition-colors"
                >
                  Checkout
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss notification"
            className="text-[#665E5B] hover:text-[#191615] p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Compact Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#EADFD8] flex items-center justify-around py-1.5 px-2 h-14">
        <button
          type="button"
          onClick={() => {
            setFilters((prev) => ({ ...prev, category: 'All' }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-0.5 text-[#9E5660] p-1 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        <button
          type="button"
          onClick={() => document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex flex-col items-center gap-0.5 text-[#665E5B] hover:text-[#9E5660] p-1 cursor-pointer"
        >
          <Grid className="w-4 h-4" />
          <span className="text-[10px] font-medium">Catalog</span>
        </button>

        <button
          type="button"
          onClick={() => setTrackingModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[#665E5B] hover:text-[#9E5660] p-1 cursor-pointer"
        >
          <Truck className="w-4 h-4" />
          <span className="text-[10px] font-medium">Track</span>
        </button>

        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[#665E5B] hover:text-[#9E5660] p-1 relative cursor-pointer"
        >
          <Heart className="w-4 h-4 text-[#9E5660]" />
          {wishlist.length > 0 && (
            <span className="absolute -top-0.5 right-0 text-[9px] font-bold font-mono text-[#9E5660]">
              {wishlist.length}
            </span>
          )}
          <span className="text-[10px] font-medium">Saved</span>
        </button>

        <button
          type="button"
          onClick={() => setCartDrawerOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[#191615] hover:text-[#9E5660] p-1 relative cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4 text-[#9E5660]" />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#9E5660] text-white text-[10px] font-bold rounded-full flex items-center justify-center font-mono tabular-nums">
              {cartItemCount}
            </span>
          )}
          <span className="text-[10px] font-medium">Bag</span>
        </button>
      </nav>

      {/* Modals & Drawers */}
      <CartDrawer />
      <CheckoutModal />
      <CustomerAccountModal />
      <OrderTrackingModal />
      <SizeGuideModal />
      <ProductComparisonModal />
      <WholesalePortalModal />
      <InfoPagesModal />
      <LookbookOutfitModal />
      <DigitalGiftCardModal />
      <AIShoppingAssistant />
      {quickViewProduct && (
        <ProductDetailModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppErrorBoundary>
      <StoreProvider>
        <StoreContent />
      </StoreProvider>
    </AppErrorBoundary>
  );
}

