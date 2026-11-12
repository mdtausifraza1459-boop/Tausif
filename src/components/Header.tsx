import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import {
  Search,
  ShoppingBag,
  Heart,
  User as UserIcon,
  Shield,
  X,
  Menu,
  Clock,
  TrendingUp,
  ArrowRight,
  ChevronDown,
  Truck,
  Phone,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    settings,
    cartItemCount,
    setCartDrawerOpen,
    wishlist,
    user,
    adminUser,
    setAuthModalOpen,
    setAuthMode,
    logout,
    activeView,
    setActiveView,
    setTrackingModalOpen,
    searchQuery,
    setSearchQuery,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    searchDropdownOpen,
    setSearchDropdownOpen,
    selectCategory,
    products,
    setQuickViewProduct,
  } = useStore();

  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const lastLogoClickRef = useRef(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const isOwnerOrPartner = (user && user.role === 'admin') || Boolean(adminUser);

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastLogoClickRef.current < 700) {
      const clicks = logoClicks + 1;
      setLogoClicks(clicks);
      if (clicks >= 5) {
        setLogoClicks(0);
        setActiveView(activeView === 'store' ? 'admin' : 'store');
        return;
      }
    } else {
      setLogoClicks(1);
    }
    lastLogoClickRef.current = now;

    setActiveView('store');
    selectCategory('All');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const announcement =
    settings?.announcement ||
    'Wholesale Bulk Orders: Call or WhatsApp +91 9310078735 · Free Express Delivery Over ₹1,499';

  const POPULAR_SEARCHES = [
    'Anarkali Kurti',
    'Cotton Short Kurti',
    'Party Wear Kurti',
    'Silk Kurti Sets',
    'Printed Kurti Under ₹999',
    'Lavender Co-ord Set',
    'Straight Cut Kurti',
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setSearchDropdownOpen]);

  const liveMatchingProducts = searchQuery.trim()
    ? products
        .filter((p) => {
          const q = searchQuery.toLowerCase().trim();
          return (
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.fabric.toLowerCase().includes(q) ||
            p.colors?.some((c) => c.name.toLowerCase().includes(q))
          );
        })
        .slice(0, 4)
    : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      addRecentSearch(searchQuery.trim());
      setSearchDropdownOpen(false);
      document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectSuggestion = (term: string) => {
    setSearchQuery(term);
    addRecentSearch(term);
    setSearchDropdownOpen(false);
    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5DFD7]">
      {/* Top Announcement Strip */}
      {!announcementDismissed && (
        <div className="bg-[#4B1328] text-[#FAF8F5] px-4 h-9 text-xs tracking-wide font-medium flex items-center justify-between">
          <div className="w-6 hidden sm:block" />
          <p className="truncate text-center w-full sm:w-auto flex items-center justify-center gap-2">
            <span className="text-[#FDE68A] font-semibold">Online Boutique</span>
            <span className="text-white/40">·</span>
            <span>{announcement}</span>
          </p>
          <button
            onClick={() => setAnnouncementDismissed(true)}
            aria-label="Dismiss announcement"
            className="text-white/70 hover:text-white transition-colors p-1 ml-2 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header Navigation Bar */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-3 lg:gap-6">
          {/* Brand Logo & Mobile Hamburger */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-[#1C1917] hover:bg-[#F3EFEA] rounded-md transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button onClick={handleLogoClick} className="text-left group cursor-pointer shrink-0">
              <div className="flex flex-col">
                <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#6D1D3A] group-hover:text-[#53142B] transition-colors leading-none">
                  {settings?.logoText || 'ZOHRA LUXE'}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#6B625D] mt-1">
                  Women's Ethnic Couture
                </span>
              </div>
            </button>
          </div>

          {/* Live Search Bar */}
          <div ref={searchContainerRef} className="flex-1 max-w-xl relative">
            <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
              <Search className="w-4 h-4 text-[#6B625D] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchDropdownOpen(true);
                }}
                placeholder="Search Kurtis, Short Kurtis, Anarkali, Co-ord Sets..."
                className="w-full bg-[#F3EFEA] focus:bg-white text-xs sm:text-sm text-[#1C1917] pl-10 pr-16 py-2.5 rounded-md border border-transparent focus:border-[#6D1D3A] focus:outline-none placeholder:text-[#6B625D] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-[#6B625D] hover:text-[#1C1917] p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                aria-label="Submit search"
                className="absolute right-1.5 top-1 bottom-1 px-2.5 text-xs font-semibold text-[#6D1D3A] hover:bg-[#E5DFD7]/50 rounded transition-colors cursor-pointer"
              >
                Go
              </button>
            </form>

            {/* Live Search Dropdown */}
            {searchDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white text-[#1C1917] rounded-lg shadow-xl border border-[#E5DFD7] py-3 px-4 z-50 space-y-3">
                {searchQuery.trim() && liveMatchingProducts.length > 0 && (
                  <div className="space-y-2 border-b border-[#E5DFD7] pb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B625D] block">
                      Matching Garments
                    </span>
                    <div className="space-y-1">
                      {liveMatchingProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setQuickViewProduct(p);
                            setSearchDropdownOpen(false);
                          }}
                          className="flex items-center gap-3 p-1.5 rounded-md hover:bg-[#FAF8F5] cursor-pointer transition-colors"
                        >
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-9 h-12 object-cover rounded border border-[#E5DFD7]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#1C1917] truncate">{p.name}</p>
                            <p className="text-[11px] text-[#6B625D] tabular-nums">
                              {p.category} · <span className="text-[#6D1D3A] font-bold">₹{p.discountedPrice.toLocaleString()}</span>
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#6B625D]" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recentSearches.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#6B625D]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[#6D1D3A]" />
                        <span>Recent Searches</span>
                      </span>
                      <button
                        type="button"
                        onClick={clearRecentSearches}
                        className="text-[11px] text-[#6D1D3A] hover:underline font-medium cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentSearches.map((term, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectSuggestion(term)}
                          className="px-2.5 py-1 bg-[#F3EFEA] hover:bg-[#FBF2F5] hover:text-[#6D1D3A] rounded text-xs text-[#1C1917] transition-colors cursor-pointer"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-[#6B625D] flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-[#B4436C]" />
                    <span>Popular Styles</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SEARCHES.map((term, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectSuggestion(term)}
                        className="px-2.5 py-1 bg-[#F3EFEA] hover:bg-[#FBF2F5] hover:text-[#6D1D3A] rounded text-xs text-[#1C1917] transition-colors cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Utility Actions (Single Line, Clean Spacing) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setTrackingModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#1C1917] hover:text-[#6D1D3A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Track Order</span>
            </button>

            <button
              onClick={() => {
                setAuthMode('login');
                setAuthModalOpen(true);
              }}
              className="hidden sm:flex items-center gap-1.5 p-2 text-[#1C1917] hover:text-[#6D1D3A] transition-colors relative whitespace-nowrap shrink-0 cursor-pointer"
              aria-label="Wishlist"
            >
              <Heart className="w-4.5 h-4.5" />
              {wishlist.length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#6D1D3A] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Customer Account Menu */}
            <div className="relative shrink-0">
              <button
                onClick={() => {
                  if (!user) {
                    setAuthMode('login');
                    setAuthModalOpen(true);
                  } else {
                    setAccountMenuOpen(!accountMenuOpen);
                  }
                }}
                className="px-3 py-1.5 bg-[#F3EFEA] hover:bg-[#E5DFD7] text-[#1C1917] rounded-md font-semibold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                aria-label="Customer Account"
              >
                <UserIcon className="w-4 h-4 text-[#6D1D3A]" />
                <span className="hidden sm:inline">
                  {user ? user.name.split(' ')[0] : 'Sign In'}
                </span>
                {user && <ChevronDown className="w-3 h-3 hidden sm:inline" />}
              </button>

              {accountMenuOpen && user && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-[#E5DFD7] rounded-lg shadow-xl py-2 z-50 text-[#1C1917]">
                  <div className="px-4 py-2 border-b border-[#E5DFD7]">
                    <p className="text-xs font-bold truncate">{user.name}</p>
                    <p className="text-[11px] text-[#6B625D] truncate font-mono">{user.email}</p>
                  </div>
                  {isOwnerOrPartner && (
                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setActiveView(activeView === 'store' ? 'admin' : 'store');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-[#6D1D3A] bg-[#FBF2F5] hover:bg-[#F3E1E8] transition-colors flex items-center gap-1.5 border-b border-[#E5DFD7] cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>{activeView === 'admin' ? 'Back to Store' : 'Admin Dashboard'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                  >
                    My Orders & Account
                  </button>
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setTrackingModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                  >
                    Track Live Orders
                  </button>
                  <button
                    onClick={() => {
                      setAccountMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-[#B91C1C] hover:bg-red-50 transition-colors font-semibold cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Admin Portal Button */}
            <button
              onClick={() => setActiveView(activeView === 'admin' ? 'store' : 'admin')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-[#E5DFD7] hover:border-[#6D1D3A] text-xs font-semibold text-[#1C1917] hover:text-[#6D1D3A] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Store Owner & Partner Admin Sign In"
            >
              <Shield className="w-3.5 h-3.5 text-[#6D1D3A]" />
              <span>Admin</span>
            </button>

            {/* Primary Bag CTA */}
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#6D1D3A] hover:bg-[#53142B] text-white rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              aria-label="Open Shopping Bag"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Bag</span>
              <span className="font-mono font-bold tabular-nums">({cartItemCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Category & Wholesale Strip (Desktop) */}
      <div className="bg-[#FAF8F5] border-t border-[#E5DFD7] hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-5 overflow-x-auto no-scrollbar font-medium text-[#1C1917]">
            {[
              "Women's Kurtis",
              'Short Kurtis',
              'Long Kurtis',
              'Anarkali Kurtis',
              'Cotton Kurtis',
              'Party Wear Kurtis',
              'Co-ord Sets',
              'Festive Wear',
              'Dupattas',
            ].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  selectCategory(cat);
                  document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-[#6D1D3A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[11px] shrink-0 text-[#6B625D]">
            <a
              href="tel:9310078735"
              className="text-[#6D1D3A] hover:underline font-semibold flex items-center gap-1 whitespace-nowrap"
            >
              <Phone className="w-3 h-3" />
              <span>Wholesale: +91 9310078735</span>
            </a>
            <span className="hidden xl:inline text-[#E5DFD7]">|</span>
            <span className="hidden xl:inline text-[#166534] font-semibold whitespace-nowrap">
              Free Express Shipping Above ₹1,499
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
          <div className="bg-white w-4/5 max-w-xs h-full p-5 overflow-y-auto space-y-5 text-[#1C1917]">
            <div className="flex items-center justify-between border-b border-[#E5DFD7] pb-3">
              <span className="font-serif font-bold text-lg text-[#6D1D3A]">ZOHRA LUXE</span>
              <button onClick={() => setMobileMenuOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5 text-[#6B625D]" />
              </button>
            </div>

            <div className="p-3 bg-[#FAF8F5] border border-[#E5DFD7] rounded-md text-xs space-y-1.5">
              <p className="font-bold text-[#6D1D3A]">Wholesale & Bulk Inquiries</p>
              <p className="text-[11px] text-[#6B625D]">Special boutique & shop owner pricing:</p>
              <a
                href="tel:9310078735"
                className="w-full py-2 px-3 bg-[#6D1D3A] text-white font-semibold rounded text-xs flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call +91 9310078735</span>
              </a>
            </div>

            <div className="space-y-1 text-xs">
              <button
                onClick={() => {
                  selectCategory('All');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 px-3 rounded hover:bg-[#FAF8F5] font-bold text-[#6D1D3A]"
              >
                All Collections
              </button>
              {[
                "Women's Kurtis",
                'Short Kurtis',
                'Anarkali Kurtis',
                'Cotton Kurtis',
                'Co-ord Sets',
                'Festive Wear',
                'Dupattas',
              ].map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    selectCategory(c);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-2 px-3 rounded hover:bg-[#FAF8F5] text-[#1C1917]"
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-[#E5DFD7] space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setTrackingModalOpen(true);
                }}
                className="w-full py-2.5 px-3 bg-[#FAF8F5] text-[#1C1917] border border-[#E5DFD7] rounded font-semibold text-xs text-left flex items-center gap-2 cursor-pointer"
              >
                <Truck className="w-4 h-4 text-[#6D1D3A]" />
                <span>Track Order</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setActiveView('admin');
                }}
                className="w-full py-2.5 px-3 bg-[#6D1D3A] text-white rounded font-semibold text-xs text-left flex items-center gap-2 cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                <span>Admin & Partner Sign In</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
