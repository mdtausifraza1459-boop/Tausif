import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Product,
  Category,
  CartItem,
  User,
  WebsiteSettings,
  FilterState,
  AdminPermission,
  AdminRolePreset,
  NotificationItem,
  LookbookCollection,
  FlashSaleRule,
  BundleOffer,
  VipTierConfig,
  Order,
} from '../types.ts';

export interface ToastNotice {
  id: number;
  title: string;
  subtitle?: string;
  image?: string;
  type?: 'success' | 'info' | 'error';
  showBagActions?: boolean;
}

export interface IntegrationsStatus {
  googleOAuthConfigured: boolean;
  googleClientId?: string;
  razorpayConfigured: boolean;
  razorpayKeyId?: string;
  razorpayWebhookConfigured?: boolean;
  shiprocketConfigured: boolean;
  smtpConfigured: boolean;
  whatsappConfigured?: boolean;
  geminiConfigured: boolean;
}

export type InfoPageType = 'about' | 'contact' | 'shipping' | 'returns' | 'privacy' | 'terms' | 'faq' | null;

export interface AdminUserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  adminRole?: AdminRolePreset;
  isSuperAdmin?: boolean;
  permissions: AdminPermission[];
}

export function getProductVariantStock(product: Product, size: string, color: string): number {
  if (product.variantStock && Object.keys(product.variantStock).length > 0) {
    const exactKey = `${size}::${color}`;
    if (typeof product.variantStock[exactKey] === 'number') {
      return Math.max(0, product.variantStock[exactKey]);
    }
    const matchingKey = Object.keys(product.variantStock).find(
      (k) => k.toLowerCase() === exactKey.toLowerCase()
    );
    if (matchingKey) return Math.max(0, product.variantStock[matchingKey]);
    const sizeSum = Object.entries(product.variantStock)
      .filter(([k]) => k.toLowerCase().startsWith(`${size.toLowerCase()}::`))
      .reduce((s, [, qty]) => s + Math.max(0, qty), 0);
    if (sizeSum > 0) return sizeSum;
  }
  return Math.max(0, product.stockQuantity || 0);
}

interface StoreContextType {
  products: Product[];
  categories: Category[];
  settings: WebsiteSettings | null;
  integrations: IntegrationsStatus | null;
  loading: boolean;
  cart: CartItem[];
  wishlist: string[];
  compareList: Product[];
  recentlyViewed: string[];
  user: User | null;
  adminUser: AdminUserSession | null;
  token: string | null;
  adminToken: string | null;
  customerNotifications: NotificationItem[];
  unreadNotificationCount: number;

  // UI states
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  checkoutModalOpen: boolean;
  setCheckoutModalOpen: (open: boolean) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  trackingModalOpen: boolean;
  setTrackingModalOpen: (open: boolean) => void;
  activeView: 'store' | 'admin';
  setActiveView: (view: 'store' | 'admin') => void;
  sizeGuideModalOpen: boolean;
  setSizeGuideModalOpen: (open: boolean) => void;
  compareModalOpen: boolean;
  setCompareModalOpen: (open: boolean) => void;
  wholesaleModalOpen: boolean;
  setWholesaleModalOpen: (open: boolean) => void;
  infoPageModal: InfoPageType;
  setInfoPageModal: (page: InfoPageType) => void;
  lookbookModalOpen: boolean;
  setLookbookModalOpen: (open: boolean) => void;
  giftCardModalOpen: boolean;
  setGiftCardModalOpen: (open: boolean) => void;
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  lastOrderId: string | null;
  setLastOrderId: (id: string | null) => void;

  // Growth & VIP feeds
  lookbooks: (LookbookCollection & { products?: Product[] })[];
  flashSales: FlashSaleRule[];
  bundles: BundleOffer[];
  vipTiers: VipTierConfig[];
  vipStatus: any | null;
  getEffectivePrice: (product: Product) => number;
  refreshGrowthFeeds: () => Promise<void>;

  // Toast notifications
  toast: ToastNotice | null;
  showToast: (notice: Omit<ToastNotice, 'id'>) => void;
  dismissToast: () => void;

  // Search & History
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  searchDropdownOpen: boolean;
  setSearchDropdownOpen: (open: boolean) => void;

  // Filter & Search
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  selectCategory: (categoryName: string) => void;

  // Compare & Recently Viewed
  toggleCompare: (product: Product) => void;
  isInCompare: (productId: string) => boolean;
  clearCompare: () => void;
  addRecentlyViewed: (productId: string) => void;

  // Cart operations
  addToCart: (product: Product, size: string, color: string, quantity?: number, openDrawer?: boolean) => void;
  buyNow: (product: Product, size: string, color: string, quantity?: number) => void;
  reorderFromOrder: (order: Order) => void;
  removeFromCart: (productId: string, size: string, color: string) => void;
  updateCartQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  appliedCoupon: { code: string; discountAmount: number; description: string } | null;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  cartSubtotal: number;
  cartDiscount: number;
  cartShipping: number;
  cartTotal: number;
  cartItemCount: number;

  // Wishlist & Notifications
  toggleWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  refreshCustomerNotifications: () => Promise<void>;
  markCustomerNotificationsRead: (id?: string) => Promise<void>;

  // Customer Authentication
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string,
    referralCodeUsed?: string,
    birthdayMonth?: number,
    birthdayConsent?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  refreshUserProfile: () => Promise<void>;
  logout: () => void;

  // Secure Admin Auth (Primary Owner, Partners & Restricted Staff)
  hasAdminPermission: (...perms: AdminPermission[]) => boolean;
  adminPasswordLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  adminGoogleLogin: (payload: { idToken?: string; credential?: string; accessToken?: string }) => Promise<{ success: boolean; error?: string }>;
  bootstrapOwnerPassword: (email: string, bootstrapCode: string, newPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  requestAdminPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  confirmAdminPasswordReset: (email: string, token: string, newPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  updateSuperAdminEmail: (newEmail: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  adminLogout: () => Promise<void>;

  // Data Refresh
  refreshProducts: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const initialFilters: FilterState = {
  category: 'All',
  brands: [],
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
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationsStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('zohra_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zohra_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [compareIds, setCompareIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zohra_compare');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zohra_recently_viewed');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zohra_recent_searches');
      return saved ? JSON.parse(saved) : ['Anarkali Kurti', 'Cotton Kurti', 'Short Kurti'];
    } catch {
      return ['Anarkali Kurti', 'Cotton Kurti', 'Short Kurti'];
    }
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('zohra_token'));
  const [user, setUser] = useState<User | null>(null);
  const [customerNotifications, setCustomerNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('zohra_admin_token'));
  const [adminUser, setAdminUser] = useState<AdminUserSession | null>(() => {
    try {
      const saved = localStorage.getItem('zohra_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [quickViewProduct, setQuickViewProductState] = useState<Product | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [sizeGuideModalOpen, setSizeGuideModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [wholesaleModalOpen, setWholesaleModalOpen] = useState(false);
  const [infoPageModal, setInfoPageModal] = useState<InfoPageType>(null);
  const [lookbookModalOpen, setLookbookModalOpen] = useState(false);
  const [giftCardModalOpen, setGiftCardModalOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [activeView, setActiveView] = useState<'store' | 'admin'>('store');
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const [lookbooks, setLookbooks] = useState<(LookbookCollection & { products?: Product[] })[]>([]);
  const [flashSales, setFlashSales] = useState<FlashSaleRule[]>([]);
  const [bundles, setBundles] = useState<BundleOffer[]>([]);
  const [vipTiers, setVipTiers] = useState<VipTierConfig[]>([]);
  const [vipStatus, setVipStatus] = useState<any | null>(null);

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    description: string;
  } | null>(null);

  const dismissToast = useCallback(() => setToast(null), []);

  const showToast = useCallback((notice: Omit<ToastNotice, 'id'>) => {
    const id = Date.now();
    setToast({ ...notice, id });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4500);
  }, []);

  useEffect(() => {
    localStorage.setItem('zohra_cart', JSON.stringify(cart));
    if (token && user?.abandonedCartConsent) {
      fetch('/api/user/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.product.id,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
          })),
        }),
      }).catch(() => {});
    }
  }, [cart, token, user?.abandonedCartConsent]);

  useEffect(() => {
    localStorage.setItem('zohra_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('zohra_compare', JSON.stringify(compareIds));
  }, [compareIds]);

  useEffect(() => {
    localStorage.setItem('zohra_recently_viewed', JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  useEffect(() => {
    localStorage.setItem('zohra_recent_searches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  const addRecentlyViewed = useCallback(
    (productId: string) => {
      setRecentlyViewed((prev) => [productId, ...prev.filter((id) => id !== productId)].slice(0, 10));
      if (token) {
        fetch('/api/user/recently-viewed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productId }),
        }).catch(() => {});
      }
    },
    [token]
  );

  const setQuickViewProduct = useCallback(
    (product: Product | null) => {
      setQuickViewProductState(product);
      if (product) addRecentlyViewed(product.id);
    },
    [addRecentlyViewed]
  );

  const compareList = products.filter((p) => compareIds.includes(p.id));

  const isInCompare = useCallback((productId: string) => compareIds.includes(productId), [compareIds]);

  const toggleCompare = useCallback(
    (product: Product) => {
      setCompareIds((prev) => {
        if (prev.includes(product.id)) {
          showToast({ title: 'Removed from Comparison', subtitle: product.name, type: 'info' });
          return prev.filter((id) => id !== product.id);
        }
        if (prev.length >= 4) {
          showToast({
            title: 'Comparison Limit Reached',
            subtitle: 'You can compare up to 4 styles at once.',
            type: 'error',
          });
          return prev;
        }
        showToast({ title: 'Added to Compare', subtitle: product.name, image: product.images[0], type: 'success' });
        return [...prev, product.id];
      });
    },
    [showToast]
  );

  const clearCompare = useCallback(() => setCompareIds([]), []);

  const addRecentSearch = (query: string) => {
    const q = query.trim();
    if (!q) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== q.toLowerCase());
      return [q, ...filtered].slice(0, 8);
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('zohra_recent_searches');
  };

  const refreshProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  const refreshCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const refreshSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const refreshIntegrations = async () => {
    try {
      const res = await fetch('/api/integrations/status');
      if (res.ok) {
        setIntegrations(await res.json());
      }
    } catch {
      // ignore
    }
  };

  const refreshCustomerNotifications = useCallback(async () => {
    if (!token) {
      setCustomerNotifications([]);
      setUnreadNotificationCount(0);
      return;
    }
    try {
      const res = await fetch('/api/user/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomerNotifications(data.notifications || []);
        setUnreadNotificationCount(data.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  }, [token]);

  const markCustomerNotificationsRead = async (id?: string) => {
    if (!token) return;
    try {
      await fetch('/api/user/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      await refreshCustomerNotifications();
    } catch {
      // ignore
    }
  };

  const refreshGrowthFeeds = useCallback(async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const [lbRes, fsRes, bndRes, vtRes] = await Promise.all([
        fetch('/api/lookbooks'),
        fetch('/api/flash-sales/active', { headers }),
        fetch('/api/bundles'),
        fetch('/api/vip-tiers'),
      ]);
      if (lbRes.ok) {
        const d = await lbRes.json();
        setLookbooks(d.lookbooks || []);
      }
      if (fsRes.ok) {
        const d = await fsRes.json();
        setFlashSales(d.flashSales || []);
      }
      if (bndRes.ok) {
        const d = await bndRes.json();
        setBundles(d.bundles || []);
      }
      if (vtRes.ok) {
        const d = await vtRes.json();
        setVipTiers(d.vipTiers || []);
      }
      if (token) {
        const vipRes = await fetch('/api/user/vip-status', { headers: { Authorization: `Bearer ${token}` } });
        if (vipRes.ok) setVipStatus(await vipRes.json());
      } else {
        setVipStatus(null);
      }
    } catch {
      // ignore offline transient
    }
  }, [token]);

  const refreshUserProfile = useCallback(async () => {
    if (!token) {
      setUser(null);
      setVipStatus(null);
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          setUser(data.user);
          if (Array.isArray(data.user.wishlist)) setWishlist(data.user.wishlist);
          if (Array.isArray(data.user.recentlyViewedIds) && data.user.recentlyViewedIds.length > 0) {
            setRecentlyViewed((prev) => {
              const merged = [...data.user.recentlyViewedIds, ...prev.filter((id) => !data.user.recentlyViewedIds.includes(id))];
              return merged.slice(0, 10);
            });
          }
          refreshCustomerNotifications();
          refreshGrowthFeeds();
        }
      } else {
        localStorage.removeItem('zohra_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      // keep state on transient offline
    }
  }, [token, refreshCustomerNotifications, refreshGrowthFeeds]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([refreshProducts(), refreshCategories(), refreshSettings(), refreshIntegrations(), refreshGrowthFeeds()]);
      setLoading(false);
    };
    init();
  }, [refreshGrowthFeeds]);

  useEffect(() => {
    refreshUserProfile();
  }, [refreshUserProfile]);

  // Verify stored admin session against /api/admin/me on startup / token changes
  useEffect(() => {
    if (!adminToken) {
      setAdminUser(null);
      return;
    }
    fetch('/api/admin/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.admin) {
          setAdminUser(data.admin);
          localStorage.setItem('zohra_admin_user', JSON.stringify(data.admin));
        } else {
          localStorage.removeItem('zohra_admin_token');
          localStorage.removeItem('zohra_admin_user');
          setAdminToken(null);
          setAdminUser(null);
        }
      })
      .catch(() => {});
  }, [adminToken]);

  const resetFilters = () => {
    setFilters(initialFilters);
    setSearchQuery('');
  };

  const selectCategory = (categoryName: string) => {
    setFilters((prev) => ({
      ...prev,
      category: categoryName,
    }));
  };

  const addToCart = (product: Product, size: string, color: string, quantity = 1, openDrawer = false) => {
    const maxAvail = getProductVariantStock(product, size, color);
    if (maxAvail <= 0 || product.stockQuantity <= 0) {
      showToast({
        title: 'Variant Out of Stock',
        subtitle: `Size ${size} · ${color} is currently sold out.`,
        type: 'error',
      });
      return;
    }

    let capped = false;
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.size === size && item.color === color
      );
      if (existingIndex > -1) {
        const nextQty = prev[existingIndex].quantity + quantity;
        if (nextQty > maxAvail) {
          capped = true;
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], quantity: maxAvail };
          return updated;
        }
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: nextQty };
        return updated;
      }
      const addQty = Math.min(quantity, maxAvail);
      if (quantity > maxAvail) capped = true;
      return [...prev, { product, size, color, quantity: addQty }];
    });

    if (capped) {
      showToast({
        title: 'Stock Limit Applied',
        subtitle: `Only ${maxAvail} piece(s) available for Size ${size} · ${color}.`,
        type: 'info',
        showBagActions: true,
      });
    } else if (openDrawer) {
      setCartDrawerOpen(true);
    } else {
      showToast({
        title: `Added ${product.name}`,
        subtitle: `Size ${size} · ${color} · Qty ${quantity}`,
        image: product.images[0],
        type: 'success',
        showBagActions: true,
      });
    }
  };

  const buyNow = (product: Product, size: string, color: string, quantity = 1) => {
    const maxAvail = getProductVariantStock(product, size, color);
    if (maxAvail <= 0 || product.stockQuantity <= 0) {
      showToast({
        title: 'Variant Out of Stock',
        subtitle: `Size ${size} · ${color} is currently unavailable.`,
        type: 'error',
      });
      return;
    }
    addToCart(product, size, color, Math.min(quantity, maxAvail), false);
    setCartDrawerOpen(false);
    setQuickViewProduct(null);
    setCheckoutModalOpen(true);
  };

  const removeFromCart = (productId: string, size: string, color: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.product.id === productId && item.size === size && item.color === color))
    );
  };

  const updateCartQuantity = (productId: string, size: string, color: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId && item.size === size && item.color === color) {
          const maxAvail = getProductVariantStock(item.product, size, color);
          const safeQty = maxAvail > 0 ? Math.min(quantity, maxAvail) : quantity;
          return { ...item, quantity: safeQty };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const getEffectivePrice = useCallback((product: Product) => {
    if (product.flashSalePrice && product.flashSalePrice > 0 && product.flashSalePrice < product.discountedPrice) {
      return product.flashSalePrice;
    }
    return product.discountedPrice;
  }, []);

  const reorderFromOrder = (order: Order) => {
    let addedCount = 0;
    let skippedCount = 0;
    for (const item of order.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) {
        skippedCount++;
        continue;
      }
      const avail = getProductVariantStock(prod, item.size, item.color);
      if (avail <= 0) {
        skippedCount++;
        continue;
      }
      addToCart(prod, item.size, item.color, Math.min(item.quantity, avail), false);
      addedCount++;
    }
    if (addedCount > 0) {
      setTrackingModalOpen(false);
      setAuthModalOpen(false);
      setCartDrawerOpen(true);
      showToast({
        title: `Added ${addedCount} item(s) to bag`,
        subtitle: skippedCount > 0 ? `${skippedCount} item(s) currently out of stock.` : `Reordered from ${order.id}`,
        type: 'success',
      });
    } else {
      showToast({
        title: 'Items Unavailable',
        subtitle: 'None of the items from this order are currently in stock.',
        type: 'error',
      });
    }
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + getEffectivePrice(item.product) * item.quantity, 0);
  const freeThreshold = settings?.freeShippingThreshold || 1499;
  const standardFee = settings?.standardShippingFee || 99;
  const cartShipping = cart.length === 0 ? 0 : vipStatus?.tier?.freeShippingAlways || cartSubtotal >= freeThreshold ? 0 : standardFee;
  const cartDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const cartTotal = Math.max(0, cartSubtotal - cartDiscount + cartShipping);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const applyCoupon = async (code: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code,
          cartTotal: cartSubtotal,
          customerEmail: user?.email,
          items: cart.map((i) => ({
            productId: i.product.id,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon({
          code: data.code,
          discountAmount: data.discountAmount,
          description: data.description,
        });
        return { success: true, message: `Coupon ${data.code} applied! Saved ₹${data.discountAmount}` };
      }
      return { success: false, message: data.error || 'Failed to apply coupon' };
    } catch {
      return { success: false, message: 'Server communication error while applying coupon.' };
    }
  };

  const removeCoupon = () => setAppliedCoupon(null);
  const isInWishlist = (productId: string) => wishlist.includes(productId);

  const toggleWishlist = async (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
      showToast({
        title: exists ? 'Removed from Wishlist' : 'Saved to Wishlist',
        type: 'info',
      });
      return next;
    });

    if (token) {
      try {
        await fetch('/api/user/wishlist/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId }),
        });
      } catch (err) {
        console.error('Failed to sync wishlist with server', err);
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('zohra_token', data.token);
        setToken(data.token);
        setUser(data.user);
        if (data.user.wishlist) setWishlist(data.user.wishlist);
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Invalid credentials' };
    } catch {
      return { success: false, error: 'Network error during login' };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone?: string,
    referralCodeUsed?: string,
    birthdayMonth?: number,
    birthdayConsent?: boolean
  ) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, referralCodeUsed, birthdayMonth, birthdayConsent }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('zohra_token', data.token);
        setToken(data.token);
        setUser(data.user);
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch {
      return { success: false, error: 'Network error during registration' };
    }
  };

  const logout = () => {
    localStorage.removeItem('zohra_token');
    setToken(null);
    setUser(null);
    setCustomerNotifications([]);
    setUnreadNotificationCount(0);
  };

  const hasAdminPermission = useCallback(
    (...perms: AdminPermission[]) => {
      if (!adminUser) return false;
      if (adminUser.isSuperAdmin || adminUser.adminRole === 'primary_owner') return true;
      const list = adminUser.permissions || [];
      return perms.some((p) => list.includes(p));
    },
    [adminUser]
  );

  const adminPasswordLogin = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('zohra_admin_token', data.token);
        localStorage.setItem('zohra_admin_user', JSON.stringify(data.admin));
        setAdminToken(data.token);
        setAdminUser(data.admin);
        return { success: true };
      }
      return { success: false, error: data.error || 'Admin authentication failed' };
    } catch {
      return { success: false, error: 'Connection failure during admin authentication.' };
    }
  };

  const adminGoogleLogin = async (payload: { idToken?: string; credential?: string; accessToken?: string }) => {
    try {
      const res = await fetch('/api/admin/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('zohra_admin_token', data.token);
        localStorage.setItem('zohra_admin_user', JSON.stringify(data.admin));
        setAdminToken(data.token);
        setAdminUser(data.admin);
        return { success: true };
      }
      return { success: false, error: data.error || 'Google OAuth authorization rejected' };
    } catch {
      return { success: false, error: 'Connection failure during Google authentication.' };
    }
  };

  const bootstrapOwnerPassword = async (email: string, bootstrapCode: string, newPassword: string) => {
    try {
      const res = await fetch('/api/admin/bootstrap-owner-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, bootstrapCode, newPassword }),
      });
      const data = await res.json();
      if (res.ok) return { success: true, message: data.message };
      return { success: false, error: data.error || 'Failed to initialize owner password.' };
    } catch {
      return { success: false, error: 'Network error during owner setup.' };
    }
  };

  const requestAdminPasswordReset = async (email: string) => {
    try {
      const res = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) return { success: true, message: data.message };
      return { success: false, error: data.error || 'Request failed.' };
    } catch {
      return { success: false, error: 'Network error.' };
    }
  };

  const confirmAdminPasswordReset = async (email: string, resetToken: string, newPassword: string) => {
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token: resetToken, newPassword }),
      });
      const data = await res.json();
      if (res.ok) return { success: true, message: data.message };
      return { success: false, error: data.error || 'Reset failed.' };
    } catch {
      return { success: false, error: 'Network error.' };
    }
  };

  const updateSuperAdminEmail = async (newEmail: string) => {
    try {
      const res = await fetch('/api/admin/config/super-admin-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Failed to transfer ownership' };
    } catch {
      return { success: false, error: 'Connection error while updating ownership.' };
    }
  };

  const adminLogout = async () => {
    if (adminToken) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch {
        // ignore
      }
    }
    localStorage.removeItem('zohra_admin_token');
    localStorage.removeItem('zohra_admin_user');
    setAdminToken(null);
    setAdminUser(null);
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        settings,
        integrations,
        loading,
        cart,
        wishlist,
        compareList,
        recentlyViewed,
        user,
        adminUser,
        token,
        adminToken,
        customerNotifications,
        unreadNotificationCount,
        cartDrawerOpen,
        setCartDrawerOpen,
        checkoutModalOpen,
        setCheckoutModalOpen,
        quickViewProduct,
        setQuickViewProduct,
        authModalOpen,
        setAuthModalOpen,
        authMode,
        setAuthMode,
        trackingModalOpen,
        setTrackingModalOpen,
        activeView,
        setActiveView,
        sizeGuideModalOpen,
        setSizeGuideModalOpen,
        compareModalOpen,
        setCompareModalOpen,
        wholesaleModalOpen,
        setWholesaleModalOpen,
        infoPageModal,
        setInfoPageModal,
        lookbookModalOpen,
        setLookbookModalOpen,
        giftCardModalOpen,
        setGiftCardModalOpen,
        assistantOpen,
        setAssistantOpen,
        lastOrderId,
        setLastOrderId,
        lookbooks,
        flashSales,
        bundles,
        vipTiers,
        vipStatus,
        getEffectivePrice,
        refreshGrowthFeeds,
        toast,
        showToast,
        dismissToast,
        searchQuery,
        setSearchQuery,
        recentSearches,
        addRecentSearch,
        clearRecentSearches,
        searchDropdownOpen,
        setSearchDropdownOpen,
        filters,
        setFilters,
        resetFilters,
        selectCategory,
        toggleCompare,
        isInCompare,
        clearCompare,
        addRecentlyViewed,
        addToCart,
        buyNow,
        reorderFromOrder,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        cartSubtotal,
        cartDiscount,
        cartShipping,
        cartTotal,
        cartItemCount,
        toggleWishlist,
        isInWishlist,
        refreshCustomerNotifications,
        markCustomerNotificationsRead,
        login,
        register,
        refreshUserProfile,
        logout,
        hasAdminPermission,
        adminPasswordLogin,
        adminGoogleLogin,
        bootstrapOwnerPassword,
        requestAdminPasswordReset,
        confirmAdminPasswordReset,
        updateSuperAdminEmail,
        adminLogout,
        refreshProducts,
        refreshCategories,
        refreshSettings,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
