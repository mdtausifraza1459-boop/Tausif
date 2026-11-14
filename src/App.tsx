/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect, Component } from 'react';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { Product } from './types.ts';
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
        <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-6 text-[#141413] font-sans">
          <div className="max-w-md w-full bg-white border border-[#E2DFD7] rounded-xl p-8 text-center space-y-4 shadow-sm">
            <h1 className="font-serif text-2xl font-semibold">Something needs a quick refresh</h1>
            <p className="text-xs text-[#63615C]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#164E3F] text-white text-xs font-semibold uppercase tracking-wider rounded-md cursor-pointer"
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
        price: quickViewProduct.discountedPrice,
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
        if (filters.category !== 'All' && p.category.toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const priceMatch = q.match(/under\s*(?:rs\.?|inr|₹)?\s*(\d+)/i);
          if (priceMatch) {
            const maxP = parseInt(priceMatch[1], 10);
            if (p.discountedPrice > maxP) return false;
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
        if (p.discountedPrice > filters.priceRange[1]) return false;
        if (filters.newArrivalsOnly && !p.isNewArrival) return false;
        if (filters.bestSellersOnly && !p.isBestSeller) return false;

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'price-asc') return a.discountedPrice - b.discountedPrice;
        if (filters.sortBy === 'price-desc') return b.discountedPrice - a.discountedPrice;
        if (filters.sortBy === 'rating') return b.rating - a.rating;
        if (filters.sortBy === 'popularity') return b.reviewCount - a.reviewCount;
        if (filters.sortBy === 'discount') return b.discountPercent - a.discountPercent;
        if (filters.sortBy === 'newest') return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
        return 0;
      });
  }, [products, filters, searchQuery]);

  if (activeView === 'admin') {
    return <AdminPortal />;
  }

  // Maintenance mode gate for storefront shoppers while still letting authorized owners sign in
  if (settings?.maintenanceMode) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center p-6 font-sans text-[#141413]">
        <div className="max-w-lg w-full bg-white border border-[#E2DFD7] rounded-xl p-8 text-center space-y-5 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#ECF4F1] text-[#164E3F] flex items-center justify-center mx-auto">
            <Wrench className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <p className="font-serif text-xs uppercase tracking-[0.25em] text-[#8E6D3B] font-semibold">
              {settings?.brandName || 'ZOHRA LUXE'} Atelier
            </p>
            <h1 className="font-serif text-3xl font-semibold">Scheduled Storefront Maintenance</h1>
            <p className="text-sm text-[#63615C] leading-relaxed">
              We are curating our seasonal collection and refining the online atelier experience. We will return shortly.
              For urgent wholesale inquiries, please call{' '}
              <span className="font-mono font-semibold text-[#164E3F]">+91 {settings?.whatsappNumber || '9310078735'}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('admin')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#E2DFD7] hover:border-[#141413] text-xs font-medium text-[#63615C] hover:text-[#141413] rounded-md transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-[#164E3F]" />
            <span>Store Owner Sign In</span>
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
        filters.minRating === 0,
      action: () =>
        setFilters((prev) => ({
          ...prev,
          category: 'All',
          priceRange: [0, 10000],
          minDiscount: 0,
          minRating: 0,
        })),
    },
    {
      label: 'Under ₹999',
      active: filters.priceRange[1] === 999,
      action: () => setFilters((prev) => ({ ...prev, priceRange: [0, 999] })),
    },
    {
      label: "Women's Kurtis",
      active: filters.category === "Women's Kurtis",
      action: () => setFilters((prev) => ({ ...prev, category: "Women's Kurtis" })),
    },
    {
      label: 'Anarkali Kurtis',
      active: filters.category === 'Anarkali Kurtis',
      action: () => setFilters((prev) => ({ ...prev, category: 'Anarkali Kurtis' })),
    },
    {
      label: 'Cotton Kurtis',
      active: filters.category === 'Cotton Kurtis',
      action: () => setFilters((prev) => ({ ...prev, category: 'Cotton Kurtis' })),
    },
    {
      label: 'Short Kurtis',
      active: filters.category === 'Short Kurtis',
      action: () => setFilters((prev) => ({ ...prev, category: 'Short Kurtis' })),
    },
    {
      label: 'Co-ord Sets',
      active: filters.category === 'Co-ord Sets',
      action: () => setFilters((prev) => ({ ...prev, category: 'Co-ord Sets' })),
    },
    {
      label: 'Festive Wear',
      active: filters.category === 'Festive Wear',
      action: () => setFilters((prev) => ({ ...prev, category: 'Festive Wear' })),
    },
    {
      label: '4★ & Above',
      active: filters.minRating === 4,
      action: () => setFilters((prev) => ({ ...prev, minRating: prev.minRating === 4 ? 0 : 4 })),
    },
    {
      label: '30%+ Off',
      active: filters.minDiscount === 30,
      action: () => setFilters((prev) => ({ ...prev, minDiscount: prev.minDiscount === 30 ? 0 : 30 })),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#141413] pb-16 md:pb-0 font-sans">
      <PWAInstallBanner />
      <Header />

      <HeroBanner />

      <CategoryBar />

      {/* Main Catalog Workspace */}
      <main id="catalog-section" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Live Flash Sale Strip when active */}
        {flashSales.length > 0 && (
          <div className="mb-6 bg-[#141413] text-white rounded-lg border border-[#2E2D2A] px-5 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-[#D4AF6A] text-[#141413] font-mono text-[10px] font-bold uppercase tracking-wider rounded">
                Live Flash Event
              </span>
              <p className="text-xs sm:text-sm font-medium">
                {flashSales[0].title} —{' '}
                <span className="text-[#D4AF6A] font-mono font-semibold">
                  Up to {flashSales[0].discountPercent}% Extra Privilege
                </span>
              </p>
            </div>
            <span className="text-[11px] font-mono text-[#CBC7BE]">
              Ends {new Date(flashSales[0].endsAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Segmented Quick Filter Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 no-scrollbar mb-3">
          {quickTabs.map((tab, idx) => (
            <button
              key={idx}
              type="button"
              onClick={tab.action}
              className={`shrink-0 px-3.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                tab.active
                  ? 'bg-[#164E3F] text-white border-[#164E3F]'
                  : 'bg-white text-[#141413] border-[#E2DFD7] hover:border-[#141413]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Shop by Occasion Editorial Selector + Lookbook Shortcut */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-[#E2DFD7]">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#63615C] shrink-0 mr-1">
              Shop by Occasion:
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
                  className={`shrink-0 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#141413] text-white border-[#141413]'
                      : 'bg-[#F7F6F2] text-[#141413] border-[#E2DFD7] hover:border-[#8E6D3B]'
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
              className="px-3 py-1.5 bg-[#FBF6EB] hover:bg-[#F5EBD6] border border-[#D4AF6A]/60 text-[#8E6D3B] text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lookbooks &amp; Outfit Builder</span>
            </button>
            <button
              type="button"
              onClick={() => setGiftCardModalOpen(true)}
              className="px-3 py-1.5 bg-white hover:bg-[#ECF4F1] border border-[#E2DFD7] text-[#164E3F] text-xs font-semibold rounded-md cursor-pointer transition-colors"
            >
              Gift Cards
            </button>
          </div>
        </div>

        {/* Section Header, Count & Sort Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-[#E2DFD7]">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#141413]">
              {filters.category === 'All' ? "Girls' & Women's Collections" : filters.category}
            </h2>
            <p className="text-xs text-[#63615C] mt-0.5">
              Showing{' '}
              <span className="font-semibold text-[#164E3F] font-mono tabular-nums">
                {filteredProducts.length}
              </span>{' '}
              curated styles {searchQuery && <span>for &ldquo;{searchQuery}&rdquo;</span>}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden px-3.5 py-2 border border-[#141413] bg-white rounded-md text-xs font-medium text-[#141413] flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#164E3F]" />
              <span>Filters ({filteredProducts.length})</span>
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#63615C] hidden sm:inline-flex items-center gap-1 font-medium">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#164E3F]" />
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
                className="bg-white border border-[#E2DFD7] text-xs font-medium text-[#141413] rounded-md px-3 py-2 focus:outline-none focus:border-[#141413] cursor-pointer"
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
              <div className="bg-white w-full max-w-xs p-5 rounded-lg overflow-y-auto max-h-[92vh] space-y-4 shadow-2xl border border-[#E2DFD7]">
                <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
                  <h3 className="font-serif text-lg font-semibold text-[#141413]">Refine Styles</h3>
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(false)}
                    className="text-xs font-medium text-[#164E3F] px-3 py-1 bg-[#ECF4F1] rounded border border-[#E2DFD7] cursor-pointer"
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
                    className="aspect-[3/4] bg-[#EFECE6] rounded-lg border border-[#E2DFD7]"
                  />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-lg border border-[#E2DFD7] space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#ECF4F1] text-[#164E3F] flex items-center justify-center mx-auto">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <p className="font-serif text-2xl font-semibold text-[#141413]">
                  No products found. Try another search.
                </p>
                <p className="text-xs text-[#63615C] max-w-md mx-auto">
                  No styles match your current search or filter selection. Clear filters to browse all collections.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
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
                  className="px-5 py-2.5 bg-[#141413] hover:bg-[#164E3F] text-white text-xs font-medium tracking-wider uppercase rounded-md transition-colors cursor-pointer"
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
          <section className="mt-14 pt-10 border-t border-[#E2DFD7] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#8E6D3B]" />
                <h3 className="font-serif text-2xl font-semibold text-[#141413]">Recently Viewed</h3>
              </div>
              <span className="text-xs text-[#63615C]">Pick up where you left off</span>
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
          <section className="mt-14 pt-10 border-t border-[#E2DFD7] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#164E3F]" />
                <h3 className="font-serif text-2xl font-semibold text-[#141413]">Recommended For You</h3>
              </div>
              <span className="text-xs text-[#63615C]">Curated from your browsing preferences</span>
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
        <div className="fixed bottom-16 md:bottom-6 left-4 z-40 bg-[#141413] text-white border border-[#2E2D2A] rounded-lg shadow-2xl px-4 py-2.5 flex items-center gap-3">
          <GitCompare className="w-4 h-4 text-[#D4AF6A] shrink-0" />
          <div className="text-xs">
            <span className="font-semibold">{compareList.length}</span>{' '}
            <span className="text-[#CBC7BE]">
              {compareList.length === 1 ? 'style' : 'styles'} selected to compare
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCompareModalOpen(true)}
            className="px-3 py-1 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-[11px] font-semibold uppercase tracking-wider rounded cursor-pointer"
          >
            Compare
          </button>
          <button
            type="button"
            onClick={clearCompare}
            aria-label="Clear compare list"
            className="text-white/60 hover:text-white p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Non-blocking Floating Ordering Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 md:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-white border border-[#E2DFD7] rounded-lg shadow-xl p-3.5 flex items-start gap-3 text-[#141413]"
        >
          {toast.image ? (
            <img
              src={toast.image}
              alt=""
              referrerPolicy="no-referrer"
              className="w-11 h-14 object-cover rounded border border-[#E2DFD7] shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#ECF4F1] text-[#164E3F] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#141413] truncate">{toast.title}</p>
            {toast.subtitle && (
              <p className="text-[11px] text-[#63615C] mt-0.5 truncate">{toast.subtitle}</p>
            )}
            {toast.showBagActions && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    dismissToast();
                    setCartDrawerOpen(true);
                  }}
                  className="px-2.5 py-1 bg-[#EFECE6] hover:bg-[#E2DFD7] text-[#141413] rounded text-[11px] font-medium cursor-pointer"
                >
                  View Bag
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dismissToast();
                    setCheckoutModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-[#164E3F] hover:bg-[#0F3A2E] text-white rounded text-[11px] font-medium cursor-pointer"
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
            className="text-[#63615C] hover:text-[#141413] p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Compact Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2DFD7] flex items-center justify-around py-1.5 px-2 h-14">
        <button
          type="button"
          onClick={() => {
            setFilters((prev) => ({ ...prev, category: 'All' }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-0.5 text-[#141413] p-1 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        <button
          type="button"
          onClick={() => document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex flex-col items-center gap-0.5 text-[#63615C] hover:text-[#141413] p-1 cursor-pointer"
        >
          <Grid className="w-4 h-4" />
          <span className="text-[10px] font-medium">Catalog</span>
        </button>

        <button
          type="button"
          onClick={() => setTrackingModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[#63615C] hover:text-[#141413] p-1 cursor-pointer"
        >
          <Truck className="w-4 h-4" />
          <span className="text-[10px] font-medium">Track</span>
        </button>

        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[#63615C] hover:text-[#141413] p-1 relative cursor-pointer"
        >
          <Heart className="w-4 h-4" />
          {wishlist.length > 0 && (
            <span className="absolute -top-0.5 right-0 text-[9px] font-bold font-mono text-[#164E3F]">
              {wishlist.length}
            </span>
          )}
          <span className="text-[10px] font-medium">Saved</span>
        </button>

        <button
          type="button"
          onClick={() => setCartDrawerOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[#63615C] hover:text-[#141413] p-1 relative cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#164E3F] text-white text-[10px] font-bold rounded-full flex items-center justify-center font-mono tabular-nums">
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
