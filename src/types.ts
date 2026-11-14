export type AdminRolePreset =
  | 'primary_owner'
  | 'store_partner'
  | 'order_manager'
  | 'inventory_manager'
  | 'customer_support'
  | 'delivery_staff'
  | 'finance_manager'
  | 'custom';

export type AdminPermission =
  | 'overview.view'
  | 'products.manage'
  | 'categories.manage'
  | 'inventory.manage'
  | 'orders.view'
  | 'orders.manage'
  | 'delivery.manage'
  | 'customers.view'
  | 'customers.manage'
  | 'payments.view'
  | 'payments.refund'
  | 'returns.manage'
  | 'wholesale.manage'
  | 'coupons.manage'
  | 'reviews.manage'
  | 'reports.view'
  | 'finance.view'
  | 'notifications.manage'
  | 'content.manage'
  | 'settings.manage'
  | 'team.manage'
  | 'staff.manage'
  | 'security.logs'
  | 'backups.manage'
  | 'ownership.transfer';

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  supplier?: string;
  category: string;
  costPrice: number;
  originalPrice: number;
  discountedPrice: number;
  wholesalePrice?: number;
  wholesaleMoq?: number;
  discountPercent: number;
  sizes: string[];
  colors: ProductColor[];
  /** Variant stock keyed as `${size}::${colorName}` */
  variantStock: Record<string, number>;
  /** Variant SKUs keyed as `${size}::${colorName}` */
  variantSkus?: Record<string, string>;
  lowStockThreshold?: number;
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
  scheduledPublishAt?: string;
  rating: number;
  reviewCount: number;
  salesCount?: number;
  images: string[];
  videos?: string[];
  details: {
    neckline: string;
    sleeves: string;
    pattern: string;
    washCare: string;
    lining: string;
  };
  measurements?: Record<string, { bustIn: number; waistIn: number; hipIn: number; lengthIn: number }>;
  fabricCareGuide?: {
    origin: string;
    weave: string;
    washMethod: string;
    ironing: string;
    storage: string;
  };
  completeTheLookIds?: string[];
  stylingNotes?: {
    jewellery: string;
    footwear: string;
    bag?: string;
    dupatta?: string;
  };
  accessoryType?: 'kurti' | 'anarkali' | 'coord' | 'tunic' | 'dupatta' | 'jewellery' | 'footwear';
  flashSalePrice?: number;
  flashSaleId?: string;
  flashSaleEndsAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  sku: string;
  variantKey?: string;
  delta: number;
  previousStock: number;
  newStock: number;
  reason: 'order' | 'cancellation' | 'return_restock' | 'manual_adjustment' | 'import' | 'initial';
  referenceId?: string;
  actorEmail: string;
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
  sku?: string;
  name: string;
  image: string;
  size: string;
  color: string;
  price: number;
  costPrice?: number;
  quantity: number;
}

export type OrderStage =
  | 'Order Placed'
  | 'Payment Confirmed'
  | 'Order Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Return Requested'
  | 'Returned'
  | 'Refund Initiated'
  | 'Refunded';

export interface OrderNote {
  id: string;
  authorEmail: string;
  text: string;
  createdAt: string;
}

export interface Order {
  id: string;
  idempotencyKey?: string;
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
  bundleDiscount?: number;
  vipDiscount?: number;
  loyaltyDiscount?: number;
  giftCardDiscount?: number;
  giftCardCode?: string;
  shipping: number;
  total: number;
  couponCode?: string;
  campaignId?: string;
  paymentMethod: 'cod' | 'online_upi' | 'online_card' | 'razorpay' | 'netbanking' | 'qr';
  paymentStatus: 'pending' | 'awaiting_verification' | 'paid' | 'failed' | 'refund_initiated' | 'refunded';
  transactionId?: string;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  orderStatus: OrderStage;
  courierDetails?: {
    provider: string;
    trackingNumber: string;
    trackingMode?: 'manual' | 'api';
    trackingUrl?: string;
    pickupScheduledAt?: string;
    estimatedDelivery?: string;
  };
  createdAt: string;
  updatedAt?: string;
  trackingSteps: { title: string; date: string; completed: boolean }[];
  userId?: string;
  notes?: string;
  internalNotes?: OrderNote[];
  isWholesale?: boolean;
  canCancel?: boolean;
  canReturn?: boolean;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  provider: 'razorpay' | 'cod' | 'manual';
  method: string;
  amount: number;
  currency: 'INR';
  status: 'created' | 'authorized' | 'captured' | 'failed' | 'refund_initiated' | 'refunded';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignatureVerified?: boolean;
  webhookEventId?: string;
  refundId?: string;
  refundAmount?: number;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnExchangeRequest {
  id: string;
  orderId: string;
  customerEmail: string;
  customerName: string;
  type: 'return' | 'exchange';
  reason: string;
  requestedSize?: string;
  itemName?: string;
  productId?: string;
  photos: string[];
  status: 'requested' | 'approved' | 'rejected' | 'pickup_scheduled' | 'received_eligible' | 'received_damaged' | 'refund_initiated' | 'refunded' | 'completed';
  inventoryRestored: boolean;
  pickupDetails?: {
    courier: string;
    pickupDate: string;
    trackingId?: string;
  };
  refundAmount?: number;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
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

export interface LoyaltyEntry {
  id: string;
  date: string;
  points: number;
  type: 'earned' | 'redeemed' | 'referral_bonus' | 'birthday_bonus';
  description: string;
  orderId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'customer';
  isSuperAdmin?: boolean;
  adminRole?: AdminRolePreset;
  permissions?: AdminPermission[];
  status?: 'active' | 'blocked' | 'suspended' | 'archived';
  addresses: Address[];
  wishlist: string[];
  loyaltyPoints?: number;
  loyaltyHistory?: LoyaltyEntry[];
  referralCode?: string;
  referredBy?: string;
  birthdayMonth?: number;
  birthdayConsent?: boolean;
  internalNotes?: string;
  stockAlerts?: string[];
  priceDropAlerts?: Record<string, number>;
  abandonedCartConsent?: boolean;
  marketingConsent?: boolean;
  vipTierOverride?: string;
  recentlyViewedIds?: string[];
  savedCart?: {
    productId: string;
    size: string;
    color: string;
    quantity: number;
  }[];
  createdAt?: string;
}

export interface WholesaleAccount {
  id: string;
  userId?: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  gstNumber?: string;
  city: string;
  state: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  discountTierPercent: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WholesaleOrderRequest {
  id: string;
  wholesaleAccountId: string;
  businessName: string;
  email: string;
  phone: string;
  items: {
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    requestedPrice: number;
    quotedPrice?: number;
  }[];
  totalQuantity: number;
  estimatedTotal: number;
  status: 'requested' | 'quoted' | 'approved' | 'dispatched' | 'completed' | 'cancelled';
  adminQuoteNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  description: string;
  expiryDate?: string;
  festivalOffer?: boolean;
  isActive: boolean;
  usedCount?: number;
  usageLimitTotal?: number;
  usageLimitPerUser?: number;
  firstOrderOnly?: boolean;
  returningCustomerOnly?: boolean;
  vipOnly?: boolean;
  eligibleCategories?: string[];
  usedByEmails?: Record<string, number>;
}

export interface Review {
  id: string;
  productId: string;
  userId?: string;
  customerName: string;
  customerEmail?: string;
  rating: number;
  comment: string;
  images?: string[];
  date: string;
  createdAt?: string;
  verified: boolean;
  verifiedPurchase?: boolean;
  moderationStatus?: 'approved' | 'pending' | 'hidden';
  reportedCount?: number;
  reportReasons?: string[];
  adminReply?: {
    author: string;
    message: string;
    repliedAt: string;
  };
}

export interface NotificationItem {
  id: string;
  audience: 'customer' | 'admin';
  userId?: string;
  userEmail?: string;
  category: 'order' | 'payment' | 'stock' | 'return' | 'wholesale' | 'security' | 'promo';
  title: string;
  message: string;
  linkId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  category: 'shipping' | 'packaging' | 'marketing' | 'platform_fees' | 'staff' | 'operations' | 'other';
  description: string;
  amount: number;
  recordedBy: string;
  createdAt: string;
}

export interface CMSBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  targetCategory?: string;
  active: boolean;
}

export interface CMSFAQItem {
  id: string;
  question: string;
  answer: string;
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
  shippingPolicyText?: string;
  aboutUsText?: string;
  contactInfoText?: string;
  privacyPolicyText: string;
  termsConditionsText: string;
  heroHeadline: string;
  heroSubtitle: string;
  heroImage: string;
  heroButtonText: string;
  cmsBanners?: CMSBanner[];
  faqItems?: CMSFAQItem[];
  maintenanceMode?: boolean;
  sessionTimeoutHours?: number;
  backupRetentionCount?: number;
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
  actorId?: string;
  action: string;
  recordId?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  result?: 'success' | 'failure' | 'blocked';
  ipAddress?: string;
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

export interface BackupRecord {
  id: string;
  filename: string;
  createdAt: string;
  createdBy: string;
  trigger: 'manual' | 'scheduled' | 'pre_migration' | 'pre_restore';
  sizeBytes: number;
  checksum: string;
  counts: {
    products: number;
    orders: number;
    users: number;
  };
}

export interface FilterState {
  category: string;
  brands?: string[];
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

// =================== ADVANCED FASHION & GROWTH MODULE TYPES ===================

export type OccasionType =
  | 'Wedding'
  | 'Party'
  | 'Casual'
  | 'Office'
  | 'Festive'
  | 'Eid'
  | 'Daily Wear';

export interface LookbookCollection {
  id: string;
  title: string;
  occasion: OccasionType;
  subtitle: string;
  editorialNote: string;
  image: string;
  productIds: string[];
  bundleDiscountPercent: number;
  active: boolean;
  createdAt: string;
}

export interface FlashSaleRule {
  id: string;
  title: string;
  description: string;
  productIds: string[];
  categories: string[];
  discountPercent: number;
  startsAt: string;
  endsAt: string;
  vipEarlyAccessHours?: number;
  active: boolean;
  createdAt: string;
}

export interface BundleOffer {
  id: string;
  title: string;
  description: string;
  requiredProductIds: string[];
  minItems: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  active: boolean;
  createdAt: string;
}

export interface DigitalGiftCard {
  id: string;
  code: string;
  initialBalance: number;
  currentBalance: number;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  message?: string;
  purchasedByEmail?: string;
  expiresAt: string;
  status: 'active' | 'redeemed' | 'disabled';
  createdAt: string;
  transactions: {
    id: string;
    date: string;
    amount: number;
    type: 'issued' | 'redeemed' | 'refunded';
    orderId?: string;
    note: string;
  }[];
}

export interface VipTierConfig {
  id: string;
  name: string;
  minLifetimeSpend: number;
  minOrders: number;
  discountPercent: number;
  freeShippingAlways: boolean;
  pointsMultiplier: number;
  earlyAccessFlashSales: boolean;
  badgeColor: string;
  perks: string[];
}

export interface MarketingCampaign {
  id: string;
  name: string;
  seasonOrFestival: string;
  channel: 'onsite' | 'email' | 'whatsapp';
  targetSegment: 'all' | 'new' | 'repeat' | 'vip' | 'at_risk' | 'consented';
  couponCode?: string;
  budget: number;
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  startsAt: string;
  endsAt: string;
  impressions: number;
  conversions: number;
  revenueAttributed: number;
  createdAt: string;
}

export interface ProductQuestion {
  id: string;
  productId: string;
  customerName: string;
  customerEmail?: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  createdAt: string;
  isPublic: boolean;
}

export interface OrderComplaint {
  id: string;
  orderId: string;
  customerEmail: string;
  customerName: string;
  category: 'delivery_delay' | 'quality_issue' | 'wrong_item' | 'payment_refund' | 'sizing_help' | 'other';
  subject: string;
  description: string;
  status: 'open' | 'investigating' | 'escalated' | 'resolved';
  priority: 'normal' | 'high' | 'urgent';
  messages: {
    id: string;
    author: string;
    role: 'customer' | 'admin' | 'ai_escalation';
    text: string;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface AbandonedCartRecord {
  id: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  items: {
    productId: string;
    name: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
    image: string;
  }[];
  subtotal: number;
  consentGranted: boolean;
  consentUpdatedAt: string;
  lastUpdatedAt: string;
  recoverySentAt?: string;
  recoveredOrderId?: string;
}

export interface ScheduledReportConfig {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  sections: string[];
  recipientEmail: string;
  enabled: boolean;
  lastGeneratedAt?: string;
  nextRunAt: string;
}

export interface AdminWidgetPref {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

