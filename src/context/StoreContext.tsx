import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Category, CartItem, User, WebsiteSettings, FilterState } from '../types.ts';

export interface ToastNotice {
  id: number;
  title: string;
  subtitle?: string;
  image?: string;
  type?: 'success' | 'info' | 'error';
  showBagActions?: boolean;
}

interface StoreContextType {
  products: Product[];
  categories: Category[];
  settings: WebsiteSettings | null;
  loading: boolean;
  cart: CartItem[];
  wishlist: string[];
  user: User | null;
  adminUser: { id: string; name: string; email: string; role: string; isSuperAdmin?: boolean } | null;
  token: string | null;
  adminToken: string | null;

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
  lastOrderId: string | null;
  setLastOrderId: (id: string | null) => void;

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

  // Cart operations
  addToCart: (product: Product, size: string, color: string, quantity?: number, openDrawer?: boolean) => void;
  buyNow: (product: Product, size: string, color: string, quantity?: number) => void;
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

  // Wishlist
  toggleWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;

  // Authentication
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Admin Auth (Primary Owner & Store Partners)
  adminPasswordLogin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  adminGoogleLogin: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateSuperAdminEmail: (newEmail: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  adminLogout: () => void;

  // Data Refresh
  refreshProducts: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const initialFilters: FilterState = {
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
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
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
      return saved ? JSON.parse(saved) : ['zk-101', 'zk-104'];
    } catch {
      return ['zk-101', 'zk-104'];
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

  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('zohra_admin_token'));
  const [adminUser, setAdminUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
    isSuperAdmin?: boolean;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('zohra_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [sizeGuideModalOpen, setSizeGuideModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'store' | 'admin'>('store');
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastNotice | null>(null);

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
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('zohra_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('zohra_recent_searches', JSON.stringify(recentSearches));
  }, [recentSearches]);

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

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([refreshProducts(), refreshCategories(), refreshSettings()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
          if (Array.isArray(data.user.wishlist)) {
            setWishlist(data.user.wishlist);
          }
        } else {
          localStorage.removeItem('zohra_token');
          setToken(null);
          setUser(null);
        }
      })
      .catch(() => {
        setToken(null);
        setUser(null);
      });
  }, [token]);

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
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.size === size && item.color === color
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { product, size, color, quantity }];
    });

    if (openDrawer) {
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
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.size === size && item.color === color
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { product, size, color, quantity }];
    });
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
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.discountedPrice * item.quantity, 0);
  const freeThreshold = settings?.freeShippingThreshold || 1499;
  const standardFee = settings?.standardShippingFee || 99;
  const cartShipping = cart.length === 0 ? 0 : cartSubtotal >= freeThreshold ? 0 : standardFee;
  const cartDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const cartTotal = Math.max(0, cartSubtotal - cartDiscount + cartShipping);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const applyCoupon = async (code: string) => {
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, cartTotal: cartSubtotal }),
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

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

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

  const register = async (name: string, email: string, password: string, phone?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
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
  };

  const adminPasswordLogin = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
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

  const adminGoogleLogin = async (email: string) => {
    try {
      const res = await fetch('/api/admin/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('zohra_admin_token', data.token);
        localStorage.setItem('zohra_admin_user', JSON.stringify(data.admin));
        setAdminToken(data.token);
        setAdminUser(data.admin);
        return { success: true };
      }
      return { success: false, error: data.error || 'Google authorization rejected' };
    } catch {
      return { success: false, error: 'Connection failure during Google authentication.' };
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
      return { success: false, error: data.error || 'Failed to update Super Admin authorization' };
    } catch {
      return { success: false, error: 'Connection error while updating Super Admin authorization.' };
    }
  };

  const adminLogout = () => {
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
        loading,
        cart,
        wishlist,
        user,
        adminUser,
        token,
        adminToken,
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
        lastOrderId,
        setLastOrderId,
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
        addToCart,
        buyNow,
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
        login,
        register,
        logout,
        adminPasswordLogin,
        adminGoogleLogin,
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
