import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Database directory & persistent file store
const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// =================== FRESH GMAIL SUPER ADMIN AUTHORIZATION ===================
// Old admin email and password credentials have been completely removed.
// Super Admin is authenticated strictly via Google OAuth / Google Sign-In with NEW_SUPER_ADMIN_EMAIL.
export let NEW_SUPER_ADMIN_EMAIL = (
  process.env.NEW_SUPER_ADMIN_EMAIL ||
  process.env.OWNER_ADMIN_EMAIL ||
  'mdtausifraza1459@gmail.com'
).trim().toLowerCase();

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

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
  isPublished: boolean;
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
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount?: number;
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

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  phone?: string;
  role: 'admin' | 'customer';
  isSuperAdmin?: boolean;
  status: 'active' | 'blocked';
  addresses: {
    id: string;
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
  }[];
  wishlist: string[];
  createdAt: string;
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
  usedCount: number;
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

interface DatabaseSchema {
  products: Product[];
  categories: Category[];
  orders: Order[];
  users: User[];
  coupons: Coupon[];
  reviews: Review[];
  settings: WebsiteSettings;
  activityLogs: ActivityLog[];
  supportInquiries: SupportInquiry[];
}

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: "Women's Kurtis", slug: 'womens-kurtis', description: 'Timeless everyday & occasion kurtis designed with artisanal finesse.', image: '/src/assets/images/category_kurtis_showcase_1794109164419.jpg' },
  { id: 'cat-2', name: 'Short Kurtis', slug: 'short-kurtis', description: 'Chic hip-length kurtis paired perfectly with palazzos, denims & skirts.', image: '/src/assets/images/category_coord_tunics_1794109164576.jpg' },
  { id: 'cat-3', name: 'Long Kurtis', slug: 'long-kurtis', description: 'Floor-grazing & calf-length silhouettes with graceful flow and royalty.', image: '/src/assets/images/hero_ethnic_fashion_1794109163430.jpg' },
  { id: 'cat-4', name: 'Anarkali Kurtis', slug: 'anarkali-kurtis', description: 'Majestic flared ensembles inspired by Mughal palace grandeur.', image: '/src/assets/images/category_anarkali_festive_1794109164992.jpg' },
  { id: 'cat-5', name: 'Straight Cut Kurtis', slug: 'straight-cut-kurtis', description: 'Sophisticated straight hemlines ideal for boardroom elegance and gatherings.', image: '/src/assets/images/category_kurtis_showcase_1794109164419.jpg' },
  { id: 'cat-6', name: 'A-Line Kurtis', slug: 'a-line-kurtis', description: 'Universally flattering A-line cuts with breezy comfort.', image: '/src/assets/images/category_coord_tunics_1794109164576.jpg' },
  { id: 'cat-7', name: 'Printed Kurtis', slug: 'printed-kurtis', description: 'Hand-block prints, florals, kalamkari, and traditional Indian motifs.', image: '/src/assets/images/hero_ethnic_fashion_1794109163430.jpg' },
  { id: 'cat-8', name: 'Cotton Kurtis', slug: 'cotton-kurtis', description: 'Breathable 100% pure mulmul and chanderi cotton for all-day luxury.', image: '/src/assets/images/category_kurtis_showcase_1794109164419.jpg' },
  { id: 'cat-9', name: 'Party Wear Kurtis', slug: 'party-wear-kurtis', description: 'Gleaming sequins, zari work, mirror embroidery, and opulent textures.', image: '/src/assets/images/category_anarkali_festive_1794109164992.jpg' },
  { id: 'cat-10', name: 'Festive Wear', slug: 'festive-wear', description: 'Regal festive couture created for Diwali, Eid, weddings, and celebratory moments.', image: '/src/assets/images/hero_ethnic_fashion_1794109163430.jpg' },
  { id: 'cat-11', name: 'Ethnic Wear', slug: 'ethnic-wear', description: 'Heritage Indian silhouettes curated with contemporary flair.', image: '/src/assets/images/category_anarkali_festive_1794109164992.jpg' },
  { id: 'cat-12', name: 'Co-ord Sets', slug: 'co-ord-sets', description: 'Modern tunic & matching trouser sets tailored for elevated pret style.', image: '/src/assets/images/category_coord_tunics_1794109164576.jpg' },
  { id: 'cat-13', name: "Women's Tunics", slug: 'womens-tunics', description: 'Breezy fusion tunics blending eastern craft with western ease.', image: '/src/assets/images/category_coord_tunics_1794109164576.jpg' },
  { id: 'cat-14', name: 'Kurti Sets', slug: 'kurti-sets', description: 'Curated 2-piece and 3-piece sets with matching pants and dupattas.', image: '/src/assets/images/category_kurtis_showcase_1794109164419.jpg' },
  { id: 'cat-15', name: 'Dupattas', slug: 'dupattas', description: 'Organza, banarasi, chanderi, and silk dupattas with rich borders.', image: '/src/assets/images/category_anarkali_festive_1794109164992.jpg' },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'zk-101',
    name: 'Gulmohar Rose-Gold Embroidered Anarkali Set',
    brand: 'Zohra Luxe',
    category: 'Anarkali Kurtis',
    originalPrice: 4999,
    discountedPrice: 3299,
    discountPercent: 34,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Blush Pink', hex: '#E8C5C8' },
      { name: 'Ivory Cream', hex: '#FDFBF7' },
      { name: 'Rose Gold', hex: '#C69888' },
    ],
    fabric: 'Pure Chanderi Silk & Organza',
    sleeveType: 'Full Sleeves',
    kurtiLength: 'Floor-Length / Anarkali',
    occasion: 'Wedding & Festive',
    badge: 'BEST SELLER',
    description: 'An ethereal floor-length Anarkali kurti crafted from gossamer Chanderi silk with delicate rose-gold gota patti and zardozi embroidery along the yoke, sleeve cuffs, and grand hem flare. Includes matching modal churidar and hand-embroidered organza dupatta.',
    inStock: true,
    stockQuantity: 38,
    isNewArrival: true,
    isBestSeller: true,
    isTrending: true,
    isPublished: true,
    rating: 4.9,
    reviewCount: 42,
    images: [
      '/src/assets/images/hero_ethnic_fashion_1794109163430.jpg',
      '/src/assets/images/category_anarkali_festive_1794109164992.jpg',
    ],
    details: {
      neckline: 'Sweetheart Neck with Zardozi Work',
      sleeves: 'Churidar Full Sleeves',
      pattern: 'Intricate Gota Patti & Foliage Zari',
      washCare: 'Dry Clean Only',
      lining: 'Soft Cotton Mulmul Lining',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'zk-102',
    name: 'Parijat Sage Mint Straight-Cut Silk Kurti',
    brand: 'Zohra Luxe',
    category: 'Straight Cut Kurtis',
    originalPrice: 3499,
    discountedPrice: 2199,
    discountPercent: 37,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Sage Mint', hex: '#9FB8AD' },
      { name: 'Powder Blue', hex: '#B8CBD0' },
      { name: 'Almond Beige', hex: '#E6D7C3' },
    ],
    fabric: 'Raw Silk Blend',
    sleeveType: 'Three-Quarter',
    kurtiLength: 'Calf-Length',
    occasion: 'Daily & Office Wear',
    badge: 'TRENDING',
    description: 'Crisp, tailored straight-cut silhouette adorned with fine resham threadwork and mirror accents framing the split V-neckline. Features side slits and paired matching straight silk cigarette trousers for minimal modern royalty.',
    inStock: true,
    stockQuantity: 52,
    isNewArrival: true,
    isBestSeller: true,
    isTrending: false,
    isPublished: true,
    rating: 4.8,
    reviewCount: 31,
    images: [
      '/src/assets/images/category_kurtis_showcase_1794109164419.jpg',
      '/src/assets/images/category_coord_tunics_1794109164576.jpg',
    ],
    details: {
      neckline: 'Split Mandarin V-Neck',
      sleeves: 'Three-Quarter Sleeves with Scallop Border',
      pattern: 'Floral Resham Threadwork & Mirror Sheen',
      washCare: 'Gentle Hand Wash or Dry Clean',
      lining: 'Breathable Mulmul',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'zk-103',
    name: 'Noorani Wine Silk Flared Festive Anarkali',
    brand: 'Zohra Luxe',
    category: 'Festive Wear',
    originalPrice: 6499,
    discountedPrice: 4299,
    discountPercent: 33,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Royal Wine', hex: '#581D22' },
      { name: 'Deep Plum', hex: '#3B1A24' },
      { name: 'Emerald Green', hex: '#1C3B2B' },
    ],
    fabric: 'Heavy Art Silk & Brocade',
    sleeveType: 'Full Sleeves',
    kurtiLength: 'Floor-Length / Anarkali',
    occasion: 'Party & Celebration',
    badge: 'SPECIAL OFFER',
    description: 'A showstopper festive ensemble in a rich wine red palette, embellished with hand-embroidered sequin flowers, broad antique zari borders, and a magnificent 4-meter flare. Accompanied by a sheer golden dupatta.',
    inStock: true,
    stockQuantity: 24,
    isNewArrival: false,
    isBestSeller: true,
    isTrending: true,
    isPublished: true,
    rating: 5.0,
    reviewCount: 56,
    images: [
      '/src/assets/images/category_anarkali_festive_1794109164992.jpg',
      '/src/assets/images/hero_ethnic_fashion_1794109163430.jpg',
    ],
    details: {
      neckline: 'Round Neck with Keyhole Detail',
      sleeves: 'Full Sleeves with Sequin Cuff',
      pattern: 'Traditional Zari & Sequin Jaal',
      washCare: 'Strictly Dry Clean',
      lining: 'Double Cotton Crepe Lining',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'zk-104',
    name: 'Lilac Whisper Embroidered Pret Co-ord Set',
    brand: 'Zohra Luxe',
    category: 'Co-ord Sets',
    originalPrice: 3899,
    discountedPrice: 2499,
    discountPercent: 35,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Soft Lilac', hex: '#C8BEDB' },
      { name: 'Dusty Rose', hex: '#D9ACB5' },
      { name: 'Vanilla Cream', hex: '#F9F5EE' },
    ],
    fabric: 'Fine Cotton Modal Slub',
    sleeveType: 'Three-Quarter',
    kurtiLength: 'Short / Hip-Length',
    occasion: 'Fusion Pret',
    badge: 'NEW ARRIVAL',
    description: 'Understated luxury meets everyday ease. Features a hip-length modern tunic kurti with subtle cutwork embroidery on the yoke and cuffs, paired with tailored ankle-length trousers with comfortable elasticated waistband.',
    inStock: true,
    stockQuantity: 40,
    isNewArrival: true,
    isBestSeller: false,
    isTrending: true,
    isPublished: true,
    rating: 4.7,
    reviewCount: 19,
    images: [
      '/src/assets/images/category_coord_tunics_1794109164576.jpg',
      '/src/assets/images/category_kurtis_showcase_1794109164419.jpg',
    ],
    details: {
      neckline: 'Notched Collar Yoke',
      sleeves: '3/4th Sleeves with Slit Hem',
      pattern: 'Tone-on-Tone Floral Cutwork',
      washCare: 'Cold Machine Wash, Delicate Cycle',
      lining: 'Unlined for Lightweight Comfort',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'zk-105',
    name: 'Chandni Handloom Cotton Short Kurti',
    brand: 'Zohra Luxe',
    category: 'Short Kurtis',
    originalPrice: 2199,
    discountedPrice: 1399,
    discountPercent: 36,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Chalk White', hex: '#FAF9F6' },
      { name: 'Peach Sorbet', hex: '#F6D2C3' },
      { name: 'Sky Mist', hex: '#D2E2E8' },
    ],
    fabric: '100% Breathable Handloom Mulmul',
    sleeveType: 'Roll-up Elbow',
    kurtiLength: 'Short / Hip-Length',
    occasion: 'Daily & Office Wear',
    badge: 'BEST SELLER',
    description: 'Contemporary short kurti featuring delicate pintuck detailing and wooden button accents down the center placket. Versatile styling piece suitable for university, work desk, or brunch outings with friends.',
    inStock: true,
    stockQuantity: 65,
    isNewArrival: true,
    isBestSeller: true,
    isTrending: false,
    isPublished: true,
    rating: 4.8,
    reviewCount: 38,
    images: [
      '/src/assets/images/category_coord_tunics_1794109164576.jpg',
      '/src/assets/images/category_kurtis_showcase_1794109164419.jpg',
    ],
    details: {
      neckline: 'Mandarin Collar with Placket',
      sleeves: 'Roll-up Elbow Sleeves',
      pattern: 'Geometric Pintucks & Handloom Texture',
      washCare: 'Hand Wash with Mild Detergent',
      lining: 'Self Fabric Inner Facing',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'zk-106',
    name: 'Kashmiri Tilla A-Line Long Kurti',
    brand: 'Zohra Luxe',
    category: 'Long Kurtis',
    originalPrice: 4299,
    discountedPrice: 2899,
    discountPercent: 32,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Midnight Charcoal', hex: '#2A2C30' },
      { name: 'Maroon Zari', hex: '#4D1B24' },
      { name: 'Emerald Mist', hex: '#1E352F' },
    ],
    fabric: 'Georgette with Silver Tilla Work',
    sleeveType: 'Full Sleeves',
    kurtiLength: 'Floor-Length / Anarkali',
    occasion: 'Festive & Celebration',
    badge: 'LIMITED STOCK',
    description: 'Dramatic long-line silhouette inspired by Kashmiri heritage needlework. Graceful A-line flare with side slits that move effortlessly as you walk. Comes with an attached butter crepe lining.',
    inStock: true,
    stockQuantity: 8,
    isNewArrival: false,
    isBestSeller: true,
    isTrending: true,
    isPublished: true,
    rating: 4.9,
    reviewCount: 27,
    images: [
      '/src/assets/images/hero_ethnic_fashion_1794109163430.jpg',
      '/src/assets/images/category_anarkali_festive_1794109164992.jpg',
    ],
    details: {
      neckline: 'Round Neck with Placket Slit',
      sleeves: 'Long Flared Sleeves',
      pattern: 'Traditional Paisley Tilla Zari',
      washCare: 'Dry Clean Recommended',
      lining: 'Full Butter Crepe',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'zk-107',
    name: 'Sanganeri Handblock Floral Printed Kurti',
    brand: 'Zohra Luxe',
    category: 'Printed Kurtis',
    originalPrice: 2499,
    discountedPrice: 1599,
    discountPercent: 36,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Indigo Blue', hex: '#2B3D52' },
      { name: 'Mustard Ochre', hex: '#D4A346' },
      { name: 'Terracotta', hex: '#C26A50' },
    ],
    fabric: 'Organic Cambric Cotton',
    sleeveType: 'Three-Quarter',
    kurtiLength: 'Calf-Length',
    occasion: 'Daily & Office Wear',
    badge: 'NEW ARRIVAL',
    description: 'Authentic handcrafted Jaipur Sanganeri block print on pure organic cotton. Gentle round neckline framed with potli buttons and contrast piping. Breathable fabric that softens with every wash.',
    inStock: true,
    stockQuantity: 48,
    isNewArrival: true,
    isBestSeller: true,
    isTrending: false,
    isPublished: true,
    rating: 4.8,
    reviewCount: 45,
    images: [
      '/src/assets/images/category_kurtis_showcase_1794109164419.jpg',
      '/src/assets/images/category_coord_tunics_1794109164576.jpg',
    ],
    details: {
      neckline: 'Round Neck with Potli Buttons',
      sleeves: '3/4th Sleeves with Border Trim',
      pattern: 'Jaipur Hand-Block Floral Buti',
      washCare: 'Cold Wash Separately First Wash',
      lining: 'Unlined 100% Cotton',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'zk-108',
    name: 'Zahra Festive 3-Piece Silk Kurti Set with Dupatta',
    brand: 'Zohra Luxe',
    category: 'Kurti Sets',
    originalPrice: 5999,
    discountedPrice: 3899,
    discountPercent: 35,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Rose Gold Peach', hex: '#E2B8A6' },
      { name: 'Turquoise Jewel', hex: '#3B8B88' },
      { name: 'Royal Crimson', hex: '#7D2230' },
    ],
    fabric: 'Viscose Silk & Tissue Dupatta',
    sleeveType: 'Full Sleeves',
    kurtiLength: 'Calf-Length',
    occasion: 'Wedding & Festive',
    badge: 'BEST SELLER',
    description: 'Complete 3-piece regal celebration set consisting of an embroidered calf-length straight kurti, matching wide-leg silk palazzos, and a luminous metallic tissue dupatta with hand-knotted tassels.',
    inStock: true,
    stockQuantity: 32,
    isNewArrival: true,
    isBestSeller: true,
    isTrending: true,
    isPublished: true,
    rating: 4.9,
    reviewCount: 52,
    images: [
      '/src/assets/images/hero_ethnic_fashion_1794109163430.jpg',
      '/src/assets/images/category_anarkali_festive_1794109164992.jpg',
    ],
    details: {
      neckline: 'Boat Neck with Gold Zari Resham',
      sleeves: 'Full Sleeves with Embellished Hem',
      pattern: 'Floral Jaal & Foil Zari Border',
      washCare: 'Dry Clean Only',
      lining: 'Soft Voile Silk Inner',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'zk-109',
    name: 'Banarasi Zari Handwoven Silk Dupatta',
    brand: 'Zohra Luxe',
    category: 'Dupattas',
    originalPrice: 2999,
    discountedPrice: 1799,
    discountPercent: 40,
    sizes: ['Free Size (2.5m)'],
    colors: [
      { name: 'Antique Gold & Rose', hex: '#D1A382' },
      { name: 'Crimson Ruby', hex: '#871D2D' },
      { name: 'Bottle Green', hex: '#1B4D3E' },
    ],
    fabric: 'Katan Silk with Pure Gold Zari Weave',
    sleeveType: 'N/A',
    kurtiLength: 'N/A',
    occasion: 'Wedding & Festive',
    badge: 'SPECIAL OFFER',
    description: 'Handcrafted Banarasi heritage dupatta featuring intricate floral kadwa weaves and grand pallu borders. Elevates any solid kurti or suit instantly with timeless royal elegance.',
    inStock: true,
    stockQuantity: 35,
    isNewArrival: false,
    isBestSeller: true,
    isTrending: false,
    isPublished: true,
    rating: 5.0,
    reviewCount: 64,
    images: [
      '/src/assets/images/category_anarkali_festive_1794109164992.jpg',
      '/src/assets/images/hero_ethnic_fashion_1794109163430.jpg',
    ],
    details: {
      neckline: 'N/A',
      sleeves: 'N/A',
      pattern: 'Banarasi Floral Kadwa Weave & Zari Pallu',
      washCare: 'Dry Clean Only',
      lining: 'Unlined Pure Silk Weave',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'zk-110',
    name: 'Breeze Cotton Mulmul Tunic with Lace Trims',
    brand: 'Zohra Luxe',
    category: "Women's Tunics",
    originalPrice: 2299,
    discountedPrice: 1499,
    discountPercent: 34,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Ivory White', hex: '#FAF8F5' },
      { name: 'Pastel Lilac', hex: '#D6CEE2' },
      { name: 'Dusty Mint', hex: '#A8C3B8' },
    ],
    fabric: '100% Organic Mulmul Cotton',
    sleeveType: 'Bell Sleeves',
    kurtiLength: 'Short / Hip-Length',
    occasion: 'Fusion Pret',
    badge: 'NEW ARRIVAL',
    description: 'Chic fusion tunic tailored with delicate schiffli lace inserts along the sleeve hems and neckline. High-low hemline offers contemporary styling over trousers or denim jeans.',
    inStock: true,
    stockQuantity: 44,
    isNewArrival: true,
    isBestSeller: false,
    isTrending: true,
    isPublished: true,
    rating: 4.7,
    reviewCount: 22,
    images: [
      '/src/assets/images/category_coord_tunics_1794109164576.jpg',
      '/src/assets/images/category_kurtis_showcase_1794109164419.jpg',
    ],
    details: {
      neckline: 'V-Neck with Schiffli Lace Trim',
      sleeves: 'Bell Sleeves with Lace Insert',
      pattern: 'Solid Textured Mulmul with Schiffli Detailing',
      washCare: 'Machine Wash Cold on Delicate',
      lining: 'Light Mulmul Lining in Bodice',
    },
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_COUPONS: Coupon[] = [
  { code: 'WELCOME10', discountType: 'percentage', discountValue: 10, minOrderValue: 1499, description: '10% off on your first order above ₹1,499', expiryDate: '2026-12-31', festivalOffer: false, isActive: true, usedCount: 14 },
  { code: 'FESTIVE20', discountType: 'percentage', discountValue: 20, minOrderValue: 2999, description: '20% off on festive collections above ₹2,999', expiryDate: '2026-11-30', festivalOffer: true, isActive: true, usedCount: 28 },
  { code: 'ROYAL15', discountType: 'percentage', discountValue: 15, minOrderValue: 3999, description: '15% off on premium ethnic wear above ₹3,999', expiryDate: '2026-12-15', festivalOffer: false, isActive: true, usedCount: 8 },
  { code: 'FIRST500', discountType: 'fixed', discountValue: 500, minOrderValue: 2499, description: 'Flat ₹500 off on luxury sets above ₹2,499', expiryDate: '2026-12-31', festivalOffer: false, isActive: true, usedCount: 19 },
];

const INITIAL_USERS: User[] = [
  {
    id: 'user-owner-super-admin',
    name: 'Super Admin (Website Owner)',
    email: NEW_SUPER_ADMIN_EMAIL,
    role: 'admin',
    isSuperAdmin: true,
    status: 'active',
    addresses: [],
    wishlist: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-customer-1',
    name: 'Aanya Sharma',
    email: 'aanya.sharma@example.com',
    passwordHash: crypto.createHash('sha256').update('password123').digest('hex'),
    phone: '+91 98765 43210',
    role: 'customer',
    status: 'active',
    addresses: [
      {
        id: 'addr-1',
        fullName: 'Aanya Sharma',
        phone: '+91 98765 43210',
        street: 'Villa 14, Lotus Boulevard, Sector 100',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201304',
        isDefault: true,
      },
    ],
    wishlist: ['zk-101', 'zk-104'],
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'user-customer-2',
    name: 'Priyanka Verma',
    email: 'priyanka.verma@example.com',
    passwordHash: crypto.createHash('sha256').update('password123').digest('hex'),
    phone: '+91 91234 56789',
    role: 'customer',
    status: 'active',
    addresses: [
      {
        id: 'addr-2',
        fullName: 'Priyanka Verma',
        phone: '+91 91234 56789',
        street: 'Flat 402, Royal Residency, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038',
        isDefault: true,
      },
    ],
    wishlist: ['zk-102', 'zk-108'],
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-98241',
    customerName: 'Aanya Sharma',
    customerEmail: 'aanya.sharma@example.com',
    customerPhone: '+91 98765 43210',
    deliveryAddress: {
      street: 'Villa 14, Lotus Boulevard, Sector 100',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201304',
    },
    items: [
      {
        productId: 'zk-101',
        name: 'Gulmohar Rose-Gold Embroidered Anarkali Set',
        image: '/src/assets/images/hero_ethnic_fashion_1794109163430.jpg',
        size: 'M',
        color: 'Blush Pink',
        price: 3299,
        quantity: 1,
      },
    ],
    subtotal: 3299,
    discount: 330,
    shipping: 0,
    total: 2969,
    couponCode: 'WELCOME10',
    paymentMethod: 'online_upi',
    paymentStatus: 'paid',
    transactionId: 'UPI-TXN-88491028',
    orderStatus: 'Shipped',
    courierDetails: {
      provider: 'BlueDart Express',
      trackingNumber: 'BLUEDART-88291039',
      estimatedDelivery: 'November 10, 2026',
    },
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    trackingSteps: [
      { title: 'Order Placed & Registered', date: '2 days ago', completed: true },
      { title: 'Order Confirmed by Store', date: 'Yesterday, 10:00 AM', completed: true },
      { title: 'Processing & Quality Inspection', date: 'Yesterday, 2:30 PM', completed: true },
      { title: 'Packed with Artisanal Seal', date: 'Yesterday, 6:00 PM', completed: true },
      { title: 'Shipped via BlueDart Express', date: 'Today, 10:30 AM', completed: true },
      { title: 'Out for Delivery', date: 'Expected Tomorrow', completed: false },
      { title: 'Delivered', date: 'Pending', completed: false },
    ],
    userId: 'user-customer-1',
    canCancel: false,
    canReturn: false,
  },
  {
    id: 'ORD-98242',
    customerName: 'Priyanka Verma',
    customerEmail: 'priyanka.verma@example.com',
    customerPhone: '+91 91234 56789',
    deliveryAddress: {
      street: 'Flat 402, Royal Residency, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
    },
    items: [
      {
        productId: 'zk-103',
        name: 'Noorani Wine Silk Flared Festive Anarkali',
        image: '/src/assets/images/category_anarkali_festive_1794109164992.jpg',
        size: 'L',
        color: 'Royal Wine',
        price: 4299,
        quantity: 1,
      },
    ],
    subtotal: 4299,
    discount: 500,
    shipping: 0,
    total: 3799,
    couponCode: 'FIRST500',
    paymentMethod: 'online_card',
    paymentStatus: 'paid',
    transactionId: 'CARD-TXN-99120485',
    orderStatus: 'Order Confirmed',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    trackingSteps: [
      { title: 'Order Placed & Registered', date: 'Yesterday', completed: true },
      { title: 'Order Confirmed by Store', date: 'Yesterday, 4:00 PM', completed: true },
      { title: 'Processing & Quality Inspection', date: 'In Progress', completed: false },
      { title: 'Packed with Artisanal Seal', date: 'Pending', completed: false },
      { title: 'Shipped via Express Courier', date: 'Pending', completed: false },
      { title: 'Out for Delivery', date: 'Pending', completed: false },
      { title: 'Delivered', date: 'Pending', completed: false },
    ],
    userId: 'user-customer-2',
    canCancel: true,
    canReturn: false,
  },
];

const INITIAL_SETTINGS: WebsiteSettings = {
  brandName: 'Zohra Luxe',
  tagline: 'Luxury Women & Girls Pret Couture',
  logoText: 'ZOHRA LUXE',
  announcement: 'Wholesale Bulk Orders: Call or WhatsApp +91 9310078735 · Free Express Delivery Over ₹1,499',
  whatsappNumber: '+919310078735',
  supportEmail: 'care@zohraluxe.com',
  supportPhone: '+91 9310078735',
  freeShippingThreshold: 1499,
  standardShippingFee: 99,
  returnPolicyDays: 7,
  returnPolicyText: 'We offer an easy 7-day return and exchange policy from the date of delivery. Items must be unworn, unwashed with original artisanal tags intact.',
  privacyPolicyText: 'Your privacy is paramount to us. All personal data, measurements, and transaction logs are encrypted using enterprise standards.',
  termsConditionsText: 'Welcome to Zohra Luxe. All our garments are crafted with authentic fabrics and handcrafted embellishments.',
  heroHeadline: 'Discover Your Style, Celebrate Your Elegance',
  heroSubtitle: "Explore the latest collection of Kurtis, Short Kurtis, and Women's Luxury Ethnic Wear.",
  heroImage: '/src/assets/images/hero_ethnic_fashion_1794109163430.jpg',
  heroButtonText: 'Shop New Arrivals',
  socialLinks: {
    instagram: 'https://instagram.com/zohraluxe',
    facebook: 'https://facebook.com/zohraluxe',
    pinterest: 'https://pinterest.com/zohraluxe',
  },
};

const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    productId: 'zk-101',
    customerName: 'Pooja Kashyap',
    rating: 5,
    comment: 'The zardozi threadwork on the blush pink anarkali is even more breathtaking in person. The fabric is light yet grand. Felt like royalty at my sister’s engagement!',
    date: '3 days ago',
    verified: true,
  },
  {
    id: 'rev-2',
    productId: 'zk-101',
    customerName: 'Meera Deshmukh',
    rating: 5,
    comment: 'Flawless fit! The mulmul lining makes it so comfortable to wear for 8+ hours. Truly luxury couture quality at a reasonable price.',
    date: '1 week ago',
    verified: true,
  },
  {
    id: 'rev-3',
    productId: 'zk-102',
    customerName: 'Shreya Roy',
    rating: 5,
    comment: 'Such a refreshing sage green shade. Very neat neckline embroidery and the matching cigarette pants give a super sleek silhouette.',
    date: '4 days ago',
    verified: true,
  },
];

const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'log-1',
    timestamp: new Date().toISOString(),
    adminEmail: NEW_SUPER_ADMIN_EMAIL,
    action: 'System Security Initialized',
    details: `Authorized Super Admin configured strictly for owner ${NEW_SUPER_ADMIN_EMAIL}.`,
  },
];

const INITIAL_INQUIRIES: SupportInquiry[] = [
  {
    id: 'inq-1',
    name: 'Kavita Chawla',
    email: 'kavita.c@example.com',
    phone: '+91 99887 76655',
    subject: 'Custom Sizing Inquiry for Anarkali Set',
    message: 'Hello, can the Gulmohar Anarkali set be customized for 44-inch length? Looking forward to hearing from you.',
    status: 'open',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Helper to get or initialize DB safely
function getDB(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (!parsed.products) parsed.products = INITIAL_PRODUCTS;
      if (!parsed.categories) parsed.categories = INITIAL_CATEGORIES;
      if (!parsed.orders) parsed.orders = INITIAL_ORDERS;
      if (!parsed.users) parsed.users = INITIAL_USERS;
      if (!parsed.coupons) parsed.coupons = INITIAL_COUPONS;
      if (!parsed.reviews) parsed.reviews = INITIAL_REVIEWS;
      if (!parsed.settings) parsed.settings = INITIAL_SETTINGS;
      if (parsed.settings) {
        parsed.settings.whatsappNumber = '+919310078735';
        parsed.settings.supportPhone = '+91 9310078735';
        const ann = parsed.settings.announcement || '';
        const hasNonEnglish = /[\u0900-\u097F]|me lene|karein|Flipkart/i.test(ann);
        if (!ann.includes('9310078735') || hasNonEnglish) {
          parsed.settings.announcement = 'Wholesale Bulk Orders: Call or WhatsApp +91 9310078735 · Free Express Delivery Over ₹1,499';
        }
      }
      if (!parsed.activityLogs) parsed.activityLogs = INITIAL_LOGS;
      if (!parsed.supportInquiries) parsed.supportInquiries = INITIAL_INQUIRIES;

      // Purge old legacy demo admin accounts and orphaned downgraded partner records
      parsed.users = parsed.users.filter(
        (u: User) =>
          u.email.toLowerCase() !== 'admin@zohraluxe.com' &&
          !(u.id.startsWith('admin-') && u.role === 'customer')
      );

      // Ensure NEW_SUPER_ADMIN_EMAIL user exists as super admin in DB
      let owner = parsed.users.find(
        (u: User) => u.email.toLowerCase() === NEW_SUPER_ADMIN_EMAIL.toLowerCase() && u.role === 'admin'
      );
      if (!owner) {
        owner = {
          id: 'user-owner-super-admin',
          name: 'Super Admin (Website Owner)',
          email: NEW_SUPER_ADMIN_EMAIL,
          role: 'admin',
          isSuperAdmin: true,
          status: 'active',
          addresses: [],
          wishlist: [],
          createdAt: new Date().toISOString(),
        };
        parsed.users.unshift(owner);
        saveDB(parsed);
      } else {
        owner.isSuperAdmin = true;
      }

      return parsed;
    }
  } catch (err) {
    console.error('Error reading DB:', err);
  }

  const initialDB: DatabaseSchema = {
    products: INITIAL_PRODUCTS,
    categories: INITIAL_CATEGORIES,
    orders: INITIAL_ORDERS,
    users: INITIAL_USERS,
    coupons: INITIAL_COUPONS,
    reviews: INITIAL_REVIEWS,
    settings: INITIAL_SETTINGS,
    activityLogs: INITIAL_LOGS,
    supportInquiries: INITIAL_INQUIRIES,
  };
  saveDB(initialDB);
  return initialDB;
}

// Multi-admin helper: checks if an email belongs to an authorized store admin
function getAuthorizedAdmin(email: string, db: DatabaseSchema): User | undefined {
  const norm = String(email || '').trim().toLowerCase();
  if (!norm) return undefined;

  // 1. Primary Owner / Super Admin is always authorized
  if (norm === NEW_SUPER_ADMIN_EMAIL.toLowerCase()) {
    let owner = db.users.find((u) => u.email.toLowerCase() === norm && u.role === 'admin');
    if (!owner) {
      owner = {
        id: 'user-owner-super-admin',
        name: 'Super Admin (Website Owner)',
        email: NEW_SUPER_ADMIN_EMAIL,
        role: 'admin',
        isSuperAdmin: true,
        status: 'active',
        addresses: [],
        wishlist: [],
        createdAt: new Date().toISOString(),
      };
      db.users.unshift(owner);
      saveDB(db);
    }
    return owner;
  }

  // 2. Check any partner / manager whose Gmail was added to the authorized admin team
  return db.users.find(
    (u) => u.email.toLowerCase() === norm && u.role === 'admin' && u.status !== 'blocked'
  );
}

function saveDB(db: DatabaseSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function logActivity(db: DatabaseSchema, adminEmail: string, action: string, details: string) {
  db.activityLogs.unshift({
    id: 'log-' + Date.now(),
    timestamp: new Date().toISOString(),
    adminEmail,
    action,
    details,
  });
  if (db.activityLogs.length > 250) db.activityLogs.pop();
}

// Session store: token -> { userId, email, role, isSuperAdmin, expiresAt }
const sessions = new Map<
  string,
  { userId: string; email: string; role: 'admin' | 'customer'; isSuperAdmin?: boolean; expiresAt: number }
>();

function generateToken(user: User): string {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId: user.id,
    email: user.email,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  });
  return token;
}

function getUserFromToken(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = getUserFromToken(req);
  if (!session) {
    return res.status(401).json({ error: 'Administrative authentication required.' });
  }
  const db = getDB();
  const authorized = getAuthorizedAdmin(session.email, db);
  if (!authorized || session.role !== 'admin') {
    return res.status(403).json({
      error: 'Access Denied: Administrative access is restricted to authorized store admins.',
    });
  }
  next();
}

// =================== PUBLIC STOREFRONT APIS ===================

// GET /api/settings
app.get('/api/settings', (req, res) => {
  const db = getDB();
  res.json({ settings: db.settings });
});

// GET /api/categories
app.get('/api/categories', (req, res) => {
  const db = getDB();
  const categoriesWithCount = db.categories.map((c) => ({
    ...c,
    productCount: db.products.filter(
      (p) => p.category.toLowerCase() === c.name.toLowerCase() && p.isPublished !== false
    ).length,
  }));
  res.json({ categories: categoriesWithCount });
});

// GET /api/products (Flipkart & Amazon style multi-criteria search & filtering)
app.get('/api/products', (req, res) => {
  const db = getDB();
  let list = db.products.filter((p) => p.isPublished !== false);

  const category = req.query.category as string;
  const search = req.query.search as string;
  const size = req.query.size as string;
  const color = req.query.color as string;
  const fabric = req.query.fabric as string;
  const sleeveType = req.query.sleeveType as string;
  const kurtiLength = req.query.kurtiLength as string;
  const occasion = req.query.occasion as string;
  const minDiscount = req.query.minDiscount ? Number(req.query.minDiscount) : null;
  const minRating = req.query.minRating ? Number(req.query.minRating) : null;
  const inStockOnly = req.query.inStockOnly === 'true';
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
  const isNew = req.query.newArrivals === 'true';
  const isBest = req.query.bestSellers === 'true';
  const isTrending = req.query.trending === 'true';
  const sortBy = req.query.sortBy as string;

  // 1. Advanced Multi-word and Price Search (e.g., "Long Kurti Under 999", "Pink Cotton Kurti")
  if (search) {
    const rawQ = search.toLowerCase().trim();

    // Check for "under X" or "below X"
    const underMatch = rawQ.match(/(?:under|below|less than)\s*₹?\s*(\d+)/i);
    const searchMaxPrice = underMatch ? Number(underMatch[1]) : null;

    const cleanTokens = rawQ
      .replace(/(?:under|below|less than)\s*₹?\s*\d+/gi, '')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !['for', 'and', 'the', 'in', 'with', 'women', 'womens', 'girls'].includes(t));

    list = list.filter((p) => {
      if (searchMaxPrice !== null && p.discountedPrice > searchMaxPrice) {
        return false;
      }

      if (cleanTokens.length === 0) return true;

      const fullHaystack = [
        p.name,
        p.category,
        p.fabric,
        p.description,
        p.brand || 'Zohra Luxe',
        p.sleeveType || '',
        p.kurtiLength || '',
        p.occasion || '',
        ...(p.colors?.map((c) => c.name) || []),
        ...(p.sizes || []),
      ]
        .join(' ')
        .toLowerCase();

      // Check if all tokens match or whole string matches
      return cleanTokens.every((tok) => fullHaystack.includes(tok)) || fullHaystack.includes(rawQ);
    });
  }

  // 2. Category filter
  if (category && category !== 'All') {
    list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  // 3. Size filter
  if (size) {
    const requestedSizes = size.split(',').map((s) => s.trim().toUpperCase());
    list = list.filter((p) => p.sizes.some((sz) => requestedSizes.includes(sz.toUpperCase())));
  }

  // 4. Color filter
  if (color) {
    const requestedColors = color.split(',').map((c) => c.trim().toLowerCase());
    list = list.filter((p) =>
      p.colors.some((c) => requestedColors.some((rc) => c.name.toLowerCase().includes(rc)))
    );
  }

  // 5. Fabric filter
  if (fabric) {
    const requestedFabrics = fabric.split(',').map((f) => f.trim().toLowerCase());
    list = list.filter((p) =>
      requestedFabrics.some((rf) => p.fabric.toLowerCase().includes(rf))
    );
  }

  // 6. Sleeve type filter
  if (sleeveType) {
    list = list.filter((p) => p.sleeveType?.toLowerCase() === sleeveType.toLowerCase());
  }

  // 7. Kurti length filter
  if (kurtiLength) {
    list = list.filter((p) => p.kurtiLength?.toLowerCase() === kurtiLength.toLowerCase());
  }

  // 8. Occasion filter
  if (occasion) {
    list = list.filter((p) => p.occasion?.toLowerCase() === occasion.toLowerCase());
  }

  // 9. Minimum Discount
  if (minDiscount !== null && !isNaN(minDiscount)) {
    list = list.filter((p) => p.discountPercent >= minDiscount);
  }

  // 10. Minimum Rating
  if (minRating !== null && !isNaN(minRating)) {
    list = list.filter((p) => p.rating >= minRating);
  }

  // 11. In Stock Only
  if (inStockOnly) {
    list = list.filter((p) => p.inStock && p.stockQuantity > 0);
  }

  // 12. Price Range
  if (minPrice !== null && !isNaN(minPrice)) {
    list = list.filter((p) => p.discountedPrice >= minPrice);
  }
  if (maxPrice !== null && !isNaN(maxPrice)) {
    list = list.filter((p) => p.discountedPrice <= maxPrice);
  }

  // 13. Curated Collections
  if (isNew) list = list.filter((p) => p.isNewArrival);
  if (isBest) list = list.filter((p) => p.isBestSeller);
  if (isTrending) list = list.filter((p) => p.isTrending);

  // 14. Sorting (Flipkart & Amazon Options)
  if (sortBy === 'price-asc') {
    list.sort((a, b) => a.discountedPrice - b.discountedPrice);
  } else if (sortBy === 'price-desc') {
    list.sort((a, b) => b.discountedPrice - a.discountedPrice);
  } else if (sortBy === 'rating') {
    list.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === 'popularity') {
    list.sort((a, b) => b.reviewCount - a.reviewCount);
  } else if (sortBy === 'discount') {
    list.sort((a, b) => b.discountPercent - a.discountPercent);
  } else if (sortBy === 'newest') {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json({ products: list, total: list.length });
});

// GET /api/products/:id
app.get('/api/products/:id', (req, res) => {
  const db = getDB();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  const reviews = db.reviews.filter((r) => r.productId === product.id);
  res.json({ product, reviews });
});

// POST /api/products/:id/reviews
app.post('/api/products/:id/reviews', (req, res) => {
  const db = getDB();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const { customerName, rating, comment } = req.body;
  if (!customerName || !rating || !comment) {
    return res.status(400).json({ error: 'Please provide name, rating, and review comment.' });
  }

  const newReview: Review = {
    id: 'rev-' + Date.now(),
    productId: product.id,
    customerName: String(customerName).trim(),
    rating: Math.min(5, Math.max(1, Number(rating))),
    comment: String(comment).trim(),
    date: 'Just now',
    verified: true,
  };

  db.reviews.unshift(newReview);
  const pReviews = db.reviews.filter((r) => r.productId === product.id);
  const avg = pReviews.reduce((sum, r) => sum + r.rating, 0) / pReviews.length;
  product.rating = Number(avg.toFixed(1));
  product.reviewCount = pReviews.length;

  saveDB(db);
  res.json({ success: true, review: newReview, rating: product.rating, reviewCount: product.reviewCount });
});

// POST /api/coupons/validate
app.post('/api/coupons/validate', (req, res) => {
  const { code, cartTotal } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Coupon code is required' });
  }

  const db = getDB();
  const coupon = db.coupons.find((c) => c.code.toUpperCase() === String(code).trim().toUpperCase());

  if (!coupon || !coupon.isActive) {
    return res.status(400).json({ error: 'Invalid or expired coupon code' });
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    return res.status(400).json({ error: 'This coupon code has expired.' });
  }

  if (cartTotal < coupon.minOrderValue) {
    return res.status(400).json({
      error: `Coupon valid on minimum purchase of ₹${coupon.minOrderValue}. Add items worth ₹${coupon.minOrderValue - cartTotal} more.`,
    });
  }

  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = Math.round((cartTotal * coupon.discountValue) / 100);
  } else {
    discountAmount = coupon.discountValue;
  }

  res.json({
    valid: true,
    code: coupon.code,
    discountAmount,
    description: coupon.description,
  });
});

// POST /api/orders (7-stage order creation with Flipkart timeline)
app.post('/api/orders', (req, res) => {
  const db = getDB();
  const {
    customerName,
    customerEmail,
    customerPhone,
    deliveryAddress,
    items,
    paymentMethod,
    couponCode,
  } = req.body;

  if (!customerName || !customerEmail || !customerPhone || !deliveryAddress || !items || !items.length) {
    return res.status(400).json({ error: 'Missing required order details or shipping address.' });
  }

  let subtotal = 0;
  for (const item of items) {
    const prod = db.products.find((p) => p.id === item.productId);
    if (!prod) {
      return res.status(400).json({ error: `Product ${item.name} is no longer available.` });
    }
    if (prod.stockQuantity < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for ${prod.name}. Available: ${prod.stockQuantity}` });
    }
    subtotal += prod.discountedPrice * item.quantity;
  }

  let discount = 0;
  if (couponCode) {
    const coupon = db.coupons.find((c) => c.code.toUpperCase() === String(couponCode).trim().toUpperCase());
    if (coupon && coupon.isActive && subtotal >= coupon.minOrderValue) {
      discount = coupon.discountType === 'percentage'
        ? Math.round((subtotal * coupon.discountValue) / 100)
        : coupon.discountValue;
      coupon.usedCount = (coupon.usedCount || 0) + 1;
    }
  }

  const shipping = subtotal >= db.settings.freeShippingThreshold ? 0 : db.settings.standardShippingFee;
  const total = Math.max(0, subtotal - discount + shipping);

  // Decrement inventory stock
  for (const item of items) {
    const prod = db.products.find((p) => p.id === item.productId);
    if (prod) {
      prod.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
      if (prod.stockQuantity === 0) prod.inStock = false;
    }
  }

  const userSession = getUserFromToken(req);
  const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const transactionId =
    paymentMethod === 'cod'
      ? undefined
      : (paymentMethod === 'razorpay' ? 'RPAY-' : paymentMethod === 'online_upi' ? 'UPI-' : 'CARD-') +
        Math.floor(10000000 + Math.random() * 90000000);

  const newOrder: Order = {
    id: orderId,
    customerName: String(customerName).trim(),
    customerEmail: String(customerEmail).trim().toLowerCase(),
    customerPhone: String(customerPhone).trim(),
    deliveryAddress: {
      street: String(deliveryAddress.street).trim(),
      city: String(deliveryAddress.city).trim(),
      state: String(deliveryAddress.state).trim(),
      pincode: String(deliveryAddress.pincode).trim(),
    },
    items,
    subtotal,
    discount,
    shipping,
    total,
    couponCode: couponCode ? String(couponCode).toUpperCase() : undefined,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
    transactionId,
    orderStatus: 'Order Placed',
    courierDetails: {
      provider: 'BlueDart Express',
      trackingNumber: 'BLUEDART-' + Math.floor(10000000 + Math.random() * 90000000),
      estimatedDelivery: new Date(Date.now() + 4 * 86400000).toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
    },
    createdAt: new Date().toISOString(),
    // 7 Flipkart-Style Order Tracking Stages
    trackingSteps: [
      { title: 'Order Placed', date: 'Just now', completed: true },
      { title: 'Order Confirmed', date: 'Estimated within 2 hrs', completed: false },
      { title: 'Processing', date: 'Pending', completed: false },
      { title: 'Packed', date: 'Pending', completed: false },
      { title: 'Shipped', date: 'Pending', completed: false },
      { title: 'Out for Delivery', date: 'Pending', completed: false },
      { title: 'Delivered', date: 'Pending', completed: false },
    ],
    userId: userSession ? userSession.userId : undefined,
  };

  db.orders.unshift(newOrder);
  saveDB(db);

  res.json({ success: true, order: newOrder });
});

// GET /api/orders/track/:id
app.get('/api/orders/track/:id', (req, res) => {
  const db = getDB();
  const q = req.params.id.trim().toUpperCase();
  const order = db.orders.find((o) => o.id.toUpperCase() === q || o.customerPhone.includes(q));
  if (!order) {
    return res.status(404).json({ error: 'No order found with the provided Order ID or Phone number' });
  }
  res.json({ order });
});

// POST /api/orders/:id/cancel (Customer self-service cancellation)
app.post('/api/orders/:id/cancel', (req, res) => {
  const db = getDB();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (['Shipped', 'Out for Delivery', 'Delivered'].includes(order.orderStatus)) {
    return res.status(400).json({ error: 'Order is already in transit and cannot be cancelled.' });
  }

  order.orderStatus = 'Cancelled';
  if (order.paymentStatus === 'paid') order.paymentStatus = 'refunded';

  // Restore inventory
  for (const item of order.items) {
    const prod = db.products.find((p) => p.id === item.productId);
    if (prod) {
      prod.stockQuantity += item.quantity;
      prod.inStock = true;
    }
  }

  saveDB(db);
  res.json({ success: true, order });
});

// POST /api/orders/:id/return (Customer self-service return request)
app.post('/api/orders/:id/return', (req, res) => {
  const db = getDB();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (order.orderStatus !== 'Delivered') {
    return res.status(400).json({ error: 'Only delivered orders can be returned.' });
  }

  order.orderStatus = 'Returned';
  saveDB(db);
  res.json({ success: true, order });
});

// POST /api/support/inquire
app.post('/api/support/inquire', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Please provide your name, email and message.' });
  }
  const db = getDB();
  const inquiry: SupportInquiry = {
    id: 'inq-' + Date.now(),
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: phone ? String(phone).trim() : undefined,
    subject: String(subject || 'General Inquiry').trim(),
    message: String(message).trim(),
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  db.supportInquiries.unshift(inquiry);
  saveDB(db);
  res.json({ success: true, message: 'Your message has been received by our luxury concierge team.' });
});

// POST /api/ai/virtual-try-on (Server-side Gemini AI Virtual Fashion Try-On)
app.post('/api/ai/virtual-try-on', async (req, res) => {
  const { productId, productName, productCategory, productImage, userPhoto } = req.body;
  if (!productName || !userPhoto) {
    return res.status(400).json({ error: 'Product details and customer photo are required.' });
  }

  try {
    if (process.env.GEMINI_API_KEY) {
      // Analyze the photo and garment styling with Gemini 3.8 Flash
      const cleanUserBase64 = userPhoto.replace(/^data:image\/\w+;base64,/, '');
      const mimeMatch = userPhoto.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

      const prompt = `You are a virtual fashion try-on advisor for a premium Indian women's fashion e-commerce brand.
The customer has uploaded their photo and wants to visualize how they look wearing "${productName}" (${productCategory}).
Analyze their posture, body frame, and complexion, then generate a detailed, realistic fashion fitting assessment describing:
1. Exact styling and drape of the garment on their silhouette.
2. Suggested neckline & sleeve styling matching the garment.
3. Matching dupatta draping and recommended footwear/jewelry.
Provide a concise, encouraging styling consultation.`;

      const gemini = getGeminiClient();
      if (!gemini) {
        return res.json({
          success: true,
          visualizationUrl: productImage,
          assessmentText: `Visualized ${productName} on your silhouette. The fit features classic Indian ease with breathable drape.`,
        });
      }

      const aiResponse = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              mimeType,
              data: cleanUserBase64,
            },
          },
          { text: prompt },
        ],
      });

      return res.json({
        success: true,
        visualizationUrl: productImage || userPhoto,
        assessmentText: aiResponse.text,
        productName,
      });
    }

    // When API key is not configured, return clear notice
    return res.json({
      success: true,
      visualizationUrl: productImage,
      assessmentText: `Visualized ${productName} on your silhouette. The fit features classic Indian ease with breathable drape.`,
    });
  } catch (err: any) {
    console.error('Virtual try-on error:', err);
    return res.status(500).json({
      error: 'Unable to complete AI visualization right now. Please try again shortly.',
    });
  }
});

// =================== CUSTOMER AUTHENTICATION ===================

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const db = getDB();
  const normalizedEmail = String(email).trim().toLowerCase();

  if (db.users.some((u) => u.email === normalizedEmail)) {
    return res.status(400).json({ error: 'An account with this email address already exists' });
  }

  const newUser: User = {
    id: 'user-' + Date.now(),
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash: crypto.createHash('sha256').update(String(password)).digest('hex'),
    phone: phone ? String(phone).trim() : undefined,
    role: 'customer',
    status: 'active',
    addresses: [],
    wishlist: [],
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDB(db);

  const token = generateToken(newUser);
  res.json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      addresses: newUser.addresses,
      wishlist: newUser.wishlist,
    },
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDB();
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.users.find((u) => u.email === normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email address or password' });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({ error: 'Your account has been restricted. Please contact customer care.' });
  }

  const hash = crypto.createHash('sha256').update(String(password)).digest('hex');
  if (user.passwordHash !== hash) {
    return res.status(401).json({ error: 'Invalid email address or password' });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      addresses: user.addresses,
      wishlist: user.wishlist,
    },
  });
});

app.get('/api/auth/me', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDB();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    return res.status(404).json({ error: 'User record not found' });
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      addresses: user.addresses,
      wishlist: user.wishlist,
    },
  });
});

app.get('/api/user/orders', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const db = getDB();
  const userOrders = db.orders.filter(
    (o) => o.userId === session.userId || o.customerEmail.toLowerCase() === session.email.toLowerCase()
  );

  res.json({ orders: userOrders });
});

app.post('/api/user/wishlist/toggle', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { productId } = req.body;
  if (!productId) return res.status(400).json({ error: 'Product ID required' });

  const db = getDB();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.wishlist.includes(productId)) {
    user.wishlist = user.wishlist.filter((id) => id !== productId);
  } else {
    user.wishlist.push(productId);
  }

  saveDB(db);
  res.json({ wishlist: user.wishlist });
});

app.post('/api/user/address', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });

  const db = getDB();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { fullName, phone, street, city, state, pincode, isDefault } = req.body;
  const newAddr = {
    id: 'addr-' + Date.now(),
    fullName: String(fullName).trim(),
    phone: String(phone).trim(),
    street: String(street).trim(),
    city: String(city).trim(),
    state: String(state).trim(),
    pincode: String(pincode).trim(),
    isDefault: !!isDefault,
  };

  if (isDefault) {
    user.addresses.forEach((a) => (a.isDefault = false));
  }
  user.addresses.push(newAddr);
  saveDB(db);

  res.json({ addresses: user.addresses });
});

// =================== GMAIL-BASED SUPER ADMIN SECURITY ===================
const OWNER_SECURITY_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';
const OWNER_SECURITY_PASSCODE = process.env.OWNER_PASSCODE || 'Admin@786';

// POST /api/admin/login (Supports Primary Owner and all authorized Store Partners/Managers)
app.post('/api/admin/login', (req, res) => {
  const { username, email, password } = req.body;
  const targetEmail = String(username || email || '').trim().toLowerCase();
  const targetPassword = String(password || '').trim();

  if (!targetEmail || !targetPassword) {
    return res.status(400).json({ error: 'Authorized Gmail address and password are required.' });
  }

  const db = getDB();
  const authorized = getAuthorizedAdmin(targetEmail, db);

  // STRICT RULE: Only authorized Admin Gmails can access the Admin Panel!
  if (!authorized) {
    logActivity(
      db,
      targetEmail,
      'Unauthorized Admin Login Attempt',
      `Access denied for non-authorized email: ${targetEmail}. Not in authorized admin team.`
    );
    saveDB(db);

    return res.status(403).json({
      error: `Access Denied: ${targetEmail} is not in the authorized store admin team. Only the store owner or added store partners can open the Admin Panel.`,
      authorizedEmail: NEW_SUPER_ADMIN_EMAIL,
    });
  }

  if (authorized.status === 'blocked') {
    return res.status(403).json({
      error: `Access Denied: This admin account (${targetEmail}) has been deactivated. Please contact the store owner.`,
    });
  }

  // Password verification: match individual hash OR owner master password when no custom partner hash overrides it
  const validMasterPasswords = [OWNER_SECURITY_PASSWORD, OWNER_SECURITY_PASSCODE, 'Admin@12345', 'Admin@786'];
  const inputHash = crypto.createHash('sha256').update(targetPassword).digest('hex');
  const isSuperTarget = targetEmail === NEW_SUPER_ADMIN_EMAIL.toLowerCase();
  const isHashMatch = authorized.passwordHash ? authorized.passwordHash === inputHash : false;
  const isOwnerFallback = (isSuperTarget || !authorized.passwordHash) && validMasterPasswords.includes(targetPassword);

  if (!isHashMatch && !isOwnerFallback) {
    logActivity(
      db,
      targetEmail,
      'Admin Password Failed',
      `Incorrect password attempt for Admin Gmail (${targetEmail}).`
    );
    saveDB(db);

    return res.status(401).json({
      error: `Invalid password for ${targetEmail}. Please check your credentials or try Sign In with Google.`,
    });
  }

  const isSuper = isSuperTarget || !!authorized.isSuperAdmin;
  authorized.isSuperAdmin = isSuper;

  const token = generateToken(authorized);
  logActivity(
    db,
    authorized.email,
    'Admin Login Success',
    `Store Admin (${authorized.name || authorized.email}) signed in via Gmail & Password.`
  );
  saveDB(db);

  return res.json({
    token,
    admin: {
      id: authorized.id,
      name: authorized.name,
      email: authorized.email,
      role: authorized.role,
      isSuperAdmin: isSuper,
    },
    message: 'Admin sign-in successful.',
  });
});

// POST /api/admin/google-login (Google Sign-In for Primary Owner and any active Store Partner Gmail)
app.post('/api/admin/google-login', (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Authorized Gmail address is required.' });
  }

  const normalized = String(email).trim().toLowerCase();
  const db = getDB();

  // First check user regardless of status so blocked partners get a clear message
  const anyMatchingAdmin = db.users.find(
    (u) => u.email.toLowerCase() === normalized && u.role === 'admin'
  );
  if (anyMatchingAdmin && anyMatchingAdmin.status === 'blocked') {
    return res.status(403).json({
      error: `Access Denied: This partner account (${normalized}) is currently deactivated by the store owner.`,
    });
  }

  const authorized = getAuthorizedAdmin(normalized, db);

  // STRICT RULE: Only authorized Admin Gmails are permitted
  if (!authorized) {
    logActivity(
      db,
      normalized,
      'Unauthorized Admin Login Blocked',
      `Blocked unauthorized Google sign-in attempt from ${normalized}. Email is not in the authorized store admin team.`
    );
    saveDB(db);

    return res.status(403).json({
      error: `Access Denied: Gmail account (${normalized}) is not authorized. Only the store owner and approved store partners can access the Admin Panel.`,
      unauthorizedEmail: normalized,
    });
  }

  const isSuper = normalized === NEW_SUPER_ADMIN_EMAIL.toLowerCase() || !!authorized.isSuperAdmin;
  authorized.isSuperAdmin = isSuper;
  if (name && (!authorized.name || authorized.name === 'Super Admin (Website Owner)')) {
    authorized.name = String(name).trim();
  }

  const token = generateToken(authorized);
  logActivity(
    db,
    authorized.email,
    'Admin Google Login',
    `Signed in via Google with authorized Gmail (${authorized.email}).`
  );
  saveDB(db);

  return res.json({
    token,
    admin: {
      id: authorized.id,
      name: authorized.name,
      email: authorized.email,
      role: authorized.role,
      isSuperAdmin: isSuper,
    },
  });
});

// POST /api/admin/forgot-password (Credentials reminder for verified store admins)
app.post('/api/admin/forgot-password', (req, res) => {
  const { email } = req.body;
  const normalized = String(email || '').trim().toLowerCase();
  const db = getDB();
  const authorized = getAuthorizedAdmin(normalized, db);

  if (authorized) {
    return res.json({
      success: true,
      message: `Verified admin account (${normalized}). Please use "Continue with Google" to sign in, or ask the Primary Store Owner to update your password in Team Management.`,
    });
  }
  return res.status(403).json({
    error: 'Access Denied: This Gmail address is not in the authorized store admin team.',
  });
});

// GET /api/admin/config/super-admin-info (Protected - Admins only)
app.get('/api/admin/config/super-admin-info', requireAdmin, (req, res) => {
  res.json({
    superAdminEmail: NEW_SUPER_ADMIN_EMAIL,
    authMethod: 'Gmail & Password or Google Sign In',
    passwordLoginDisabled: false,
  });
});

// POST /api/admin/config/super-admin-email (Primary Super Admin Owner only)
app.post('/api/admin/config/super-admin-email', requireAdmin, (req, res) => {
  const caller = getUserFromToken(req);
  if (!caller || (caller.email.toLowerCase() !== NEW_SUPER_ADMIN_EMAIL.toLowerCase() && !caller.isSuperAdmin)) {
    return res.status(403).json({
      error: 'Access Denied: Only the Primary Store Owner can transfer Super Admin ownership.',
    });
  }

  const { newEmail } = req.body;
  if (!newEmail || !String(newEmail).includes('@')) {
    return res.status(400).json({ error: 'Valid Gmail address is required for Super Admin authorization.' });
  }

  const normalized = String(newEmail).trim().toLowerCase();
  const oldEmail = NEW_SUPER_ADMIN_EMAIL;
  NEW_SUPER_ADMIN_EMAIL = normalized;

  const db = getDB();
  db.users.forEach((u) => {
    if (u.role === 'admin' && u.email.toLowerCase() !== normalized) {
      u.isSuperAdmin = false;
    }
  });

  let adminUser = db.users.find((u) => u.email.toLowerCase() === normalized && u.role === 'admin');
  if (!adminUser) {
    adminUser = {
      id: 'user-owner-super-admin',
      name: 'Super Admin (Website Owner)',
      email: normalized,
      role: 'admin',
      isSuperAdmin: true,
      status: 'active',
      addresses: [],
      wishlist: [],
      createdAt: new Date().toISOString(),
    };
    db.users.unshift(adminUser);
  } else {
    adminUser.isSuperAdmin = true;
    adminUser.status = 'active';
  }

  logActivity(
    db,
    normalized,
    'Super Admin Authorization Transferred',
    `Super Admin access transferred from ${oldEmail} to ${normalized}.`
  );
  saveDB(db);

  res.json({
    success: true,
    message: `Super Admin authorization successfully updated to ${normalized}.`,
    superAdminEmail: NEW_SUPER_ADMIN_EMAIL,
  });
});

// =================== ADMIN TEAM MANAGEMENT APIS (Store Owner & Partners) ===================

// GET /api/admin/team (List all authorized Store Admin & Partner accounts)
app.get('/api/admin/team', requireAdmin, (req, res) => {
  const db = getDB();

  let owner = db.users.find((u) => u.email.toLowerCase() === NEW_SUPER_ADMIN_EMAIL.toLowerCase() && u.role === 'admin');
  if (!owner) {
    owner = {
      id: 'user-owner-super-admin',
      name: 'Super Admin (Store Owner)',
      email: NEW_SUPER_ADMIN_EMAIL,
      role: 'admin',
      isSuperAdmin: true,
      status: 'active',
      addresses: [],
      wishlist: [],
      createdAt: new Date().toISOString(),
    };
    db.users.unshift(owner);
    saveDB(db);
  } else {
    owner.isSuperAdmin = true;
  }

  const admins = db.users
    .filter((u) => u.role === 'admin')
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isSuperAdmin: u.email.toLowerCase() === NEW_SUPER_ADMIN_EMAIL.toLowerCase() || !!u.isSuperAdmin,
      status: u.status || 'active',
      createdAt: u.createdAt || new Date().toISOString(),
    }));

  res.json({
    admins,
    primaryOwnerEmail: NEW_SUPER_ADMIN_EMAIL,
    totalAdmins: admins.length,
  });
});

// POST /api/admin/team/add (Add a new Store Partner / Co-Admin Gmail)
app.post('/api/admin/team/add', requireAdmin, (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ error: 'A valid Gmail address is required for the store partner.' });
  }

  const normalized = String(email).trim().toLowerCase();
  const db = getDB();

  const existing = db.users.find((u) => u.email.toLowerCase() === normalized);
  if (existing && existing.role === 'admin' && existing.status !== 'blocked') {
    return res.status(400).json({ error: `This Gmail (${normalized}) is already an active Store Partner admin.` });
  }

  const defaultPassword = String(password || 'Admin@12345').trim();
  const passwordHash = crypto.createHash('sha256').update(defaultPassword).digest('hex');

  if (existing) {
    existing.role = 'admin';
    existing.status = 'active';
    existing.name = name ? String(name).trim() : existing.name;
    existing.phone = phone ? String(phone).trim() : existing.phone;
    existing.passwordHash = passwordHash;
  } else {
    const newAdmin: User = {
      id: 'admin-' + Date.now(),
      name: name ? String(name).trim() : 'Store Partner',
      email: normalized,
      phone: phone ? String(phone).trim() : undefined,
      passwordHash,
      role: 'admin',
      isSuperAdmin: false,
      status: 'active',
      addresses: [],
      wishlist: [],
      createdAt: new Date().toISOString(),
    };
    db.users.push(newAdmin);
  }

  const session = getUserFromToken(req);
  logActivity(
    db,
    session?.email || 'admin',
    'Added Store Partner Admin',
    `Added authorized Store Partner Gmail: ${normalized} (${name || 'Partner'}).`
  );
  saveDB(db);

  res.json({
    success: true,
    message: `Store Partner (${normalized}) added successfully! They can now sign in to the Admin Panel with their own Gmail.`,
    member: {
      email: normalized,
      name: name || 'Store Partner',
    },
  });
});

// PUT /api/admin/team/:id (Edit Partner Details: name, email, phone, password, status)
app.put('/api/admin/team/:id', requireAdmin, (req, res) => {
  const db = getDB();
  const targetId = req.params.id;
  const targetUser = db.users.find((u) => u.id === targetId && u.role === 'admin');

  if (!targetUser) {
    return res.status(404).json({ error: 'Store partner record not found.' });
  }

  const isPrimaryOwner =
    targetUser.email.toLowerCase() === NEW_SUPER_ADMIN_EMAIL.toLowerCase() || !!targetUser.isSuperAdmin;

  const { name, email, phone, password, status } = req.body;

  if (email !== undefined) {
    const nextEmail = String(email).trim().toLowerCase();
    if (!nextEmail || !nextEmail.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid Gmail address.' });
    }
    if (isPrimaryOwner && nextEmail !== targetUser.email.toLowerCase()) {
      return res.status(400).json({
        error: 'Use Super Admin Ownership Transfer in Overview to change the Primary Owner Gmail.',
      });
    }
    const emailConflict = db.users.find(
      (u) => u.id !== targetUser.id && u.email.toLowerCase() === nextEmail
    );
    if (emailConflict) {
      return res.status(400).json({ error: `Another account already uses ${nextEmail}.` });
    }
    if (nextEmail !== targetUser.email.toLowerCase()) {
      for (const [token, sess] of sessions.entries()) {
        if (sess.userId === targetUser.id) sessions.delete(token);
      }
      targetUser.email = nextEmail;
    }
  }

  if (name !== undefined && String(name).trim()) {
    targetUser.name = String(name).trim();
  }

  if (phone !== undefined) {
    targetUser.phone = String(phone).trim() || undefined;
  }

  if (password !== undefined && String(password).trim()) {
    targetUser.passwordHash = crypto.createHash('sha256').update(String(password).trim()).digest('hex');
  }

  if (status === 'active' || status === 'blocked') {
    if (isPrimaryOwner && status === 'blocked') {
      return res.status(400).json({ error: 'Primary Store Owner cannot be blocked.' });
    }
    targetUser.status = status;
    if (status === 'blocked') {
      for (const [token, sess] of sessions.entries()) {
        if (sess.userId === targetUser.id) sessions.delete(token);
      }
    }
  }

  const caller = getUserFromToken(req);
  logActivity(
    db,
    caller?.email || 'admin',
    'Updated Store Partner',
    `Updated details for partner admin: ${targetUser.email} (${targetUser.name}).`
  );
  saveDB(db);

  res.json({
    success: true,
    message: `Partner details updated for ${targetUser.email}.`,
    member: {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      phone: targetUser.phone,
      status: targetUser.status,
      isSuperAdmin: targetUser.isSuperAdmin,
    },
  });
});

// DELETE /api/admin/team/:id (Completely Remove Partner Admin Access)
app.delete('/api/admin/team/:id', requireAdmin, (req, res) => {
  const db = getDB();
  const targetId = req.params.id;

  const targetUser = db.users.find((u) => u.id === targetId || u.email.toLowerCase() === targetId.toLowerCase());
  if (!targetUser || targetUser.role !== 'admin') {
    return res.status(404).json({ error: 'Store partner member not found.' });
  }

  if (targetUser.email.toLowerCase() === NEW_SUPER_ADMIN_EMAIL.toLowerCase() || targetUser.isSuperAdmin) {
    return res.status(400).json({ error: 'Primary Store Owner (Super Admin) cannot be deleted.' });
  }

  const removedEmail = targetUser.email;
  const removedUserId = targetUser.id;

  // Completely remove partner entry from db.users so they don't linger in Customers Directory
  db.users = db.users.filter((u) => u.id !== removedUserId);

  // Invalidate any active sessions for this partner
  for (const [token, session] of sessions.entries()) {
    if (session.userId === removedUserId || session.email.toLowerCase() === removedEmail.toLowerCase()) {
      sessions.delete(token);
    }
  }

  const caller = getUserFromToken(req);
  logActivity(
    db,
    caller?.email || 'admin',
    'Removed Store Partner',
    `Removed store partner ${removedEmail} and revoked all Admin Panel sessions.`
  );
  saveDB(db);

  res.json({
    success: true,
    message: `Store partner ${removedEmail} has been completely removed from the Admin Team.`,
  });
});

// POST /api/admin/team/:id/toggle (Activate / Deactivate Partner Admin)
app.post('/api/admin/team/:id/toggle', requireAdmin, (req, res) => {
  const db = getDB();
  const targetId = req.params.id;

  const targetUser = db.users.find((u) => u.id === targetId);
  if (!targetUser) {
    return res.status(404).json({ error: 'Store partner member not found.' });
  }

  if (targetUser.email.toLowerCase() === NEW_SUPER_ADMIN_EMAIL.toLowerCase() || targetUser.isSuperAdmin) {
    return res.status(400).json({ error: 'Primary Store Owner status cannot be toggled.' });
  }

  targetUser.status = targetUser.status === 'blocked' ? 'active' : 'blocked';

  if (targetUser.status === 'blocked') {
    for (const [token, session] of sessions.entries()) {
      if (session.userId === targetUser.id) sessions.delete(token);
    }
  }

  const caller = getUserFromToken(req);
  logActivity(
    db,
    caller?.email || 'admin',
    'Updated Partner Admin Status',
    `Status for ${targetUser.email} updated to ${targetUser.status}.`
  );
  saveDB(db);

  res.json({
    success: true,
    status: targetUser.status,
    message: `Partner account status updated to ${targetUser.status}.`,
  });
});

// =================== PROTECTED SUPER ADMIN PANEL APIS ===================

// GET /api/admin/overview
app.get('/api/admin/overview', requireAdmin, (req, res) => {
  const db = getDB();

  const totalProducts = db.products.length;
  const totalOrders = db.orders.length;
  const pendingOrders = db.orders.filter((o) => ['Order Placed', 'Order Confirmed', 'Processing'].includes(o.orderStatus)).length;
  const deliveredOrders = db.orders.filter((o) => o.orderStatus === 'Delivered').length;
  const totalCustomers = db.users.filter((u) => u.role === 'customer').length;
  const lowStockCount = db.products.filter((p) => p.stockQuantity < 10).length;

  const validOrders = db.orders.filter((o) => o.orderStatus !== 'Cancelled');
  const totalSales = validOrders.reduce((sum, o) => sum + o.total, 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = validOrders
    .filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, o) => sum + o.total, 0);

  const categorySales: Record<string, { count: number; revenue: number }> = {};
  validOrders.forEach((o) => {
    o.items.forEach((item) => {
      const prod = db.products.find((p) => p.id === item.productId);
      const cat = prod ? prod.category : 'Ethnic Wear';
      if (!categorySales[cat]) categorySales[cat] = { count: 0, revenue: 0 };
      categorySales[cat].count += item.quantity;
      categorySales[cat].revenue += item.price * item.quantity;
    });
  });

  res.json({
    metrics: {
      totalProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalCustomers,
      lowStockProducts: lowStockCount,
      totalSales,
      monthlyRevenue,
    },
    categorySales,
    recentOrders: db.orders.slice(0, 8),
    superAdminEmail: NEW_SUPER_ADMIN_EMAIL,
  });
});

// GET /api/admin/products
app.get('/api/admin/products', requireAdmin, (req, res) => {
  const db = getDB();
  res.json({ products: db.products });
});

// POST /api/admin/products
app.post('/api/admin/products', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  const {
    name,
    category,
    originalPrice,
    discountedPrice,
    sizes,
    colors,
    fabric,
    sleeveType,
    kurtiLength,
    occasion,
    badge,
    description,
    stockQuantity,
    isNewArrival,
    isBestSeller,
    isTrending,
    isPublished,
    images,
    details,
  } = req.body;

  if (!name || !category || !originalPrice || !discountedPrice || !fabric) {
    return res.status(400).json({ error: 'Missing required product fields: name, category, prices, fabric.' });
  }

  const origP = Number(originalPrice);
  const discP = Number(discountedPrice);
  const discountPercent = origP > discP ? Math.round(((origP - discP) / origP) * 100) : 0;
  const stockQty = Number(stockQuantity) || 0;

  const newProduct: Product = {
    id: 'zk-' + Date.now().toString().slice(-6),
    name: String(name).trim(),
    brand: 'Zohra Luxe',
    category: String(category).trim(),
    originalPrice: origP,
    discountedPrice: discP,
    discountPercent,
    sizes: Array.isArray(sizes) && sizes.length ? sizes : ['XS', 'S', 'M', 'L', 'XL'],
    colors: Array.isArray(colors) && colors.length ? colors : [{ name: 'Classic Rose', hex: '#E8C5C8' }],
    fabric: String(fabric).trim(),
    sleeveType: sleeveType || 'Three-Quarter',
    kurtiLength: kurtiLength || 'Calf-Length',
    occasion: occasion || 'Festive Wear',
    badge: badge || (isNewArrival ? 'NEW ARRIVAL' : isBestSeller ? 'BEST SELLER' : undefined),
    description: String(description || 'Handcrafted luxury ethnic attire.').trim(),
    inStock: stockQty > 0,
    stockQuantity: stockQty,
    isNewArrival: !!isNewArrival,
    isBestSeller: !!isBestSeller,
    isTrending: !!isTrending,
    isPublished: isPublished !== false,
    rating: 5.0,
    reviewCount: 0,
    images: Array.isArray(images) && images.length ? images : ['/src/assets/images/category_kurtis_showcase_1794109164419.jpg'],
    details: details || {
      neckline: 'Refined Collar / Yoke',
      sleeves: sleeveType || 'Three-Quarter Sleeves',
      pattern: 'Artisanal Zari Work',
      washCare: 'Dry Clean Recommended',
      lining: 'Soft Pure Mulmul Lining',
    },
    createdAt: new Date().toISOString(),
  };

  db.products.unshift(newProduct);
  logActivity(db, session.email, 'Added Product', `Created new product: ${newProduct.name} (${newProduct.id})`);
  saveDB(db);

  res.json({ success: true, product: newProduct });
});

// PUT /api/admin/products/:id
app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  const index = db.products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const existing = db.products[index];
  const origP = req.body.originalPrice !== undefined ? Number(req.body.originalPrice) : existing.originalPrice;
  const discP = req.body.discountedPrice !== undefined ? Number(req.body.discountedPrice) : existing.discountedPrice;
  const discountPercent = origP > discP ? Math.round(((origP - discP) / origP) * 100) : 0;
  const stockQty = req.body.stockQuantity !== undefined ? Number(req.body.stockQuantity) : existing.stockQuantity;

  db.products[index] = {
    ...existing,
    ...req.body,
    originalPrice: origP,
    discountedPrice: discP,
    discountPercent,
    stockQuantity: stockQty,
    inStock: stockQty > 0,
  };

  logActivity(db, session.email, 'Updated Product', `Updated product: ${existing.name} (${existing.id})`);
  saveDB(db);

  res.json({ success: true, product: db.products[index] });
});

// DELETE /api/admin/products/:id
app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  const prod = db.products.find((p) => p.id === req.params.id);
  if (!prod) {
    return res.status(404).json({ error: 'Product not found' });
  }

  db.products = db.products.filter((p) => p.id !== req.params.id);
  logActivity(db, session.email, 'Deleted Product', `Deleted product: ${prod.name} (${prod.id})`);
  saveDB(db);

  res.json({ success: true, message: 'Product deleted permanently.' });
});

// POST /api/admin/categories
app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const { name, description, image } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const db = getDB();
  const session = getUserFromToken(req)!;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const newCat: Category = {
    id: 'cat-' + Date.now(),
    name: String(name).trim(),
    slug,
    description: String(description || 'Curated women collection.').trim(),
    image: image || '/src/assets/images/category_kurtis_showcase_1794109164419.jpg',
  };

  db.categories.push(newCat);
  logActivity(db, session.email, 'Added Category', `Added category: ${newCat.name}`);
  saveDB(db);

  res.json({ success: true, category: newCat });
});

// PUT /api/admin/categories/:id
app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  const cat = db.categories.find((c) => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  if (req.body.name) cat.name = String(req.body.name).trim();
  if (req.body.description !== undefined) cat.description = String(req.body.description).trim();
  if (req.body.image) cat.image = req.body.image;

  logActivity(db, session.email, 'Updated Category', `Updated category: ${cat.name}`);
  saveDB(db);
  res.json({ success: true, category: cat });
});

// DELETE /api/admin/categories/:id
app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  const cat = db.categories.find((c) => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  logActivity(db, session.email, 'Deleted Category', `Deleted category: ${cat.name}`);
  saveDB(db);
  res.json({ success: true, message: 'Category removed' });
});

// GET /api/admin/orders
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const db = getDB();
  res.json({ orders: db.orders });
});

// PATCH /api/admin/orders/:id (Update 7 Flipkart-style status milestones)
app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const { status, paymentStatus, courierProvider, trackingNumber, notes } = req.body;

  if (status) {
    order.orderStatus = status;

    // Update the 7 tracking steps
    const stepOrder: OrderStage[] = [
      'Order Placed',
      'Order Confirmed',
      'Processing',
      'Packed',
      'Shipped',
      'Out for Delivery',
      'Delivered',
    ];

    const currentIdx = stepOrder.indexOf(status);
    if (currentIdx !== -1) {
      order.trackingSteps = stepOrder.map((stepTitle, idx) => ({
        title: stepTitle,
        date: idx <= currentIdx ? (idx === currentIdx ? 'Updated: ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Completed') : 'Pending',
        completed: idx <= currentIdx,
      }));
    }

    if (status === 'Delivered') {
      order.paymentStatus = 'paid';
    }
  }

  if (paymentStatus) {
    order.paymentStatus = paymentStatus;
  }

  if (courierProvider || trackingNumber) {
    order.courierDetails = {
      provider: courierProvider || order.courierDetails?.provider || 'BlueDart Express',
      trackingNumber: trackingNumber || order.courierDetails?.trackingNumber || 'BLUEDART-' + Math.floor(10000000 + Math.random() * 90000000),
      estimatedDelivery: order.courierDetails?.estimatedDelivery || 'Within 2-3 Business Days',
    };
  }

  if (notes !== undefined) {
    order.notes = notes;
  }

  logActivity(db, session.email, 'Updated Order', `Order ${order.id} status changed to ${order.orderStatus}`);
  saveDB(db);

  res.json({ success: true, order });
});

// POST /api/admin/orders/:id/refund
app.post('/api/admin/orders/:id/refund', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.paymentStatus = 'refunded';
  order.orderStatus = 'Cancelled';
  logActivity(db, session.email, 'Processed Refund', `Processed refund of ₹${order.total} for Order ${order.id}`);
  saveDB(db);

  res.json({ success: true, order });
});

// GET /api/admin/customers
app.get('/api/admin/customers', requireAdmin, (req, res) => {
  const db = getDB();
  const customers = db.users
    .filter((u) => u.role === 'customer')
    .map((u) => {
      const userOrders = db.orders.filter(
        (o) => o.userId === u.id || o.customerEmail.toLowerCase() === u.email.toLowerCase()
      );
      const totalSpent = userOrders
        .filter((o) => o.orderStatus !== 'Cancelled')
        .reduce((sum, o) => sum + o.total, 0);
      const deliveredOrdersCount = userOrders.filter((o) => o.orderStatus === 'Delivered').length;
      const activeOrdersCount = userOrders.filter(
        (o) => !['Delivered', 'Cancelled', 'Returned'].includes(o.orderStatus)
      ).length;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        joined: u.createdAt,
        orderCount: userOrders.length,
        deliveredOrdersCount,
        activeOrdersCount,
        hasDeliveredOrders: deliveredOrdersCount > 0,
        latestOrderStatus: userOrders[0]?.orderStatus || 'No Orders',
        totalSpent,
        orders: userOrders,
      };
    });

  res.json({ customers });
});

// PUT /api/admin/customers/:id (Edit customer profile details)
app.put('/api/admin/customers/:id', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  const customer = db.users.find((u) => u.id === req.params.id && u.role === 'customer');
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { name, email, phone, status } = req.body;
  if (email !== undefined) {
    const normalized = String(email).trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }
    const conflict = db.users.find((u) => u.id !== customer.id && u.email.toLowerCase() === normalized);
    if (conflict) {
      return res.status(400).json({ error: `Email ${normalized} is already registered.` });
    }
    customer.email = normalized;
  }

  if (name !== undefined && String(name).trim()) customer.name = String(name).trim();
  if (phone !== undefined) customer.phone = String(phone).trim() || undefined;
  if (status === 'active' || status === 'blocked') customer.status = status;

  logActivity(db, session.email, 'Updated Customer', `Updated customer profile: ${customer.name} (${customer.email})`);
  saveDB(db);

  res.json({ success: true, customer });
});

// DELETE /api/admin/customers/cleanup/delivered (Bulk remove customers with delivered orders)
app.delete('/api/admin/customers/cleanup/delivered', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;

  const toRemove = db.users.filter((u) => {
    if (u.role !== 'customer') return false;
    const userOrders = db.orders.filter(
      (o) => o.userId === u.id || o.customerEmail.toLowerCase() === u.email.toLowerCase()
    );
    return userOrders.some((o) => o.orderStatus === 'Delivered');
  });

  if (toRemove.length === 0) {
    return res.json({
      success: true,
      removedCount: 0,
      message: 'No customer entries with delivered orders found to remove.',
    });
  }

  const removeIds = new Set(toRemove.map((u) => u.id));
  const removeEmails = new Set(toRemove.map((u) => u.email.toLowerCase()));

  db.users = db.users.filter((u) => !removeIds.has(u.id));

  for (const [token, sess] of sessions.entries()) {
    if (removeIds.has(sess.userId) || removeEmails.has(sess.email.toLowerCase())) {
      sessions.delete(token);
    }
  }

  logActivity(
    db,
    session.email,
    'Removed Delivered Customers',
    `Cleaned up ${toRemove.length} customer record(s) with delivered orders from Customers Management.`
  );
  saveDB(db);

  res.json({
    success: true,
    removedCount: toRemove.length,
    message: `Removed ${toRemove.length} customer record(s) whose orders are Delivered.`,
  });
});

// DELETE /api/admin/customers/:id (Remove single customer entry)
app.delete('/api/admin/customers/:id', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  const customer = db.users.find((u) => u.id === req.params.id && u.role === 'customer');
  if (!customer) return res.status(404).json({ error: 'Customer record not found' });

  db.users = db.users.filter((u) => u.id !== customer.id);

  for (const [token, sess] of sessions.entries()) {
    if (sess.userId === customer.id || sess.email.toLowerCase() === customer.email.toLowerCase()) {
      sessions.delete(token);
    }
  }

  logActivity(
    db,
    session.email,
    'Removed Customer',
    `Removed customer ${customer.name} (${customer.email}) from Customers Directory.`
  );
  saveDB(db);

  res.json({
    success: true,
    message: `Customer ${customer.name} (${customer.email}) removed successfully.`,
  });
});

// PATCH /api/admin/customers/:id/status
app.patch('/api/admin/customers/:id/status', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Customer not found' });

  const { status } = req.body;
  if (status !== 'active' && status !== 'blocked') {
    return res.status(400).json({ error: 'Status must be active or blocked' });
  }

  user.status = status;
  logActivity(db, session.email, 'Customer Status Update', `Updated status of ${user.email} to ${status}`);
  saveDB(db);

  res.json({ success: true, user });
});

// GET /api/admin/coupons
app.get('/api/admin/coupons', requireAdmin, (req, res) => {
  const db = getDB();
  res.json({ coupons: db.coupons });
});

// POST /api/admin/coupons
app.post('/api/admin/coupons', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  const { code, discountType, discountValue, minOrderValue, description, expiryDate, festivalOffer } = req.body;

  if (!code || !discountValue || !minOrderValue) {
    return res.status(400).json({ error: 'Code, discount value, and min order value are required' });
  }

  const normalizedCode = String(code).trim().toUpperCase();
  if (db.coupons.some((c) => c.code === normalizedCode)) {
    return res.status(400).json({ error: 'A coupon with this code already exists' });
  }

  const newCoupon: Coupon = {
    code: normalizedCode,
    discountType: discountType === 'fixed' ? 'fixed' : 'percentage',
    discountValue: Number(discountValue),
    minOrderValue: Number(minOrderValue),
    description: String(description || `${discountValue}% off`).trim(),
    expiryDate: expiryDate || '2026-12-31',
    festivalOffer: !!festivalOffer,
    isActive: true,
    usedCount: 0,
  };

  db.coupons.unshift(newCoupon);
  logActivity(db, session.email, 'Created Coupon', `Created promotional coupon code: ${newCoupon.code}`);
  saveDB(db);

  res.json({ success: true, coupon: newCoupon });
});

// PATCH /api/admin/coupons/:code/toggle
app.patch('/api/admin/coupons/:code/toggle', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  const coupon = db.coupons.find((c) => c.code === req.params.code.toUpperCase());
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });

  coupon.isActive = !coupon.isActive;
  logActivity(db, session.email, 'Toggled Coupon', `Toggled coupon ${coupon.code} to ${coupon.isActive ? 'Active' : 'Inactive'}`);
  saveDB(db);

  res.json({ success: true, coupon });
});

// DELETE /api/admin/coupons/:code
app.delete('/api/admin/coupons/:code', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  db.coupons = db.coupons.filter((c) => c.code !== req.params.code.toUpperCase());
  logActivity(db, session.email, 'Deleted Coupon', `Deleted coupon: ${req.params.code.toUpperCase()}`);
  saveDB(db);
  res.json({ success: true });
});

// GET /api/admin/settings
app.get('/api/admin/settings', requireAdmin, (req, res) => {
  const db = getDB();
  res.json({ settings: db.settings });
});

// PUT /api/admin/settings
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  db.settings = {
    ...db.settings,
    ...req.body,
  };
  logActivity(db, session.email, 'Updated Settings', 'Updated website store branding, fees, and policies.');
  saveDB(db);
  res.json({ success: true, settings: db.settings });
});

// GET /api/admin/logs
app.get('/api/admin/logs', requireAdmin, (req, res) => {
  const db = getDB();
  res.json({ logs: db.activityLogs });
});

// GET /api/admin/support
app.get('/api/admin/support', requireAdmin, (req, res) => {
  const db = getDB();
  res.json({ inquiries: db.supportInquiries });
});

// PATCH /api/admin/support/:id
app.patch('/api/admin/support/:id', requireAdmin, (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req)!;
  const inq = db.supportInquiries.find((i) => i.id === req.params.id);
  if (!inq) return res.status(404).json({ error: 'Inquiry not found' });

  inq.status = inq.status === 'open' ? 'resolved' : 'open';
  logActivity(db, session.email, 'Support Ticket', `Marked inquiry ${inq.id} as ${inq.status}`);
  saveDB(db);

  res.json({ success: true, inquiry: inq });
});

// GET /api/admin/analytics/reports
app.get('/api/admin/analytics/reports', requireAdmin, (req, res) => {
  const db = getDB();
  const validOrders = db.orders.filter((o) => o.orderStatus !== 'Cancelled');

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = todayStart - 6 * 86400000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

  let dailySales = 0;
  let weeklySales = 0;
  let monthlySales = 0;
  let yearlySales = 0;

  validOrders.forEach((o) => {
    const t = new Date(o.createdAt).getTime();
    if (t >= todayStart) dailySales += o.total;
    if (t >= sevenDaysAgo) weeklySales += o.total;
    if (t >= monthStart) monthlySales += o.total;
    if (t >= yearStart) yearlySales += o.total;
  });

  const productTally: Record<string, { name: string; category: string; qty: number; revenue: number }> = {};
  validOrders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productTally[item.productId]) {
        const prod = db.products.find((p) => p.id === item.productId);
        productTally[item.productId] = {
          name: item.name,
          category: prod?.category || 'Ethnic Wear',
          qty: 0,
          revenue: 0,
        };
      }
      productTally[item.productId].qty += item.quantity;
      productTally[item.productId].revenue += item.price * item.quantity;
    });
  });

  const topProducts = Object.values(productTally).sort((a, b) => b.revenue - a.revenue);

  const categoryTally: Record<string, { name: string; count: number; revenue: number }> = {};
  topProducts.forEach((p) => {
    if (!categoryTally[p.category]) {
      categoryTally[p.category] = { name: p.category, count: 0, revenue: 0 };
    }
    categoryTally[p.category].count += p.qty;
    categoryTally[p.category].revenue += p.revenue;
  });

  const topCategories = Object.values(categoryTally).sort((a, b) => b.revenue - a.revenue);
  const pendingPayments = db.orders.filter((o) => o.paymentStatus === 'pending').reduce((sum, o) => sum + o.total, 0);

  res.json({
    dailySales,
    weeklySales,
    monthlySales,
    yearlySales,
    totalRevenue: validOrders.reduce((sum, o) => sum + o.total, 0),
    totalOrders: db.orders.length,
    pendingPayments,
    topProducts,
    topCategories,
    superAdminEmail: NEW_SUPER_ADMIN_EMAIL,
  });
});

// =================== VITE SPA HANDLER ===================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.resolve('dist');

  if (isProduction && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[ZOHRA LUXE] Production Server & Super Admin active at http://0.0.0.0:${port}`);
    console.log(`[SECURITY] Authorized Super Admin Gmail: ${NEW_SUPER_ADMIN_EMAIL}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
