export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  sizes: string[];
  colors: { name: string; hex: string }[];
  fabric: string;
  sleeveType?: string;
  kurtiLength?: string;
  occasion?: string;
  badge?: 'NEW ARRIVAL' | 'BEST SELLER' | 'TRENDING' | 'LIMITED STOCK' | 'SPECIAL OFFER';
  description: string;
  inStock: boolean;
  stockQuantity: number;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  isPublished?: boolean;
  rating: number;
  reviewCount: number;
  images: string[];
  details: {
    neckline: string;
    sleeves: string;
    pattern: string;
    washCare: string;
    lining: string;
  };
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount?: number;
}

export interface CartItem {
  product: Product;
  size: string;
  color: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  size: string;
  color: string;
  price: number;
  quantity: number;
}

export type OrderStage =
  | 'Order Placed'
  | 'Order Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned';

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode?: string;
  paymentMethod: 'cod' | 'online_upi' | 'online_card' | 'razorpay';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  transactionId?: string;
  orderStatus: OrderStage;
  courierDetails?: {
    provider: string;
    trackingNumber: string;
    estimatedDelivery?: string;
  };
  createdAt: string;
  trackingSteps: { title: string; date: string; completed: boolean }[];
  userId?: string;
  notes?: string;
  canCancel?: boolean;
  canReturn?: boolean;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'customer';
  isSuperAdmin?: boolean;
  status?: 'active' | 'blocked';
  addresses: Address[];
  wishlist: string[];
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  description: string;
  expiryDate?: string;
  festivalOffer?: boolean;
  isActive: boolean;
  usedCount?: number;
}

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
}

export interface WebsiteSettings {
  brandName: string;
  tagline: string;
  logoText: string;
  announcement: string;
  whatsappNumber: string;
  supportEmail: string;
  supportPhone: string;
  freeShippingThreshold: number;
  standardShippingFee: number;
  returnPolicyDays: number;
  returnPolicyText: string;
  privacyPolicyText: string;
  termsConditionsText: string;
  heroHeadline: string;
  heroSubtitle: string;
  heroImage: string;
  heroButtonText: string;
  socialLinks: {
    instagram: string;
    facebook: string;
    pinterest: string;
  };
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  details: string;
}

export interface SupportInquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

export interface FilterState {
  category: string;
  sizes: string[];
  colors: string[];
  fabrics: string[];
  sleeveTypes: string[];
  kurtiLengths: string[];
  occasions: string[];
  minDiscount: number;
  minRating: number;
  inStockOnly: boolean;
  priceRange: [number, number];
  sortBy: 'relevance' | 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'popularity' | 'discount';
  newArrivalsOnly: boolean;
  bestSellersOnly: boolean;
}
