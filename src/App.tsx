/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
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
import { CustomerReviewsSection } from './components/CustomerReviewsSection.tsx';
import { NewsletterSection } from './components/NewsletterSection.tsx';
import { WhatsAppButton } from './components/WhatsAppButton.tsx';
import { Footer } from './components/Footer.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
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
} from 'lucide-react';

const StoreContent: React.FC = () => {
  const {
    products,
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
  } = useStore();

  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false);

  // Admin route shortcut (?admin=true, #admin, or Ctrl/Cmd+Shift+A)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true' || window.location.hash === '#admin') {
      setActiveView('admin');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setActiveView(activeView === 'admin' ? 'store' : 'admin');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveView, activeView]);

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
            const haystack = `${p.name} ${p.category} ${p.brand || ''} ${p.fabric} ${
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
          !filters.occasions.some((occ) => p.occasion && p.occasion.toLowerCase() === occ.toLowerCase())
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
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1C1917] pb-16 md:pb-0 font-sans">
      <Header />

      <HeroBanner />

      <CategoryBar />

      {/* Main Catalog Workspace */}
      <main id="catalog-section" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Quick Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar mb-6">
          {quickTabs.map((tab, idx) => (
            <button
              key={idx}
              type="button"
              onClick={tab.action}
              className={`shrink-0 px-3.5 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                tab.active
                  ? 'bg-[#6D1D3A] text-white border-[#6D1D3A]'
                  : 'bg-white text-[#1C1917] border-[#E5DFD7] hover:border-[#6D1D3A] hover:text-[#6D1D3A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Section Title, Results Count & Sort Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-[#E5DFD7]">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1C1917]">
              {filters.category === 'All' ? "Girls' & Women's Collections" : filters.category}
            </h2>
            <p className="text-xs text-[#6B625D] mt-0.5">
              Showing{' '}
              <span className="font-bold text-[#6D1D3A] font-mono tabular-nums">
                {filteredProducts.length}
              </span>{' '}
              styles {searchQuery && <span>for &ldquo;{searchQuery}&rdquo;</span>}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden px-3.5 py-2 border border-[#6D1D3A] bg-[#FBF2F5] rounded-md text-xs font-semibold text-[#6D1D3A] flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters ({filteredProducts.length})</span>
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#6B625D] hidden sm:inline-flex items-center gap-1 font-medium">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#6D1D3A]" />
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
                className="bg-white border border-[#E5DFD7] text-xs font-semibold text-[#1C1917] rounded-md px-3 py-2 focus:outline-none focus:border-[#6D1D3A] cursor-pointer"
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
              <div className="bg-white w-full max-w-xs p-5 rounded-lg overflow-y-auto max-h-[92vh] space-y-4 shadow-2xl border border-[#E5DFD7]">
                <div className="flex justify-between items-center border-b border-[#E5DFD7] pb-3">
                  <h3 className="font-serif text-base font-bold text-[#1C1917]">Refine Styles</h3>
                  <button
                    type="button"
                    onClick={() => setMobileFilterOpen(false)}
                    className="text-xs font-semibold text-[#6D1D3A] px-3 py-1 bg-[#FBF2F5] rounded border border-[#E5DFD7] cursor-pointer"
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
                  <div key={i} className="aspect-[3/4] bg-[#F3EFEA] animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-lg border border-[#E5DFD7] space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#FBF2F5] text-[#6D1D3A] flex items-center justify-center mx-auto">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <p className="font-serif text-xl font-bold text-[#1C1917]">
                  No products found. Try another search.
                </p>
                <p className="text-xs text-[#6B625D] max-w-md mx-auto">
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
                  className="px-5 py-2.5 bg-[#6D1D3A] hover:bg-[#53142B] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors cursor-pointer"
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
      </main>

      <CustomerReviewsSection />

      <NewsletterSection />

      <Footer />

      <WhatsAppButton />

      {/* Interactive Ordering Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-20 md:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-white border border-[#E5DFD7] rounded-lg shadow-xl p-3.5 flex items-start gap-3 text-[#1C1917]"
        >
          {toast.image ? (
            <img
              src={toast.image}
              alt=""
              referrerPolicy="no-referrer"
              className="w-11 h-14 object-cover rounded border border-[#E5DFD7] shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#ECFDF5] text-[#166534] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#1C1917] truncate">{toast.title}</p>
            {toast.subtitle && (
              <p className="text-[11px] text-[#6B625D] mt-0.5 truncate">{toast.subtitle}</p>
            )}
            {toast.showBagActions && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    dismissToast();
                    setCartDrawerOpen(true);
                  }}
                  className="px-2.5 py-1 bg-[#F3EFEA] hover:bg-[#E5DFD7] text-[#1C1917] rounded text-[11px] font-semibold cursor-pointer"
                >
                  View Bag
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dismissToast();
                    setCheckoutModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-[#6D1D3A] hover:bg-[#53142B] text-white rounded text-[11px] font-semibold cursor-pointer"
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
            className="text-[#6B625D] hover:text-[#1C1917] p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Clean Mobile Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5DFD7] flex items-center justify-around py-2 px-2">
        <button
          type="button"
          onClick={() => {
            setFilters((prev) => ({ ...prev, category: 'All' }));
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex flex-col items-center gap-0.5 text-[#6D1D3A] p-1 cursor-pointer"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        <button
          type="button"
          onClick={() => document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex flex-col items-center gap-0.5 text-[#6B625D] hover:text-[#6D1D3A] p-1 cursor-pointer"
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px] font-medium">Catalog</span>
        </button>

        <button
          type="button"
          onClick={() => setTrackingModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[#6B625D] hover:text-[#6D1D3A] p-1 cursor-pointer"
        >
          <Truck className="w-5 h-5" />
          <span className="text-[10px] font-medium">Track</span>
        </button>

        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[#6B625D] hover:text-[#6D1D3A] p-1 relative cursor-pointer"
        >
          <Heart className="w-5 h-5" />
          {wishlist.length > 0 && (
            <span className="absolute -top-0.5 right-0 text-[9px] font-bold font-mono text-[#6D1D3A]">
              {wishlist.length}
            </span>
          )}
          <span className="text-[10px] font-medium">Saved</span>
        </button>

        <button
          type="button"
          onClick={() => setCartDrawerOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[#6B625D] hover:text-[#6D1D3A] p-1 relative cursor-pointer"
        >
          <ShoppingBag className="w-5 h-5" />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#6D1D3A] text-white text-[10px] font-bold rounded-full flex items-center justify-center font-mono tabular-nums">
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
    <StoreProvider>
      <StoreContent />
    </StoreProvider>
  );
}
