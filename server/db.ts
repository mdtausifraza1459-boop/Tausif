import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  AbandonedCartRecord,
  ActivityLog,
  AdminWidgetPref,
  BackupRecord,
  BundleOffer,
  Category,
  Coupon,
  DigitalGiftCard,
  ExpenseRecord,
  FlashSaleRule,
  LookbookCollection,
  MarketingCampaign,
  NotificationItem,
  Order,
  OrderComplaint,
  PaymentTransaction,
  Product,
  ProductQuestion,
  ReturnExchangeRequest,
  Review,
  ScheduledReportConfig,
  StockMovement,
  SupportInquiry,
  User,
  VipTierConfig,
  WebsiteSettings,
  WholesaleAccount,
  WholesaleOrderRequest,
} from '../src/types.ts';
import { sanitizeAuditPayload } from './security.ts';

export const DATA_DIR = path.resolve('data');
export const DB_FILE = path.join(DATA_DIR, 'db.json');
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

export let SUPER_ADMIN_EMAIL = (
  process.env.NEW_SUPER_ADMIN_EMAIL ||
  process.env.OWNER_ADMIN_EMAIL ||
  'mdtausifraza1459@gmail.com'
)
  .trim()
  .toLowerCase();

export function setSuperAdminEmail(next: string) {
  SUPER_ADMIN_EMAIL = next.trim().toLowerCase();
}

export interface InternalUser extends User {
  passwordHash?: string;
}

export interface DatabaseSchema {
  products: Product[];
  categories: Category[];
  orders: Order[];
  users: InternalUser[];
  coupons: Coupon[];
  reviews: Review[];
  settings: WebsiteSettings;
  activityLogs: ActivityLog[];
  supportInquiries: SupportInquiry[];
  stockMovements: StockMovement[];
  paymentTransactions: PaymentTransaction[];
  returnRequests: ReturnExchangeRequest[];
  wholesaleAccounts: WholesaleAccount[];
  wholesaleOrders: WholesaleOrderRequest[];
  notifications: NotificationItem[];
  expenses: ExpenseRecord[];
  backups: BackupRecord[];
  lookbooks: LookbookCollection[];
  flashSales: FlashSaleRule[];
  bundles: BundleOffer[];
  giftCards: DigitalGiftCard[];
  vipTiers: VipTierConfig[];
  campaigns: MarketingCampaign[];
  productQuestions: ProductQuestion[];
  complaints: OrderComplaint[];
  abandonedCarts: AbandonedCartRecord[];
  scheduledReports: ScheduledReportConfig[];
  adminWidgetPrefs: Record<string, AdminWidgetPref[]>;
}

export const INITIAL_CATEGORIES: Category[] = [
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

export const INITIAL_SETTINGS: WebsiteSettings = {
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
  returnPolicyText:
    'We offer an easy 7-day return and exchange policy from the date of delivery. Items must be unworn, unwashed with original artisanal tags intact.',
  shippingPolicyText:
    'Orders are inspected and dispatched within 24–48 business hours. Complimentary express delivery is available on prepaid and COD orders over ₹1,499 across serviceable Indian PIN codes.',
  aboutUsText:
    'Founded with a dedication to heirloom Indian needlework and effortless modern silhouettes, Zohra Luxe crafts pure Chanderi, mulmul cotton, and silk ethnic wear for discerning shoppers and boutique retailers.',
  contactInfoText:
    'Customer Concierge & Wholesale Desk: +91 9310078735 (Mon–Sat, 10 AM – 7 PM IST) · Email: care@zohraluxe.com',
  privacyPolicyText:
    'Your privacy is paramount to us. All personal data, delivery addresses, and authentication credentials are protected with industry-standard encryption and strict role-based controls.',
  termsConditionsText:
    'Welcome to Zohra Luxe. All garments are crafted with authentic fabrics and artisanal embellishments. Variations in handloom weave or dye lots reflect genuine craftsmanship.',
  heroHeadline: 'Discover Your Style, Celebrate Your Elegance',
  heroSubtitle: "Explore the latest collection of Kurtis, Short Kurtis, and Women's Luxury Ethnic Wear.",
  heroImage: '/src/assets/images/hero_ethnic_fashion_1794109163430.jpg',
  heroButtonText: 'Shop New Arrivals',
  cmsBanners: [
    {
      id: 'ban-1',
      title: 'Festive Zardozi Edit 2026',
      subtitle: 'Handwoven Chanderi silk anarkalis & coordinated sets crafted for celebrations.',
      image: '/src/assets/images/category_anarkali_festive_1794109164992.jpg',
      ctaText: 'Explore Festive Wear',
      targetCategory: 'Festive Wear',
      active: true,
    },
    {
      id: 'ban-2',
      title: 'Everyday Mulmul & Cotton Craft',
      subtitle: 'Breathable hand-block kurtis tailored for office and effortless daily wear.',
      image: '/src/assets/images/category_kurtis_showcase_1794109164419.jpg',
      ctaText: 'Shop Cotton Kurtis',
      targetCategory: 'Cotton Kurtis',
      active: true,
    },
  ],
  faqItems: [
    {
      id: 'faq-1',
      question: 'How do I choose the right size?',
      answer: 'Use our Women Size Guide or Smart Fit Finder on any product page. Our kurtis allow a 2-inch tailoring margin for comfortable drape.',
    },
    {
      id: 'faq-2',
      question: 'How do returns and size exchanges work?',
      answer: 'Eligible unworn items with tags intact can be requested for return or size exchange within 7 days of delivery through Track Order.',
    },
    {
      id: 'faq-3',
      question: 'How can boutiques place wholesale orders?',
      answer: 'Open the Wholesale B2B Portal to submit your business details for approval, or call +91 9310078735 directly.',
    },
  ],
  maintenanceMode: false,
  sessionTimeoutHours: 168,
  backupRetentionCount: 15,
  socialLinks: {
    instagram: 'https://instagram.com/zohraluxe',
    facebook: 'https://facebook.com/zohraluxe',
    pinterest: 'https://pinterest.com/zohraluxe',
  },
};

export function distributeVariantStock(sizes: string[], colors: { name: string }[], totalQty: number): Record<string, number> {
  const safeSizes = sizes.length ? sizes : ['M'];
  const safeColors = colors.length ? colors : [{ name: 'Standard' }];
  const keys: string[] = [];
  for (const s of safeSizes) {
    for (const c of safeColors) {
      keys.push(`${s}::${c.name}`);
    }
  }
  const matrix: Record<string, number> = {};
  keys.forEach((k) => (matrix[k] = 0));
  if (totalQty <= 0 || keys.length === 0) return matrix;

  const base = Math.floor(totalQty / keys.length);
  let rem = totalQty % keys.length;
  for (const k of keys) {
    matrix[k] = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
  }
  return matrix;
}

export function recalcProductStock(product: Product): number {
  if (product.variantStock && Object.keys(product.variantStock).length > 0) {
    const sum = Object.values(product.variantStock).reduce((s, n) => s + Math.max(0, Number(n) || 0), 0);
    product.stockQuantity = sum;
    product.inStock = sum > 0;
    return sum;
  }
  product.stockQuantity = Math.max(0, Number(product.stockQuantity) || 0);
  product.inStock = product.stockQuantity > 0;
  return product.stockQuantity;
}

export function isProductVisibleToPublic(product: Product): boolean {
  if (product.isPublished === false) return false;
  if (product.scheduledPublishAt) {
    const publishTime = new Date(product.scheduledPublishAt).getTime();
    if (!isNaN(publishTime) && publishTime > Date.now()) return false;
  }
  return true;
}

export const INITIAL_VIP_TIERS: VipTierConfig[] = [
  {
    id: 'tier-pearl',
    name: 'Pearl Member',
    minLifetimeSpend: 0,
    minOrders: 0,
    discountPercent: 0,
    freeShippingAlways: false,
    pointsMultiplier: 1,
    earlyAccessFlashSales: false,
    badgeColor: '#63615C',
    perks: ['Earn 1 point per ₹100 spent', 'Saved wishlist & multi-address book', 'Early lookbook previews'],
  },
  {
    id: 'tier-emerald',
    name: 'Emerald Circle',
    minLifetimeSpend: 8000,
    minOrders: 2,
    discountPercent: 5,
    freeShippingAlways: true,
    pointsMultiplier: 1.5,
    earlyAccessFlashSales: true,
    badgeColor: '#164E3F',
    perks: ['Extra 5% member privilege at checkout', 'Complimentary Express Shipping on every order', '1.5x Loyalty Points multiplier', '2-hour early access to Flash Sales'],
  },
  {
    id: 'tier-royal',
    name: 'Royal Zohra VIP',
    minLifetimeSpend: 20000,
    minOrders: 4,
    discountPercent: 10,
    freeShippingAlways: true,
    pointsMultiplier: 2,
    earlyAccessFlashSales: true,
    badgeColor: '#8E6D3B',
    perks: ['Extra 10% Royal VIP privilege at checkout', 'Complimentary Express Shipping on every order', '2x Loyalty Points multiplier', 'Priority Stylist Escalation & Flash Sale early access'],
  },
];

export const INITIAL_LOOKBOOKS: LookbookCollection[] = [
  {
    id: 'lb-wedding-mehfil',
    title: 'The Royal Wedding & Sangeet Edit',
    occasion: 'Wedding',
    subtitle: 'Hand-embroidered Chanderi & Katan Silk ensembles styled with heirloom Banarasi weaves.',
    editorialNote: 'Pair flowing Anarkali silhouettes with a handwoven Katan Zari dupatta and antique kundan jhumkas for effortless evening poise.',
    image: '/src/assets/images/category_anarkali_festive_1794109164992.jpg',
    productIds: ['zk-101', 'zk-108', 'zk-109'],
    bundleDiscountPercent: 8,
    active: true,
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'lb-eid-crescent',
    title: 'Crescent Eid & Festive Soirée',
    occasion: 'Eid',
    subtitle: 'Rich wine brocade, silver Tilla embroidery, and luminous silk borders crafted for celebration.',
    editorialNote: 'Designed for candlelit Eid gatherings—balance flared wine silk with delicate silver tilla work and pearl chandbalis.',
    image: '/src/assets/images/hero_ethnic_fashion_1794109163430.jpg',
    productIds: ['zk-103', 'zk-106', 'zk-109'],
    bundleDiscountPercent: 8,
    active: true,
    createdAt: '2026-01-12T10:00:00.000Z',
  },
  {
    id: 'lb-modern-office',
    title: 'Atelier Boardroom & Office Grace',
    occasion: 'Office',
    subtitle: 'Breathable mulmul, Cambric floral prints, and structured straight-cut silk silhouettes.',
    editorialNote: 'Tailored straight hemlines in sage mint and organic cotton deliver crisp drape from morning meetings to evening dinners.',
    image: '/src/assets/images/category_kurtis_showcase_1794109164419.jpg',
    productIds: ['zk-102', 'zk-107', 'zk-110'],
    bundleDiscountPercent: 5,
    active: true,
    createdAt: '2026-01-14T10:00:00.000Z',
  },
  {
    id: 'lb-everyday-pret',
    title: 'Effortless Pret & Casual Lounge',
    occasion: 'Casual',
    subtitle: 'Airy lilac co-ord sets and handloom short kurtis designed for sunlit afternoons.',
    editorialNote: 'Style hip-length mulmul kurtis or matching lilac co-ords with kolhapuri flats and minimal silver studs.',
    image: '/src/assets/images/category_coord_tunics_1794109164576.jpg',
    productIds: ['zk-104', 'zk-105', 'zk-110'],
    bundleDiscountPercent: 5,
    active: true,
    createdAt: '2026-01-16T10:00:00.000Z',
  },
];

export const INITIAL_BUNDLES: BundleOffer[] = [
  {
    id: 'bnd-festive-duo',
    title: 'Complete Ethnic Duo (Anarkali + Silk Dupatta)',
    description: 'Pair any Anarkali or Kurti Set with the Banarasi Zari Silk Dupatta to unlock ₹350 instant combo savings.',
    requiredProductIds: ['zk-101', 'zk-109'],
    minItems: 2,
    discountType: 'fixed',
    discountValue: 350,
    active: true,
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'bnd-wardrobe-trio',
    title: 'Curated Wardrobe Trio (3+ Styles)',
    description: 'Enjoy 7% combo savings automatically when styling 3 or more Zohra Luxe pieces together.',
    requiredProductIds: [],
    minItems: 3,
    discountType: 'percentage',
    discountValue: 7,
    active: true,
    createdAt: '2026-01-16T10:00:00.000Z',
  },
];

export const DEFAULT_MEASUREMENTS: Record<string, { bustIn: number; waistIn: number; hipIn: number; lengthIn: number }> = {
  XS: { bustIn: 34, waistIn: 28, hipIn: 37, lengthIn: 44 },
  S: { bustIn: 36, waistIn: 30, hipIn: 39, lengthIn: 45 },
  M: { bustIn: 38, waistIn: 32, hipIn: 41, lengthIn: 46 },
  L: { bustIn: 40, waistIn: 34, hipIn: 43, lengthIn: 46 },
  XL: { bustIn: 42, waistIn: 36, hipIn: 45, lengthIn: 47 },
  XXL: { bustIn: 44, waistIn: 38, hipIn: 47, lengthIn: 47 },
  'Free Size': { bustIn: 40, waistIn: 34, hipIn: 44, lengthIn: 45 },
};

export const DEFAULT_ADMIN_WIDGETS: AdminWidgetPref[] = [
  { id: 'w-revenue', label: 'Revenue & P&L Summary', visible: true, order: 1 },
  { id: 'w-alerts', label: 'Automated Business Alerts', visible: true, order: 2 },
  { id: 'w-stock', label: 'Low Stock & Demand Velocity', visible: true, order: 3 },
  { id: 'w-orders', label: 'Live Orders Pipeline', visible: true, order: 4 },
  { id: 'w-retention', label: 'Customer Retention & VIP Snapshot', visible: true, order: 5 },
  { id: 'w-forecast', label: 'Sales Forecast Estimate', visible: true, order: 6 },
];

function enrichProductFashionDefaults(prod: Product): boolean {
  let changed = false;
  const cat = (prod.category || '').toLowerCase();
  const fab = (prod.fabric || '').toLowerCase();

  if (!prod.occasion) {
    if (cat.includes('anarkali')) prod.occasion = 'Wedding';
    else if (cat.includes('festive') || cat.includes('kurti set') || cat.includes('dupatta')) prod.occasion = 'Festive';
    else if (cat.includes('party') || cat.includes('long')) prod.occasion = 'Eid';
    else if (cat.includes('co-ord')) prod.occasion = 'Party';
    else if (cat.includes('straight')) prod.occasion = 'Office';
    else if (cat.includes('short')) prod.occasion = 'Daily Wear';
    else prod.occasion = 'Casual';
    changed = true;
  }

  if (!prod.accessoryType) {
    if (cat.includes('dupatta')) prod.accessoryType = 'dupatta';
    else if (cat.includes('anarkali')) prod.accessoryType = 'anarkali';
    else if (cat.includes('co-ord')) prod.accessoryType = 'coord';
    else if (cat.includes('tunic')) prod.accessoryType = 'tunic';
    else prod.accessoryType = 'kurti';
    changed = true;
  }

  if (!prod.measurements) {
    const m: Record<string, { bustIn: number; waistIn: number; hipIn: number; lengthIn: number }> = {};
    for (const s of prod.sizes || ['S', 'M', 'L', 'XL']) {
      m[s] = DEFAULT_MEASUREMENTS[s] || DEFAULT_MEASUREMENTS['M'];
    }
    prod.measurements = m;
    changed = true;
  }

  if (!prod.fabricCareGuide) {
    const isSilkOrRich =
      fab.includes('silk') || fab.includes('zari') || fab.includes('brocade') || fab.includes('georgette') || fab.includes('organza');
    prod.fabricCareGuide = {
      origin: isSilkOrRich ? 'Benaras & Jaipur Artisan Looms' : 'Jaipur & Sanganer Handloom Clusters',
      weave: prod.fabric || 'Fine Handcrafted Weave',
      washMethod: isSilkOrRich
        ? 'Dry clean only for first 3 washes; spot clean gently with cold water.'
        : 'Gentle cold hand wash separately using mild pH-neutral liquid detergent.',
      ironing: isSilkOrRich
        ? 'Low-heat steam iron inside out with a protective muslin cloth.'
        : 'Medium steam iron while slightly damp inside out.',
      storage: isSilkOrRich
        ? 'Store folded inside breathable unbleached muslin bags away from direct sunlight.'
        : 'Hang on padded wooden hangers or fold neatly in a dry wardrobe.',
    };
    changed = true;
  }

  if (!Array.isArray(prod.completeTheLookIds) || prod.completeTheLookIds.length === 0) {
    if (prod.id === 'zk-101') prod.completeTheLookIds = ['zk-109', 'zk-108', 'zk-102'];
    else if (prod.id === 'zk-103') prod.completeTheLookIds = ['zk-109', 'zk-106', 'zk-101'];
    else if (prod.id === 'zk-109') prod.completeTheLookIds = ['zk-101', 'zk-103', 'zk-108'];
    else if (prod.id === 'zk-105' || prod.id === 'zk-110') prod.completeTheLookIds = ['zk-104', 'zk-107', 'zk-102'];
    else prod.completeTheLookIds = ['zk-109', 'zk-104', 'zk-107'].filter((x) => x !== prod.id);
    changed = true;
  }

  if (!prod.stylingNotes) {
    const isFestive = ['Wedding', 'Festive', 'Eid', 'Party'].includes(prod.occasion || '');
    prod.stylingNotes = isFestive
      ? {
          jewellery: 'Antique gold chandbalis or kundan choker',
          footwear: 'Embroidered zari juttis or champagne block heels',
          bag: 'Potli clutch with pearl & brass tassels',
          dupatta: 'Pair with a Katan Zari or sheer organza scalloped dupatta',
        }
      : {
          jewellery: 'Oxidised silver jhumkas or minimalist pearl studs',
          footwear: 'Handcrafted tan leather kolhapuris or nude mules',
          bag: 'Structured canvas & leather sling tote',
          dupatta: 'Style solo or drape a lightweight cotton kota dupatta',
        };
    changed = true;
  }

  return changed;
}

let migrationBackupDone = false;

export function getDB(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const freshDB: DatabaseSchema = {
      products: [],
      categories: INITIAL_CATEGORIES,
      orders: [],
      users: [
        {
          id: 'user-owner-super-admin',
          name: 'Primary Store Owner',
          email: SUPER_ADMIN_EMAIL,
          role: 'admin',
          isSuperAdmin: true,
          adminRole: 'primary_owner',
          status: 'active',
          addresses: [],
          wishlist: [],
          createdAt: new Date().toISOString(),
        },
      ],
      coupons: [],
      reviews: [],
      settings: INITIAL_SETTINGS,
      activityLogs: [
        {
          id: 'log-init',
          timestamp: new Date().toISOString(),
          adminEmail: SUPER_ADMIN_EMAIL,
          action: 'System Security Initialized',
          result: 'success',
          details: `Primary owner initialized for ${SUPER_ADMIN_EMAIL}.`,
        },
      ],
      supportInquiries: [],
      stockMovements: [],
      paymentTransactions: [],
      returnRequests: [],
      wholesaleAccounts: [],
      wholesaleOrders: [],
      notifications: [],
      expenses: [],
      backups: [],
      lookbooks: INITIAL_LOOKBOOKS,
      flashSales: [],
      bundles: INITIAL_BUNDLES,
      giftCards: [],
      vipTiers: INITIAL_VIP_TIERS,
      campaigns: [],
      productQuestions: [],
      complaints: [],
      abandonedCarts: [],
      scheduledReports: [],
      adminWidgetPrefs: {},
    };
    saveDB(freshDB);
    return freshDB;
  }

  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const parsed: any = JSON.parse(raw);

  // Preserve ALL existing records cleanly while normalizing missing fields
  if (!Array.isArray(parsed.products)) parsed.products = [];
  if (!Array.isArray(parsed.categories)) parsed.categories = INITIAL_CATEGORIES;
  if (!Array.isArray(parsed.orders)) parsed.orders = [];
  if (!Array.isArray(parsed.users)) parsed.users = [];
  if (!Array.isArray(parsed.coupons)) parsed.coupons = [];
  if (!Array.isArray(parsed.reviews)) parsed.reviews = [];
  if (!Array.isArray(parsed.activityLogs)) parsed.activityLogs = [];
  if (!Array.isArray(parsed.supportInquiries)) parsed.supportInquiries = [];
  if (!Array.isArray(parsed.stockMovements)) parsed.stockMovements = [];
  if (!Array.isArray(parsed.paymentTransactions)) parsed.paymentTransactions = [];
  if (!Array.isArray(parsed.returnRequests)) parsed.returnRequests = [];
  if (!Array.isArray(parsed.wholesaleAccounts)) parsed.wholesaleAccounts = [];
  if (!Array.isArray(parsed.wholesaleOrders)) parsed.wholesaleOrders = [];
  if (!Array.isArray(parsed.notifications)) parsed.notifications = [];
  if (!Array.isArray(parsed.expenses)) parsed.expenses = [];
  if (!Array.isArray(parsed.backups)) parsed.backups = [];

  let needsSave = false;

  if (!Array.isArray(parsed.lookbooks)) {
    parsed.lookbooks = INITIAL_LOOKBOOKS;
    needsSave = true;
  }
  if (!Array.isArray(parsed.flashSales)) parsed.flashSales = [];
  if (!Array.isArray(parsed.bundles)) {
    parsed.bundles = INITIAL_BUNDLES;
    needsSave = true;
  }
  if (!Array.isArray(parsed.giftCards)) parsed.giftCards = [];
  if (!Array.isArray(parsed.vipTiers) || parsed.vipTiers.length === 0) {
    parsed.vipTiers = INITIAL_VIP_TIERS;
    needsSave = true;
  }
  if (!Array.isArray(parsed.campaigns)) parsed.campaigns = [];
  if (!Array.isArray(parsed.productQuestions)) parsed.productQuestions = [];
  if (!Array.isArray(parsed.complaints)) parsed.complaints = [];
  if (!Array.isArray(parsed.abandonedCarts)) parsed.abandonedCarts = [];
  if (!Array.isArray(parsed.scheduledReports)) parsed.scheduledReports = [];
  if (!parsed.adminWidgetPrefs || typeof parsed.adminWidgetPrefs !== 'object') {
    parsed.adminWidgetPrefs = {};
  }

  parsed.settings = {
    ...INITIAL_SETTINGS,
    ...(parsed.settings || {}),
    socialLinks: {
      ...INITIAL_SETTINGS.socialLinks,
      ...(parsed.settings?.socialLinks || {}),
    },
    cmsBanners: Array.isArray(parsed.settings?.cmsBanners)
      ? parsed.settings.cmsBanners
      : INITIAL_SETTINGS.cmsBanners,
    faqItems: Array.isArray(parsed.settings?.faqItems)
      ? parsed.settings.faqItems
      : INITIAL_SETTINGS.faqItems,
  };

  // Non-destructive product normalization
  for (const prod of parsed.products as Product[]) {
    if (!prod.sku) {
      prod.sku = `ZL-${prod.id.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
      needsSave = true;
    }
    if (prod.brand === undefined) {
      prod.brand = 'Zohra Luxe';
      needsSave = true;
    }
    if (prod.costPrice === undefined) {
      prod.costPrice = 0; // Explicitly 0 (unset/missing) until owner records real COGS
      needsSave = true;
    }
    if (!prod.variantStock || Object.keys(prod.variantStock).length === 0) {
      prod.variantStock = distributeVariantStock(
        prod.sizes || ['M'],
        prod.colors || [{ name: 'Standard', hex: '#D4AF6A' }],
        Number(prod.stockQuantity) || 0
      );
      needsSave = true;
    }
    if (!Array.isArray(prod.videos)) {
      prod.videos = [];
    }
    if (prod.lowStockThreshold === undefined) {
      prod.lowStockThreshold = 10;
    }
    if (enrichProductFashionDefaults(prod)) {
      needsSave = true;
    }
  }

  // Non-destructive user normalization
  for (const u of parsed.users as InternalUser[]) {
    if (!u.referralCode) {
      u.referralCode = `ZL-${(u.name || 'LUXE').replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'VIP'}${u.id.slice(-4).toUpperCase()}`;
      needsSave = true;
    }
    if (u.loyaltyPoints === undefined) u.loyaltyPoints = 0;
    if (!Array.isArray(u.loyaltyHistory)) u.loyaltyHistory = [];
    if (!Array.isArray(u.addresses)) u.addresses = [];
    if (!Array.isArray(u.wishlist)) u.wishlist = [];
    if (!Array.isArray(u.stockAlerts)) u.stockAlerts = [];
    if (!u.priceDropAlerts) u.priceDropAlerts = {};
    if (u.abandonedCartConsent === undefined) u.abandonedCartConsent = false;
    if (u.marketingConsent === undefined) u.marketingConsent = false;
    if (!Array.isArray(u.recentlyViewedIds)) u.recentlyViewedIds = [];
    if (!Array.isArray(u.savedCart)) u.savedCart = [];
    if (u.role === 'admin' && !u.adminRole) {
      const isOwner = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || !!u.isSuperAdmin;
      u.adminRole = isOwner ? 'primary_owner' : 'store_partner';
      needsSave = true;
    }
  }

  // Ensure Primary Owner record exists & stays superAdmin
  const owner = (parsed.users as InternalUser[]).find(
    (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
  );
  if (!owner) {
    (parsed.users as InternalUser[]).unshift({
      id: 'user-owner-super-admin',
      name: 'Primary Store Owner',
      email: SUPER_ADMIN_EMAIL,
      role: 'admin',
      isSuperAdmin: true,
      adminRole: 'primary_owner',
      status: 'active',
      addresses: [],
      wishlist: [],
      loyaltyPoints: 0,
      loyaltyHistory: [],
      createdAt: new Date().toISOString(),
    });
    needsSave = true;
  } else {
    owner.role = 'admin';
    owner.isSuperAdmin = true;
    owner.adminRole = 'primary_owner';
    owner.status = 'active';
  }

  // Ensure paymentTransactions mirror existing real orders without modifying order amounts/statuses
  const existingTxOrders = new Set((parsed.paymentTransactions as PaymentTransaction[]).map((t) => t.orderId));
  for (const ord of parsed.orders as Order[]) {
    if (!existingTxOrders.has(ord.id)) {
      (parsed.paymentTransactions as PaymentTransaction[]).push({
        id: ord.transactionId || `tx-${ord.id}`,
        orderId: ord.id,
        provider: ord.paymentMethod === 'cod' ? 'cod' : ord.paymentMethod === 'razorpay' ? 'razorpay' : 'manual',
        method: ord.paymentMethod,
        amount: ord.total,
        currency: 'INR',
        status:
          ord.paymentStatus === 'paid'
            ? 'captured'
            : ord.paymentStatus === 'refunded'
            ? 'refunded'
            : ord.paymentStatus === 'failed'
            ? 'failed'
            : 'created',
        gatewayOrderId: ord.gatewayOrderId,
        gatewayPaymentId: ord.gatewayPaymentId,
        createdAt: ord.createdAt,
        updatedAt: ord.updatedAt || ord.createdAt,
      });
      needsSave = true;
    }
  }

  // Review normalization
  for (const rev of parsed.reviews as Review[]) {
    if (!rev.moderationStatus) {
      rev.moderationStatus = 'approved';
      needsSave = true;
    }
    if (rev.reportedCount === undefined) rev.reportedCount = 0;
  }

  if (needsSave) {
    if (!migrationBackupDone) {
      migrationBackupDone = true;
      createBackupFile(parsed, 'system@zohraluxe.com', 'pre_migration');
    }
    saveDB(parsed);
  }

  return parsed as DatabaseSchema;
}

export function saveDB(db: DatabaseSchema) {
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function logAudit(
  db: DatabaseSchema,
  params: {
    adminEmail: string;
    actorId?: string;
    action: string;
    recordId?: string;
    before?: any;
    after?: any;
    result?: 'success' | 'failure' | 'blocked';
    ipAddress?: string;
    details: string;
  }
) {
  db.activityLogs.unshift({
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    adminEmail: params.adminEmail,
    actorId: params.actorId,
    action: params.action,
    recordId: params.recordId,
    before: sanitizeAuditPayload(params.before),
    after: sanitizeAuditPayload(params.after),
    result: params.result || 'success',
    ipAddress: params.ipAddress,
    details: params.details,
  });
  if (db.activityLogs.length > 500) db.activityLogs.length = 500;
}

export function pushNotification(
  db: DatabaseSchema,
  params: {
    audience: 'customer' | 'admin';
    userId?: string;
    userEmail?: string;
    category: NotificationItem['category'];
    title: string;
    message: string;
    linkId?: string;
  }
) {
  db.notifications.unshift({
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    audience: params.audience,
    userId: params.userId,
    userEmail: params.userEmail?.toLowerCase(),
    category: params.category,
    title: params.title,
    message: params.message,
    linkId: params.linkId,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  if (db.notifications.length > 400) db.notifications.length = 400;
}

export function recordStockMovement(
  db: DatabaseSchema,
  params: Omit<StockMovement, 'id' | 'timestamp'>
) {
  db.stockMovements.unshift({
    id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    ...params,
  });
  if (db.stockMovements.length > 1000) db.stockMovements.length = 1000;
}

// =================== BACKUP & RECOVERY ENGINE ===================

export function createBackupFile(
  db: DatabaseSchema,
  actorEmail: string,
  trigger: BackupRecord['trigger'] = 'manual'
): BackupRecord {
  const id = `bkp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const filename = `${id}.json`;
  const snapshot = {
    meta: { id, createdAt: new Date().toISOString(), createdBy: actorEmail, trigger },
    data: { ...db, backups: undefined },
  };
  const json = JSON.stringify(snapshot, null, 2);
  const checksum = crypto.createHash('sha256').update(json).digest('hex');
  fs.writeFileSync(path.join(BACKUPS_DIR, filename), json, 'utf-8');

  const record: BackupRecord = {
    id,
    filename,
    createdAt: snapshot.meta.createdAt,
    createdBy: actorEmail,
    trigger,
    sizeBytes: Buffer.byteLength(json, 'utf-8'),
    checksum,
    counts: {
      products: db.products.length,
      orders: db.orders.length,
      users: db.users.length,
    },
  };
  db.backups.unshift(record);

  const retention = Math.max(3, Number(db.settings?.backupRetentionCount) || 15);
  while (db.backups.length > retention) {
    const removed = db.backups.pop();
    if (removed) {
      const oldPath = path.join(BACKUPS_DIR, removed.filename);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {
          // ignore
        }
      }
    }
  }
  return record;
}

export function verifyBackupFile(record: BackupRecord): { valid: boolean; error?: string; payload?: any } {
  const fullPath = path.join(BACKUPS_DIR, record.filename);
  if (!fs.existsSync(fullPath)) return { valid: false, error: 'Backup file missing from storage.' };
  const raw = fs.readFileSync(fullPath, 'utf-8');
  const checksum = crypto.createHash('sha256').update(raw).digest('hex');
  if (checksum !== record.checksum) {
    return { valid: false, error: 'Backup checksum mismatch — archive may be corrupted.' };
  }
  const parsed = JSON.parse(raw);
  if (!parsed?.data || !Array.isArray(parsed.data.products) || !Array.isArray(parsed.data.users)) {
    return { valid: false, error: 'Backup structure failed schema validation.' };
  }
  return { valid: true, payload: parsed.data };
}
