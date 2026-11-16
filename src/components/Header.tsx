import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { getProductPriceRange } from '../utils/pricing.ts';
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
  Bell,
  Building2,
  Sparkles,
  Gift,
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
    setWholesaleModalOpen,
    setLastOrderId,
    customerNotifications,
    unreadNotificationCount,
    markCustomerNotificationsRead,
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
    filters,
    setLookbookModalOpen,
    setGiftCardModalOpen,
  } = useStore();

  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isOwnerOrPartner = (user && user.role === 'admin') || Boolean(adminUser);

  const handleLogoClick = () => {
    setActiveView('store');
    selectCategory('All');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const announcement =
    settings?.announcement ||
    'Complimentary Express Shipping Over ₹1,499 · Festive Couture Edit 2026';

  const POPULAR_SEARCHES = [
    'Anarkali Kurti',
    'Cotton Short Kurti',
    'Party Wear Kurti',
    'Silk Kurti Sets',
    'Printed Kurti Under ₹999',
    'Co-ord Set',
    'Straight Cut Kurti',
  ];

  const notifContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
    };
    const handleShortcut = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchDropdownOpen(true);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleShortcut);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleShortcut);
    };
  }, [setSearchDropdownOpen]);

  const liveMatchingProducts = searchQuery.trim()
    ? products
        .filter((p) => {
          const q = searchQuery.toLowerCase().trim();
          return (
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.fabric.toLowerCase().includes(q) ||
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.brand && p.brand.toLowerCase().includes(q)) ||
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EADFD8]">
      {/* Slim Atelier Notice Strip */}
      {!announcementDismissed && (
        <div className="bg-[#191615] text-[#FAF8F4] px-4 h-8 text-[11px] tracking-wide font-medium flex items-center justify-between border-b border-[#2D2624]">
          <div className="w-6 hidden sm:block" />
          <p className="truncate text-center w-full sm:w-auto flex items-center justify-center gap-2">
            <span>{announcement}</span>
          </p>
          <button
            type="button"
            onClick={() => setAnnouncementDismissed(true)}
            aria-label="Dismiss announcement"
            className="text-white/75 hover:text-[#E8C5C8] transition-colors p-1 ml-2 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Three-Zone Architectural Header */}
      <div className="bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Mobile Menu + Single Clean Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#191615] hover:bg-[#F4EDE2] rounded-md transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleLogoClick}
              className="text-left group cursor-pointer shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E5660] rounded"
            >
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-[0.06em] text-[#191615] group-hover:text-[#9E5660] transition-colors uppercase leading-none">
                {settings?.logoText || 'ZOHRA LUXE'}
              </span>
            </button>
          </div>

          {/* Zone 2: Command Search Bar with Instant Suggestions */}
          <div ref={searchContainerRef} className="flex-1 max-w-xl relative">
            <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
              <Search className="w-4 h-4 text-[#665E5B] absolute left-3.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setSearchDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchDropdownOpen(true);
                }}
                placeholder="Search Kurtis, Anarkali, Co-ord Sets..."
                className="w-full bg-[#FAF8F4] focus:bg-white text-xs sm:text-sm text-[#191615] pl-10 pr-20 py-2 rounded-md border border-[#EADFD8] focus:border-[#9E5660] focus:outline-none placeholder:text-[#665E5B] transition-colors"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-[#665E5B] hover:text-[#191615] p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden md:inline-block absolute right-12 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-[#665E5B] bg-white border border-[#EADFD8] rounded pointer-events-none">
                  /
                </kbd>
              )}
              <button
                type="submit"
                aria-label="Submit search"
                className="absolute right-1.5 top-1 bottom-1 px-2.5 text-xs font-semibold text-[#9E5660] hover:bg-[#F9EEF0] rounded transition-colors cursor-pointer"
              >
                Find
              </button>
            </form>

            {/* Live Search Dropdown */}
            {searchDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white text-[#191615] rounded-lg shadow-xl border border-[#EADFD8] py-3 px-4 z-50 space-y-3">
                {searchQuery.trim() && liveMatchingProducts.length > 0 && (
                  <div className="space-y-2 border-b border-[#EADFD8] pb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#665E5B] block">
                      Matching Styles
                    </span>
                    <div className="space-y-1">
                      {liveMatchingProducts.map((p) => {
                        const range = getProductPriceRange(p);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setQuickViewProduct(p);
                              setSearchDropdownOpen(false);
                            }}
                            className="w-full text-left flex items-center gap-3 p-1.5 rounded-md hover:bg-[#FAF8F4] cursor-pointer transition-colors"
                          >
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-12 object-cover rounded border border-[#EADFD8] shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#191615] truncate">{p.name}</p>
                              <p className="text-[11px] text-[#665E5B] tabular-nums">
                                {p.category} ·{' '}
                                <span className="font-mono text-[#9E5660] font-semibold">
                                  {range.hasRange
                                    ? `₹${range.min.toLocaleString()} – ₹${range.max.toLocaleString()}`
                                    : `₹${range.min.toLocaleString()}`}
                                </span>
                              </p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-[#665E5B]" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {recentSearches.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#665E5B]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[#9E5660]" />
                        <span>Recent</span>
                      </span>
                      <button
                        type="button"
                        onClick={clearRecentSearches}
                        className="text-[11px] text-[#9E5660] hover:underline font-medium cursor-pointer"
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
                          className="px-2.5 py-1 bg-[#FAF8F4] hover:bg-[#F9EEF0] hover:text-[#9E5660] border border-[#EADFD8] rounded text-xs text-[#191615] transition-colors cursor-pointer"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-[#665E5B] flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-[#B58A4A]" />
                    <span>Trending Searches</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SEARCHES.map((term, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectSuggestion(term)}
                        className="px-2.5 py-1 bg-[#FAF8F4] hover:bg-[#F9EEF0] hover:text-[#9E5660] border border-[#EADFD8] rounded text-xs text-[#191615] transition-colors cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Zone 3: Single-Line Concise Utility Actions + Bag */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setWholesaleModalOpen(true)}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#B58A4A] hover:text-[#191615] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Wholesale</span>
            </button>

            <button
              type="button"
              onClick={() => setTrackingModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#665E5B] hover:text-[#191615] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Track Order</span>
            </button>

            {/* Notification Bell */}
            {user && (
              <div ref={notifContainerRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setNotifMenuOpen(!notifMenuOpen);
                    setAccountMenuOpen(false);
                  }}
                  className="p-2 text-[#665E5B] hover:text-[#191615] transition-colors relative whitespace-nowrap shrink-0 cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#9E5660] text-white text-[10px] font-mono font-bold flex items-center justify-center tabular-nums">
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                  )}
                </button>

                {notifMenuOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-[#EADFD8] rounded-lg shadow-xl z-50 text-[#191615] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-[#EADFD8] flex items-center justify-between bg-[#FAF8F4]">
                      <span className="text-xs font-semibold">Alerts &amp; Updates</span>
                      {unreadNotificationCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markCustomerNotificationsRead()}
                          className="text-[11px] font-medium text-[#9E5660] hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-[#F4EDE2]">
                      {customerNotifications.length === 0 ? (
                        <p className="px-4 py-6 text-xs text-center text-[#665E5B]">
                          No alerts yet. Order updates will appear here.
                        </p>
                      ) : (
                        customerNotifications.slice(0, 12).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              markCustomerNotificationsRead(n.id);
                              setNotifMenuOpen(false);
                              if (
                                n.linkId &&
                                (n.category === 'order' ||
                                  n.category === 'payment' ||
                                  n.category === 'return')
                              ) {
                                setLastOrderId(n.linkId);
                                setTrackingModalOpen(true);
                              }
                            }}
                            className={`w-full text-left px-4 py-3 hover:bg-[#FAF8F4] transition-colors cursor-pointer ${
                              !n.isRead ? 'bg-[#F9EEF0]/50' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[#191615] truncate">
                                {n.title}
                              </span>
                              {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-[#9E5660] shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-[#665E5B] mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                            <p className="text-[10px] font-mono text-[#665E5B] mt-1">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthModalOpen(true);
              }}
              className="hidden sm:flex items-center gap-1.5 p-2 text-[#9E5660] hover:text-[#84424C] transition-colors relative whitespace-nowrap shrink-0 cursor-pointer"
              aria-label="Wishlist"
            >
              <Heart className="w-4 h-4" />
              {wishlist.length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#9E5660] text-white text-[10px] font-mono font-bold flex items-center justify-center tabular-nums">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Customer Account Menu */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    setAuthMode('login');
                    setAuthModalOpen(true);
                  } else {
                    setAccountMenuOpen(!accountMenuOpen);
                  }
                }}
                className="px-3 py-1.5 bg-[#FAF8F4] hover:bg-[#F4EDE2] border border-[#EADFD8] text-[#191615] rounded-md font-medium text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                aria-label="Customer Account"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#9E5660]" />
                <span className="hidden sm:inline">
                  {user ? user.name.split(' ')[0] : 'Sign In'}
                </span>
                {user && <ChevronDown className="w-3 h-3 hidden sm:inline" />}
              </button>

              {accountMenuOpen && user && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#EADFD8] rounded-lg shadow-xl py-2 z-50 text-[#191615]">
                  <div className="px-4 py-2.5 border-b border-[#EADFD8]">
                    <p className="text-xs font-semibold truncate">{user.name}</p>
                    <p className="text-[11px] text-[#665E5B] truncate font-mono">{user.email}</p>
                  </div>
                  {isOwnerOrPartner && (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setActiveView(activeView === 'store' ? 'admin' : 'store');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-[#9E5660] bg-[#F9EEF0] hover:bg-[#F3DDE1] transition-colors flex items-center gap-1.5 border-b border-[#EADFD8] cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>{activeView === 'admin' ? 'Back to Store' : 'Admin Dashboard'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-[#FAF8F4] transition-colors cursor-pointer"
                  >
                    My Orders &amp; Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setTrackingModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-[#FAF8F4] transition-colors cursor-pointer"
                  >
                    Track Orders
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-[#B91C1C] hover:bg-red-50 transition-colors font-medium cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Admin Portal Access */}
            <button
              type="button"
              onClick={() => setActiveView(activeView === 'admin' ? 'store' : 'admin')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-[#EADFD8] hover:border-[#9E5660] text-xs font-medium text-[#191615] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Store Admin Sign In"
            >
              <Shield className="w-3.5 h-3.5 text-[#9E5660]" />
              <span>Admin</span>
            </button>

            {/* Primary Atelier Bag CTA */}
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#9E5660] hover:bg-[#84424C] text-white rounded-md text-xs font-medium transition-colors shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
              aria-label="Open Shopping Bag"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#F4EDE2]" />
              <span className="hidden sm:inline">Bag</span>
              <span className="font-mono font-semibold tabular-nums">({cartItemCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editorial Category Link Row (Desktop) */}
      <div className="bg-[#FAF8F4] border-t border-[#EADFD8] hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between gap-6 text-xs">
          <nav className="flex items-center gap-6 overflow-x-auto no-scrollbar font-medium text-[#665E5B]">
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
            ].map((cat) => {
              const active = filters.category.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    selectCategory(cat);
                    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`relative py-2.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'text-[#9E5660] font-semibold after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[2px] after:bg-[#9E5660]'
                      : 'hover:text-[#191615]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 text-[11px] shrink-0 text-[#665E5B]">
            <button
              type="button"
              onClick={() => setLookbookModalOpen(true)}
              className="text-[#9E5660] hover:text-[#84424C] font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer transition-colors"
            >
              <Sparkles className="w-3 h-3 text-[#B58A4A]" />
              <span>Lookbooks</span>
            </button>
            <span className="text-[#EADFD8]">|</span>
            <button
              type="button"
              onClick={() => setGiftCardModalOpen(true)}
              className="text-[#191615] hover:text-[#9E5660] font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer transition-colors"
            >
              <Gift className="w-3 h-3 text-[#9E5660]" />
              <span>Gift Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
          <div className="bg-white w-4/5 max-w-xs h-full p-5 overflow-y-auto space-y-5 text-[#191615]">
            <div className="flex items-center justify-between border-b border-[#EADFD8] pb-3">
              <span className="font-serif font-semibold text-xl tracking-wide text-[#191615]">
                ZOHRA LUXE
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="cursor-pointer p-1"
              >
                <X className="w-5 h-5 text-[#665E5B]" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  selectCategory('All');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left py-2 px-3 rounded hover:bg-[#FAF8F4] font-semibold text-[#9E5660]"
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
                  type="button"
                  onClick={() => {
                    selectCategory(c);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left py-2 px-3 rounded hover:bg-[#FAF8F4] text-[#191615]"
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-[#EADFD8] space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLookbookModalOpen(true);
                }}
                className="w-full py-2.5 px-3 bg-[#F9EEF0] text-[#9E5660] border border-[#EADFD8] rounded font-medium text-xs text-left flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Lookbook &amp; Outfit Builder</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setGiftCardModalOpen(true);
                }}
                className="w-full py-2.5 px-3 bg-[#FAF8F4] text-[#191615] border border-[#EADFD8] rounded font-medium text-xs text-left flex items-center gap-2 cursor-pointer"
              >
                <Gift className="w-4 h-4 text-[#9E5660]" />
                <span>Digital Gift Cards</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setWholesaleModalOpen(true);
                }}
                className="w-full py-2.5 px-3 bg-[#FAF8F4] text-[#191615] border border-[#EADFD8] rounded font-medium text-xs text-left flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-[#B58A4A]" />
                <span>Wholesale Portal</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setTrackingModalOpen(true);
                }}
                className="w-full py-2.5 px-3 bg-[#FAF8F4] text-[#191615] border border-[#EADFD8] rounded font-medium text-xs text-left flex items-center gap-2 cursor-pointer"
              >
                <Truck className="w-4 h-4 text-[#9E5660]" />
                <span>Track Order</span>
              </button>
              <a
                href="tel:9310078735"
                className="w-full py-2.5 px-3 bg-[#F4EDE2] text-[#191615] rounded font-medium text-xs flex items-center gap-2 font-mono"
              >
                <Phone className="w-4 h-4 text-[#9E5660]" />
                <span>+91 9310078735</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setActiveView('admin');
                }}
                className="w-full py-2.5 px-3 bg-[#191615] text-white rounded font-medium text-xs text-left flex items-center gap-2 cursor-pointer"
              >
                <Shield className="w-4 h-4 text-[#E8C5C8]" />
                <span>Admin Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

