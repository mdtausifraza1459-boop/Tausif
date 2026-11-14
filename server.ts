import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import type {
  AdminPermission,
  AdminRolePreset,
  Category,
  Coupon,
  Order,
  OrderStage,
  Product,
  ReturnExchangeRequest,
  Review,
  SupportInquiry,
  WholesaleAccount,
  WholesaleOrderRequest,
} from './src/types.ts';
import {
  BACKUPS_DIR,
  DATA_DIR,
  createBackupFile,
  distributeVariantStock,
  getDB,
  isProductVisibleToPublic,
  logAudit,
  pushNotification,
  recalcProductStock,
  recordStockMovement,
  saveDB,
  setSuperAdminEmail,
  SUPER_ADMIN_EMAIL,
  verifyBackupFile,
  type DatabaseSchema,
  type InternalUser,
} from './server/db.ts';
import {
  ALL_PERMISSIONS,
  checkRateLimit,
  consumeResetToken,
  createSession,
  getSession,
  hashPassword,
  issueResetToken,
  listActiveSessions,
  resetRateLimit,
  resolveEffectivePermissions,
  revokeSessionsForUser,
  revokeSessionToken,
  ROLE_PRESET_PERMISSIONS,
  verifyGoogleOAuthToken,
  verifyPassword,
} from './server/security.ts';
import {
  adjustVariantStock,
  buildCsv,
  computeProfitAndLoss,
  createRazorpayGatewayOrder,
  createRazorpayRefund,
  getIntegrationsStatus,
  getVariantStock,
  parseCsv,
  sanitizeOrderForPublic,
  sanitizeUserForPublic,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
} from './server/commerce.ts';
import {
  computeBusinessIntelligence,
  enrichProductForPublic,
  evaluateCartPricing,
  getActiveFlashSaleForProduct,
  getCustomerVipStatus,
  recommendGarmentSize,
} from './server/bi.ts';
import { DEFAULT_ADMIN_WIDGETS } from './server/db.ts';

const BOOTSTRAP_FILE = path.join(DATA_DIR, 'owner-bootstrap.txt');

function ensureOwnerBootstrapReady() {
  const db = getDB();
  const owner = db.users.find(
    (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && u.role === 'admin'
  );
  if (!owner) return;
  if (!owner.passwordHash) {
    const envPass = (process.env.ADMIN_PASSWORD || '').trim();
    if (envPass.length >= 8) {
      owner.passwordHash = hashPassword(envPass);
      saveDB(db);
      if (fs.existsSync(BOOTSTRAP_FILE)) fs.unlinkSync(BOOTSTRAP_FILE);
    } else if (!fs.existsSync(BOOTSTRAP_FILE)) {
      const code = crypto.randomBytes(12).toString('hex');
      fs.writeFileSync(BOOTSTRAP_FILE, code, 'utf-8');
      console.log('[SECURITY] Primary Owner initial password bootstrap token written to data/owner-bootstrap.txt');
    }
  } else if (fs.existsSync(BOOTSTRAP_FILE)) {
    try {
      fs.unlinkSync(BOOTSTRAP_FILE);
    } catch {
      // ignore
    }
  }
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
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

app.use(
  express.json({
    limit: '15mb',
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf.toString('utf8');
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Clean security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
  return req.ip || 'unknown';
}

function getUserFromToken(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return getSession(token);
}

function getAuthorizedAdmin(email: string, db: DatabaseSchema): InternalUser | undefined {
  const norm = String(email || '').trim().toLowerCase();
  if (!norm) return undefined;
  return db.users.find(
    (u) => u.email.toLowerCase() === norm && u.role === 'admin' && u.status === 'active'
  );
}

interface AdminRequest extends Request {
  adminUser?: InternalUser;
  adminPermissions?: AdminPermission[];
  sessionToken?: string;
}

function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Administrative authentication required.' });
  }
  const db = getDB();
  const user = db.users.find((u) => u.id === session.userId && u.role === 'admin');
  if (!user || user.status !== 'active') {
    if (token) revokeSessionToken(token);
    return res.status(403).json({
      error: 'Access Denied: Administrative account is inactive or unauthorized.',
    });
  }
  req.adminUser = user;
  req.adminPermissions = resolveEffectivePermissions(user, SUPER_ADMIN_EMAIL);
  req.sessionToken = token;
  next();
}

function requirePermission(...requiredAny: AdminPermission[]) {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    requireAdmin(req, res, () => {
      const perms = req.adminPermissions || [];
      const isOwner =
        req.adminUser?.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ||
        !!req.adminUser?.isSuperAdmin;
      if (isOwner) return next();
      const allowed = requiredAny.some((p) => perms.includes(p));
      if (!allowed) {
        return res.status(403).json({
          error: `Permission denied. Requires one of: ${requiredAny.join(', ')}`,
          requiredPermissions: requiredAny,
        });
      }
      next();
    });
  };
}

// =================== SEO: ROBOTS.TXT & DYNAMIC SITEMAP.XML ===================

app.get('/robots.txt', (req, res) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /data/\nSitemap: ${baseUrl}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', (req, res) => {
  const db = getDB();
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const nowIso = new Date().toISOString().split('T')[0];

  const urls: { loc: string; lastmod: string; changefreq: string; priority: string }[] = [
    { loc: `${baseUrl}/`, lastmod: nowIso, changefreq: 'daily', priority: '1.0' },
  ];

  for (const cat of db.categories) {
    urls.push({
      loc: `${baseUrl}/?category=${encodeURIComponent(cat.slug)}`,
      lastmod: nowIso,
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  for (const prod of db.products.filter(isProductVisibleToPublic)) {
    urls.push({
      loc: `${baseUrl}/?product=${encodeURIComponent(prod.id)}`,
      lastmod: (prod.updatedAt || prod.createdAt || nowIso).split('T')[0],
      changefreq: 'weekly',
      priority: '0.7',
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc.replace(/&/g, '&amp;')}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join('\n')}\n</urlset>`;

  res.type('application/xml').send(xml);
});

// =================== HEALTH & INTEGRATION STATUS ===================

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'zohra-luxe', timestamp: new Date().toISOString() });
});

app.get('/api/integrations/status', (_req, res) => {
  res.json(getIntegrationsStatus());
});

// =================== PUBLIC STOREFRONT APIS ===================

app.get('/api/settings', (_req, res) => {
  const db = getDB();
  res.json({ settings: db.settings });
});

app.get('/api/categories', (_req, res) => {
  const db = getDB();
  const categoriesWithCount = db.categories.map((c) => ({
    ...c,
    productCount: db.products.filter(
      (p) => p.category.toLowerCase() === c.name.toLowerCase() && isProductVisibleToPublic(p)
    ).length,
  }));
  res.json({ categories: categoriesWithCount });
});

app.get('/api/products', (req, res) => {
  const db = getDB();
  let list = db.products.filter(isProductVisibleToPublic);

  const category = req.query.category as string;
  const brand = req.query.brand as string;
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

  if (search) {
    const rawQ = search.toLowerCase().trim();
    const underMatch = rawQ.match(/(?:under|below|less than)\s*₹?\s*(\d+)/i);
    const searchMaxPrice = underMatch ? Number(underMatch[1]) : null;
    const cleanTokens = rawQ
      .replace(/(?:under|below|less than)\s*₹?\s*\d+/gi, '')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !['for', 'and', 'the', 'in', 'with', 'women', 'womens', 'girls'].includes(t));

    list = list.filter((p) => {
      if (searchMaxPrice !== null && p.discountedPrice > searchMaxPrice) return false;
      if (cleanTokens.length === 0) return true;
      const fullHaystack = [
        p.id,
        p.sku,
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
        ...Object.values(p.variantSkus || {}),
      ]
        .join(' ')
        .toLowerCase();
      return cleanTokens.every((tok) => fullHaystack.includes(tok)) || fullHaystack.includes(rawQ);
    });
  }

  if (category && category !== 'All') {
    list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }
  if (brand && brand !== 'All') {
    const brands = brand.split(',').map((b) => b.trim().toLowerCase());
    list = list.filter((p) => brands.includes((p.brand || 'Zohra Luxe').toLowerCase()));
  }
  if (size) {
    const requestedSizes = size.split(',').map((s) => s.trim().toUpperCase());
    list = list.filter((p) => p.sizes.some((sz) => requestedSizes.includes(sz.toUpperCase())));
  }
  if (color) {
    const requestedColors = color.split(',').map((c) => c.trim().toLowerCase());
    list = list.filter((p) =>
      p.colors.some((c) => requestedColors.some((rc) => c.name.toLowerCase().includes(rc)))
    );
  }
  if (fabric) {
    const requestedFabrics = fabric.split(',').map((f) => f.trim().toLowerCase());
    list = list.filter((p) => requestedFabrics.some((rf) => p.fabric.toLowerCase().includes(rf)));
  }
  if (sleeveType) {
    list = list.filter((p) => p.sleeveType?.toLowerCase() === sleeveType.toLowerCase());
  }
  if (kurtiLength) {
    list = list.filter((p) => p.kurtiLength?.toLowerCase() === kurtiLength.toLowerCase());
  }
  if (occasion) {
    const reqOcc = occasion.toLowerCase();
    list = list.filter((p) => p.occasion && p.occasion.toLowerCase().includes(reqOcc));
  }
  if (minDiscount !== null && !isNaN(minDiscount)) {
    list = list.filter((p) => p.discountPercent >= minDiscount);
  }
  if (minRating !== null && !isNaN(minRating)) {
    list = list.filter((p) => p.rating >= minRating);
  }
  if (inStockOnly) {
    list = list.filter((p) => p.inStock && p.stockQuantity > 0);
  }
  if (minPrice !== null && !isNaN(minPrice)) {
    list = list.filter((p) => p.discountedPrice >= minPrice);
  }
  if (maxPrice !== null && !isNaN(maxPrice)) {
    list = list.filter((p) => p.discountedPrice <= maxPrice);
  }
  if (isNew) list = list.filter((p) => p.isNewArrival);
  if (isBest) list = list.filter((p) => p.isBestSeller);
  if (isTrending) list = list.filter((p) => p.isTrending);

  if (sortBy === 'price-asc') {
    list.sort((a, b) => a.discountedPrice - b.discountedPrice);
  } else if (sortBy === 'price-desc') {
    list.sort((a, b) => b.discountedPrice - a.discountedPrice);
  } else if (sortBy === 'rating') {
    list.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === 'popularity') {
    list.sort((a, b) => (b.salesCount || b.reviewCount) - (a.salesCount || a.reviewCount));
  } else if (sortBy === 'discount') {
    list.sort((a, b) => b.discountPercent - a.discountPercent);
  } else if (sortBy === 'newest') {
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  const reqSession = getUserFromToken(req);
  const reqVip = reqSession ? getCustomerVipStatus(db, reqSession.email, reqSession.userId) : null;
  const earlyAccess = Boolean(reqVip?.tier?.earlyAccessFlashSales);

  // Strip internal wholesale/cost fields from public retail catalog response
  const publicProducts = list
    .map((p) => enrichProductForPublic(db, p, earlyAccess))
    .map(({ costPrice: _cp, supplier: _sp, wholesalePrice: _wp, wholesaleMoq: _wm, ...pub }) => pub);
  res.json({ products: publicProducts, total: publicProducts.length });
});

app.get('/api/products/recommendations', (req, res) => {
  const db = getDB();
  const seedIds = String(req.query.ids || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const visible = db.products.filter(isProductVisibleToPublic);
  const seedCats = new Set(
    visible.filter((p) => seedIds.includes(p.id)).map((p) => p.category.toLowerCase())
  );

  let recs = visible.filter((p) => !seedIds.includes(p.id) && seedCats.has(p.category.toLowerCase()));
  if (recs.length < 4) {
    const rest = visible.filter(
      (p) => !seedIds.includes(p.id) && !recs.some((r) => r.id === p.id)
    );
    rest.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0) || b.rating - a.rating);
    recs = [...recs, ...rest].slice(0, 8);
  } else {
    recs = recs.slice(0, 8);
  }
  const publicRecs = recs
    .map((p) => enrichProductForPublic(db, p, false))
    .map(({ costPrice: _cp, supplier: _sp, wholesalePrice: _wp, wholesaleMoq: _wm, ...pub }) => pub);
  res.json({ products: publicRecs });
});

app.get('/api/products/:id', (req, res) => {
  const db = getDB();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product || !isProductVisibleToPublic(product)) {
    return res.status(404).json({ error: 'Product not found' });
  }
  const reqSession = getUserFromToken(req);
  const reqVip = reqSession ? getCustomerVipStatus(db, reqSession.email, reqSession.userId) : null;
  const earlyAccess = Boolean(reqVip?.tier?.earlyAccessFlashSales);

  const reviews = db.reviews.filter(
    (r) => r.productId === product.id && r.moderationStatus !== 'hidden'
  );
  const related = db.products
    .filter(
      (p) =>
        p.id !== product.id &&
        isProductVisibleToPublic(p) &&
        (p.category.toLowerCase() === product.category.toLowerCase() || p.occasion === product.occasion)
    )
    .slice(0, 4)
    .map((p) => enrichProductForPublic(db, p, earlyAccess))
    .map(({ costPrice: _cp, supplier: _sp, wholesalePrice: _wp, wholesaleMoq: _wm, ...pub }) => pub);

  const completeTheLook = (product.completeTheLookIds || [])
    .map((cid) => db.products.find((p) => p.id === cid && isProductVisibleToPublic(p)))
    .filter((p): p is Product => Boolean(p))
    .map((p) => enrichProductForPublic(db, p, earlyAccess))
    .map(({ costPrice: _cp, supplier: _sp, wholesalePrice: _wp, wholesaleMoq: _wm, ...pub }) => pub);

  const questions = (db.productQuestions || []).filter(
    (q) => q.productId === product.id && q.isPublic !== false
  );

  const enriched = enrichProductForPublic(db, product, earlyAccess);
  const { costPrice: _cp, supplier: _sp, wholesalePrice: _wp, wholesaleMoq: _wm, ...publicProduct } = enriched;
  res.json({ product: publicProduct, reviews, related, completeTheLook, questions });
});

// Reviews with real verified purchase check, image validation, and moderation support
app.post('/api/products/:id/reviews', (req, res) => {
  const db = getDB();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const { customerName, rating, comment, images } = req.body;
  if (!customerName || !rating || !comment) {
    return res.status(400).json({ error: 'Name, rating, and review comment are required.' });
  }

  const session = getUserFromToken(req);
  let verifiedPurchase = false;
  if (session) {
    verifiedPurchase = db.orders.some(
      (o) =>
        (o.userId === session.userId || o.customerEmail.toLowerCase() === session.email.toLowerCase()) &&
        o.orderStatus === 'Delivered' &&
        o.items.some((it) => it.productId === product.id)
    );
  }

  const validatedImages: string[] = [];
  if (Array.isArray(images)) {
    for (const img of images.slice(0, 3)) {
      if (typeof img === 'string' && /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(img) && img.length < 3_000_000) {
        validatedImages.push(img);
      }
    }
  }

  const newReview: Review = {
    id: `rev-${Date.now()}`,
    productId: product.id,
    userId: session?.userId,
    customerName: String(customerName).trim(),
    customerEmail: session?.email,
    rating: Math.min(5, Math.max(1, Math.round(Number(rating)))),
    comment: String(comment).trim(),
    images: validatedImages.length > 0 ? validatedImages : undefined,
    date: 'Just now',
    createdAt: new Date().toISOString(),
    verified: verifiedPurchase,
    verifiedPurchase,
    moderationStatus: 'approved',
    reportedCount: 0,
  };

  db.reviews.unshift(newReview);
  const visibleReviews = db.reviews.filter((r) => r.productId === product.id && r.moderationStatus !== 'hidden');
  if (visibleReviews.length > 0) {
    const avg = visibleReviews.reduce((s, r) => s + r.rating, 0) / visibleReviews.length;
    product.rating = Number(avg.toFixed(1));
    product.reviewCount = visibleReviews.length;
  }

  pushNotification(db, {
    audience: 'admin',
    category: 'promo',
    title: 'New Customer Review Posted',
    message: `${newReview.customerName} rated ${product.name} ${newReview.rating}/5 (${verifiedPurchase ? 'Verified Purchase' : 'Unverified'}).`,
    linkId: product.id,
  });

  saveDB(db);
  res.json({ success: true, review: newReview, rating: product.rating, reviewCount: product.reviewCount });
});

app.post('/api/products/:id/reviews/:reviewId/report', (req, res) => {
  const db = getDB();
  const rev = db.reviews.find((r) => r.id === req.params.reviewId && r.productId === req.params.id);
  if (!rev) return res.status(404).json({ error: 'Review not found.' });
  const reason = String(req.body?.reason || 'Inappropriate content').trim();
  rev.reportedCount = (rev.reportedCount || 0) + 1;
  rev.reportReasons = [...(rev.reportReasons || []), reason].slice(0, 20);
  pushNotification(db, {
    audience: 'admin',
    category: 'security',
    title: 'Review Reported by Shopper',
    message: `Review ${rev.id} flagged (${rev.reportedCount} reports): ${reason}`,
    linkId: rev.id,
  });
  saveDB(db);
  res.json({ success: true, message: 'Thank you. Our moderation team has received this report.' });
});

// =================== COUPONS ===================

app.post('/api/coupons/validate', (req, res) => {
  const { code, cartTotal, items, customerEmail } = req.body;
  if (!code) return res.status(400).json({ error: 'Coupon code is required' });

  const db = getDB();
  const session = getUserFromToken(req);
  const resolvedEmail = String(customerEmail || session?.email || '').trim().toLowerCase();

  // If cart items are supplied, run full server pricing & eligibility engine
  if (Array.isArray(items) && items.length > 0) {
    const evalRes = evaluateCartPricing(db, {
      items,
      customerEmail: resolvedEmail,
      userId: session?.userId,
      couponCode: String(code),
    });
    if (!evalRes.ok) return res.status(400).json({ error: evalRes.error });
    if (evalRes.couponError) return res.status(400).json({ error: evalRes.couponError });
    const cpn = db.coupons.find((c) => c.code.toUpperCase() === String(code).trim().toUpperCase());
    return res.json({
      valid: true,
      code: evalRes.couponCode,
      discountAmount: evalRes.couponDiscount,
      description: cpn?.description || '',
    });
  }

  // Legacy subtotal-only fallback while still checking eligibility rules
  const coupon = db.coupons.find((c) => c.code.toUpperCase() === String(code).trim().toUpperCase());
  if (!coupon || !coupon.isActive) {
    return res.status(400).json({ error: 'Invalid or inactive coupon code' });
  }
  if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This coupon code has expired.' });
  }
  if (coupon.usageLimitTotal && coupon.usageLimitTotal > 0 && (coupon.usedCount || 0) >= coupon.usageLimitTotal) {
    return res.status(400).json({ error: 'This coupon has reached its total usage limit.' });
  }
  if (coupon.usageLimitPerUser && coupon.usageLimitPerUser > 0 && resolvedEmail && (coupon.usedByEmails?.[resolvedEmail] || 0) >= coupon.usageLimitPerUser) {
    return res.status(400).json({ error: `You have already used ${coupon.code} the maximum allowed times.` });
  }
  const vipStatus = getCustomerVipStatus(db, resolvedEmail, session?.userId);
  if (coupon.firstOrderOnly && !vipStatus.isFirstOrder) {
    return res.status(400).json({ error: `${coupon.code} is valid only on first orders.` });
  }
  if (coupon.returningCustomerOnly && !vipStatus.isReturningCustomer) {
    return res.status(400).json({ error: `${coupon.code} is exclusively for returning shoppers.` });
  }
  if (coupon.vipOnly && !vipStatus.isVipMember) {
    return res.status(400).json({ error: `${coupon.code} is exclusive to VIP tier members.` });
  }

  const subtotal = Number(cartTotal) || 0;
  if (subtotal < coupon.minOrderValue) {
    return res.status(400).json({
      error: `Coupon valid on minimum purchase of ₹${coupon.minOrderValue}. Add items worth ₹${coupon.minOrderValue - subtotal} more.`,
    });
  }

  let discountAmount =
    coupon.discountType === 'percentage'
      ? Math.round((subtotal * coupon.discountValue) / 100)
      : coupon.discountValue;

  if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
    discountAmount = coupon.maxDiscountAmount;
  }
  discountAmount = Math.min(discountAmount, subtotal);

  res.json({
    valid: true,
    code: coupon.code,
    discountAmount,
    description: coupon.description,
  });
});

// =================== REAL PAYMENT SYSTEM (RAZORPAY + COD) ===================

app.get('/api/payments/config', (_req, res) => {
  const status = getIntegrationsStatus();
  res.json({
    razorpayConfigured: status.razorpayConfigured,
    keyId: status.razorpayKeyId,
    supportedMethods: {
      cod: true,
      razorpay: status.razorpayConfigured,
      upi: status.razorpayConfigured,
      card: status.razorpayConfigured,
      netbanking: status.razorpayConfigured,
      qr: status.razorpayConfigured,
    },
    notice: status.razorpayConfigured
      ? 'Razorpay online gateway active (UPI, QR, Cards, Net Banking).'
      : 'Online payment gateway credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured on the server. Cash on Delivery is active.',
  });
});

app.post('/api/payments/razorpay/create-order', async (req, res) => {
  const { orderId } = req.body;
  const db = getDB();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (order.paymentStatus === 'paid') {
    return res.status(400).json({ error: 'Order is already paid.' });
  }

  const gw = await createRazorpayGatewayOrder(order.total, order.id);
  if (!gw.configured) {
    return res.status(503).json({
      configured: false,
      error: 'Razorpay payment gateway credentials are not configured on the server. Unverified online payments cannot be simulated.',
    });
  }
  if (!gw.ok) {
    return res.status(502).json({ error: gw.error });
  }

  order.gatewayOrderId = gw.gatewayOrder.id;
  order.updatedAt = new Date().toISOString();

  const existingTx = db.paymentTransactions.find((t) => t.orderId === order.id);
  if (existingTx) {
    existingTx.gatewayOrderId = gw.gatewayOrder.id;
    existingTx.updatedAt = order.updatedAt;
  } else {
    db.paymentTransactions.unshift({
      id: `tx-${Date.now()}`,
      orderId: order.id,
      provider: 'razorpay',
      method: order.paymentMethod,
      amount: order.total,
      currency: 'INR',
      status: 'created',
      gatewayOrderId: gw.gatewayOrder.id,
      createdAt: order.updatedAt,
      updatedAt: order.updatedAt,
    });
  }
  saveDB(db);

  res.json({
    configured: true,
    keyId: gw.keyId,
    razorpayOrderId: gw.gatewayOrder.id,
    amount: gw.gatewayOrder.amount,
    currency: gw.gatewayOrder.currency,
    orderId: order.id,
  });
});

app.post('/api/payments/razorpay/verify', (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing Razorpay signature verification fields.' });
  }

  const status = getIntegrationsStatus();
  if (!status.razorpayConfigured) {
    return res.status(503).json({
      configured: false,
      error: 'Razorpay secret is not configured on the server.',
    });
  }

  const db = getDB();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (order.paymentStatus === 'paid' && order.gatewayPaymentId === razorpay_payment_id) {
    return res.json({ success: true, alreadyVerified: true, order: sanitizeOrderForPublic(order) });
  }

  if (order.gatewayOrderId && order.gatewayOrderId !== razorpay_order_id) {
    return res.status(400).json({ error: 'Gateway order ID mismatch.' });
  }

  const verified = verifyRazorpaySignature({
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
  });

  if (!verified) {
    order.paymentStatus = 'failed';
    const tx = db.paymentTransactions.find((t) => t.orderId === order.id);
    if (tx) {
      tx.status = 'failed';
      tx.failureReason = 'Invalid HMAC signature';
      tx.updatedAt = new Date().toISOString();
    }
    logAudit(db, {
      adminEmail: order.customerEmail,
      action: 'Payment Signature Verification Failed',
      recordId: order.id,
      result: 'blocked',
      ipAddress: getClientIp(req),
      details: `Rejected forged or invalid Razorpay signature for Order ${order.id}.`,
    });
    saveDB(db);
    return res.status(400).json({ error: 'Payment signature verification failed. Order has NOT been marked paid.' });
  }

  const now = new Date().toISOString();
  order.paymentStatus = 'paid';
  order.gatewayOrderId = razorpay_order_id;
  order.gatewayPaymentId = razorpay_payment_id;
  order.transactionId = razorpay_payment_id;
  order.orderStatus = 'Payment Confirmed';
  order.updatedAt = now;
  order.trackingSteps = [
    { title: 'Order Placed', date: 'Completed', completed: true },
    { title: 'Payment Confirmed', date: 'Verified via Razorpay', completed: true },
    { title: 'Processing', date: 'In Progress', completed: false },
    { title: 'Packed', date: 'Pending', completed: false },
    { title: 'Shipped', date: 'Pending', completed: false },
    { title: 'Out for Delivery', date: 'Pending', completed: false },
    { title: 'Delivered', date: 'Pending', completed: false },
  ];

  const tx = db.paymentTransactions.find((t) => t.orderId === order.id);
  if (tx) {
    tx.status = 'captured';
    tx.gatewayPaymentId = razorpay_payment_id;
    tx.gatewaySignatureVerified = true;
    tx.updatedAt = now;
  } else {
    db.paymentTransactions.unshift({
      id: razorpay_payment_id,
      orderId: order.id,
      provider: 'razorpay',
      method: order.paymentMethod,
      amount: order.total,
      currency: 'INR',
      status: 'captured',
      gatewayOrderId: razorpay_order_id,
      gatewayPaymentId: razorpay_payment_id,
      gatewaySignatureVerified: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  pushNotification(db, {
    audience: 'customer',
    userId: order.userId,
    userEmail: order.customerEmail,
    category: 'payment',
    title: `Payment Verified for ${order.id}`,
    message: `Your payment of ₹${order.total.toLocaleString()} was verified (${razorpay_payment_id}).`,
    linkId: order.id,
  });
  pushNotification(db, {
    audience: 'admin',
    category: 'payment',
    title: `Paid Order Confirmed: ${order.id}`,
    message: `Verified Razorpay payment of ₹${order.total.toLocaleString()} from ${order.customerName}.`,
    linkId: order.id,
  });

  saveDB(db);
  res.json({ success: true, order: sanitizeOrderForPublic(order) });
});

app.post('/api/payments/razorpay/webhook', (req, res) => {
  const sig = String(req.headers['x-razorpay-signature'] || '');
  const rawBody = (req as any).rawBody || JSON.stringify(req.body || {});
  if (!verifyRazorpayWebhookSignature(rawBody, sig)) {
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  const eventId = String(req.headers['x-razorpay-event-id'] || req.body?.payload?.payment?.entity?.id || '');
  const eventType = String(req.body?.event || '');
  const paymentEntity = req.body?.payload?.payment?.entity;

  const db = getDB();
  if (eventId && db.paymentTransactions.some((t) => t.webhookEventId === eventId)) {
    return res.json({ received: true, duplicateIgnored: true });
  }

  const gwOrderId = paymentEntity?.order_id;
  const order = db.orders.find((o) => o.gatewayOrderId && o.gatewayOrderId === gwOrderId);
  if (order) {
    const now = new Date().toISOString();
    const tx = db.paymentTransactions.find((t) => t.orderId === order.id);
    if (eventType === 'payment.captured' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.gatewayPaymentId = paymentEntity.id;
      order.transactionId = paymentEntity.id;
      if (order.orderStatus === 'Order Placed') order.orderStatus = 'Payment Confirmed';
      order.updatedAt = now;
      if (tx) {
        tx.status = 'captured';
        tx.gatewayPaymentId = paymentEntity.id;
        tx.webhookEventId = eventId;
        tx.gatewaySignatureVerified = true;
        tx.updatedAt = now;
      }
    } else if (eventType === 'payment.failed' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'failed';
      order.updatedAt = now;
      if (tx) {
        tx.status = 'failed';
        tx.failureReason = paymentEntity.error_description || 'Payment failed at gateway';
        tx.webhookEventId = eventId;
        tx.updatedAt = now;
      }
    }
    saveDB(db);
  }

  res.json({ received: true });
});

// =================== ORDERS (IDEMPOTENT + VARIANT ATOMIC STOCK) ===================

app.post('/api/orders', (req, res) => {
  const db = getDB();
  const {
    idempotencyKey,
    customerName,
    customerEmail,
    customerPhone,
    deliveryAddress,
    items,
    paymentMethod,
    couponCode,
    giftCardCode,
    campaignId,
    redeemPoints,
    notes,
  } = req.body;

  if (!customerName || !customerEmail || !customerPhone || !deliveryAddress || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Missing required order details or shipping address.' });
  }

  const cleanMethod = String(paymentMethod || 'cod') as Order['paymentMethod'];
  const gwStatus = getIntegrationsStatus();
  if (cleanMethod !== 'cod' && !gwStatus.razorpayConfigured) {
    return res.status(400).json({
      configured: false,
      error:
        'Online payment gateway (Razorpay) credentials are not configured on the server. Please select Cash on Delivery or configure gateway credentials.',
    });
  }

  // Idempotency guard to prevent duplicate orders from repeated clicks/retries
  const cleanIdem = idempotencyKey ? String(idempotencyKey).trim() : '';
  if (cleanIdem) {
    const existingOrder = db.orders.find((o) => o.idempotencyKey === cleanIdem);
    if (existingOrder) {
      return res.json({
        success: true,
        idempotentReplay: true,
        order: sanitizeOrderForPublic(existingOrder),
      });
    }
  }

  const cleanEmail = String(customerEmail).trim().toLowerCase();
  const userSession = getUserFromToken(req);
  const authCustomer = userSession ? db.users.find((u) => u.id === userSession.userId) : undefined;

  // Authoritative backend pricing, stock, flash sale, bundle, VIP, coupon & gift card evaluation
  const pricing = evaluateCartPricing(db, {
    items,
    customerEmail: cleanEmail,
    userId: authCustomer?.id,
    couponCode,
    giftCardCode,
    redeemPoints,
    validateStock: true,
  });

  if (!pricing.ok) {
    return res.status(400).json({ error: pricing.error });
  }
  if (couponCode && pricing.couponError) {
    return res.status(400).json({ error: pricing.couponError });
  }
  if (giftCardCode && pricing.giftCardError) {
    return res.status(400).json({ error: pricing.giftCardError });
  }

  const normalizedItems: Order['items'] = pricing.lines.map((l) => ({
    productId: l.product.id,
    sku: l.product.sku,
    name: l.product.name,
    image: l.product.images[0] || '',
    size: l.size,
    color: l.color,
    price: l.unitPrice,
    costPrice: l.product.costPrice,
    quantity: l.quantity,
  }));

  const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const now = new Date().toISOString();

  // Atomically update coupon usage tracking
  if (pricing.couponCode) {
    const cpn = db.coupons.find((c) => c.code === pricing.couponCode);
    if (cpn) {
      cpn.usedCount = (cpn.usedCount || 0) + 1;
      cpn.usedByEmails = cpn.usedByEmails || {};
      cpn.usedByEmails[cleanEmail] = (cpn.usedByEmails[cleanEmail] || 0) + 1;
    }
  }

  // Atomically deduct digital gift card balance & append transaction
  if (pricing.giftCardCode && pricing.giftCardDiscount > 0) {
    const gc = (db.giftCards || []).find((g) => g.code === pricing.giftCardCode);
    if (gc) {
      gc.currentBalance = Math.max(0, gc.currentBalance - pricing.giftCardDiscount);
      if (gc.currentBalance === 0) gc.status = 'redeemed';
      gc.transactions.unshift({
        id: `gc-tx-${Date.now()}`,
        date: now,
        amount: -pricing.giftCardDiscount,
        type: 'redeemed',
        orderId,
        note: `Applied ₹${pricing.giftCardDiscount} toward order ${orderId}`,
      });
    }
  }

  // Deduct loyalty points redeemed
  if (authCustomer && pricing.pointsRedeemed > 0) {
    authCustomer.loyaltyPoints = Math.max(0, (authCustomer.loyaltyPoints || 0) - pricing.pointsRedeemed);
    authCustomer.loyaltyHistory = authCustomer.loyaltyHistory || [];
    authCustomer.loyaltyHistory.unshift({
      id: `loy-${Date.now()}`,
      date: now,
      points: -pricing.pointsRedeemed,
      type: 'redeemed',
      description: `Redeemed ₹${pricing.loyaltyDiscount} loyalty credit on order ${orderId}`,
      orderId,
    });
  }

  // Atomically deduct variant inventory & record StockMovement
  for (const item of normalizedItems) {
    const prod = db.products.find((p) => p.id === item.productId)!;
    adjustVariantStock(db, {
      product: prod,
      size: item.size,
      color: item.color,
      delta: -item.quantity,
      reason: 'order',
      referenceId: orderId,
      actorEmail: cleanEmail,
    });
    prod.salesCount = (prod.salesCount || 0) + item.quantity;
  }

  // Award loyalty points using VIP multiplier
  const earnedPoints = pricing.pointsToEarn;
  if (authCustomer && earnedPoints > 0) {
    authCustomer.loyaltyPoints = (authCustomer.loyaltyPoints || 0) + earnedPoints;
    authCustomer.loyaltyHistory = authCustomer.loyaltyHistory || [];
    authCustomer.loyaltyHistory.unshift({
      id: `loy-earn-${Date.now()}`,
      date: now,
      points: earnedPoints,
      type: 'earned',
      description: `Earned points on order ${orderId} (${pricing.vipStatus.tier.name})`,
      orderId,
    });
  }

  // Mark consented abandoned cart as recovered if exists
  const abandoned = (db.abandonedCarts || []).find(
    (a) => a.customerEmail.toLowerCase() === cleanEmail && !a.recoveredOrderId
  );
  if (abandoned) {
    abandoned.recoveredOrderId = orderId;
    abandoned.lastUpdatedAt = now;
  }
  if (authCustomer) {
    authCustomer.savedCart = [];
  }

  // Attribute campaign if active
  if (campaignId) {
    const camp = (db.campaigns || []).find((c) => c.id === campaignId);
    if (camp) {
      camp.conversions = (camp.conversions || 0) + 1;
      camp.revenueAttributed = (camp.revenueAttributed || 0) + pricing.total;
    }
  }

  const newOrder: Order = {
    id: orderId,
    idempotencyKey: cleanIdem || undefined,
    customerName: String(customerName).trim(),
    customerEmail: cleanEmail,
    customerPhone: String(customerPhone).trim(),
    deliveryAddress: {
      street: String(deliveryAddress.street).trim(),
      city: String(deliveryAddress.city).trim(),
      state: String(deliveryAddress.state).trim(),
      pincode: String(deliveryAddress.pincode).trim(),
    },
    items: normalizedItems,
    subtotal: pricing.subtotal,
    discount: pricing.couponDiscount,
    bundleDiscount: pricing.bundleDiscount,
    vipDiscount: pricing.vipDiscount,
    loyaltyDiscount: pricing.loyaltyDiscount,
    giftCardDiscount: pricing.giftCardDiscount,
    giftCardCode: pricing.giftCardCode,
    shipping: pricing.shipping,
    total: pricing.total,
    couponCode: pricing.couponCode,
    campaignId: campaignId ? String(campaignId) : undefined,
    paymentMethod: cleanMethod,
    paymentStatus: pricing.total === 0 ? 'paid' : 'pending',
    orderStatus: pricing.total === 0 ? 'Order Confirmed' : 'Order Placed',
    courierDetails: undefined,
    createdAt: now,
    updatedAt: now,
    trackingSteps: [
      { title: 'Order Placed', date: 'Just now', completed: true },
      { title: 'Payment Confirmed', date: cleanMethod === 'cod' ? 'Pay on delivery' : pricing.total === 0 ? 'Covered by Gift Card/Credits' : 'Awaiting gateway confirmation', completed: pricing.total === 0 },
      { title: 'Processing', date: 'Pending', completed: false },
      { title: 'Packed', date: 'Pending', completed: false },
      { title: 'Shipped', date: 'Pending', completed: false },
      { title: 'Out for Delivery', date: 'Pending', completed: false },
      { title: 'Delivered', date: 'Pending', completed: false },
    ],
    userId: authCustomer?.id,
    notes: notes ? String(notes).trim() : undefined,
    canCancel: true,
    canReturn: false,
  };

  db.orders.unshift(newOrder);
  db.paymentTransactions.unshift({
    id: `tx-${Date.now()}`,
    orderId: newOrder.id,
    provider: cleanMethod === 'cod' ? 'cod' : 'razorpay',
    method: cleanMethod,
    amount: pricing.total,
    currency: 'INR',
    status: pricing.total === 0 ? 'captured' : 'created',
    createdAt: now,
    updatedAt: now,
  });

  pushNotification(db, {
    audience: 'customer',
    userId: authCustomer?.id,
    userEmail: cleanEmail,
    category: 'order',
    title: `Order Placed: ${newOrder.id}`,
    message: `Thank you ${newOrder.customerName}! Your order of ₹${newOrder.total.toLocaleString()} has been received.`,
    linkId: newOrder.id,
  });
  pushNotification(db, {
    audience: 'admin',
    category: 'order',
    title: `New Order ${newOrder.id} (₹${newOrder.total.toLocaleString()})`,
    message: `${newOrder.customerName} placed ${normalizedItems.length} item(s) via ${cleanMethod.toUpperCase()}.`,
    linkId: newOrder.id,
  });

  saveDB(db);
  res.json({ success: true, order: sanitizeOrderForPublic(newOrder), earnedPoints });
});

app.get('/api/orders/track/:id', (req, res) => {
  const db = getDB();
  const q = req.params.id.trim().toUpperCase();
  const order = db.orders.find(
    (o) =>
      o.id.toUpperCase() === q ||
      o.customerPhone.replace(/\D/g, '').endsWith(q.replace(/\D/g, ''))
  );
  if (!order) {
    return res.status(404).json({ error: 'No order found with the provided Order ID or Phone number' });
  }
  const returns = db.returnRequests.filter((r) => r.orderId === order.id);
  res.json({ order: sanitizeOrderForPublic(order), returns });
});

app.post('/api/orders/:id/cancel', (req, res) => {
  const db = getDB();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded'].includes(order.orderStatus)) {
    return res.status(400).json({ error: 'Order cannot be cancelled in its current stage.' });
  }

  order.orderStatus = 'Cancelled';
  order.updatedAt = new Date().toISOString();
  if (order.paymentStatus === 'paid') {
    order.paymentStatus = 'refund_initiated';
  }

  // Restore exact variant stock + notify back-in-stock subscribers
  for (const item of order.items) {
    const prod = db.products.find((p) => p.id === item.productId);
    if (prod) {
      const prevProdStock = prod.stockQuantity;
      adjustVariantStock(db, {
        product: prod,
        size: item.size,
        color: item.color,
        delta: item.quantity,
        reason: 'cancellation',
        referenceId: order.id,
        actorEmail: order.customerEmail,
      });
      if (prevProdStock === 0 && prod.stockQuantity > 0) {
        db.users.forEach((u) => {
          if (u.stockAlerts?.includes(prod.id)) {
            pushNotification(db, {
              audience: 'customer',
              userId: u.id,
              userEmail: u.email,
              category: 'stock',
              title: `Back in Stock: ${prod.name}`,
              message: `${prod.name} is back in stock (${prod.stockQuantity} pieces available).`,
              linkId: prod.id,
            });
          }
        });
      }
    }
  }

  pushNotification(db, {
    audience: 'customer',
    userId: order.userId,
    userEmail: order.customerEmail,
    category: 'order',
    title: `Order Cancelled: ${order.id}`,
    message:
      order.paymentStatus === 'refund_initiated'
        ? `Order ${order.id} cancelled and stock released. Refund has been initiated.`
        : `Order ${order.id} cancelled successfully.`,
    linkId: order.id,
  });
  pushNotification(db, {
    audience: 'admin',
    category: 'order',
    title: `Customer Cancelled ${order.id}`,
    message: `${order.customerName} cancelled ${order.id}. Variant inventory restored.`,
    linkId: order.id,
  });

  saveDB(db);
  res.json({ success: true, order: sanitizeOrderForPublic(order) });
});

// Customer submits Return or Size Exchange Request (DOES NOT auto-restore stock until received/eligible!)
app.post('/api/orders/:id/return', (req, res) => {
  const db = getDB();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (order.orderStatus !== 'Delivered') {
    return res.status(400).json({ error: 'Returns or exchanges can only be requested for Delivered orders.' });
  }

  const { type, reason, requestedSize, photos, productId } = req.body;
  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'Please explain the reason for your return or exchange.' });
  }

  const validatedPhotos: string[] = [];
  if (Array.isArray(photos)) {
    for (const p of photos.slice(0, 3)) {
      if (typeof p === 'string' && /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(p) && p.length < 3_000_000) {
        validatedPhotos.push(p);
      }
    }
  }

  const now = new Date().toISOString();
  const targetItem = order.items.find((i) => !productId || i.productId === productId) || order.items[0];
  const reqRecord: ReturnExchangeRequest = {
    id: `RET-${Date.now().toString().slice(-6)}`,
    orderId: order.id,
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    type: type === 'exchange' ? 'exchange' : 'return',
    reason: String(reason).trim(),
    requestedSize: type === 'exchange' && requestedSize ? String(requestedSize).trim() : undefined,
    itemName: targetItem?.name,
    productId: targetItem?.productId,
    photos: validatedPhotos,
    status: 'requested',
    inventoryRestored: false,
    refundAmount: type === 'exchange' ? 0 : order.total,
    createdAt: now,
    updatedAt: now,
  };

  db.returnRequests.unshift(reqRecord);
  order.orderStatus = 'Return Requested';
  order.updatedAt = now;

  pushNotification(db, {
    audience: 'customer',
    userId: order.userId,
    userEmail: order.customerEmail,
    category: 'return',
    title: `${reqRecord.type === 'exchange' ? 'Exchange' : 'Return'} Request Submitted (${reqRecord.id})`,
    message: `We received your request for ${order.id}. Store review is underway.`,
    linkId: reqRecord.id,
  });
  pushNotification(db, {
    audience: 'admin',
    category: 'return',
    title: `New ${reqRecord.type.toUpperCase()} Request: ${reqRecord.id}`,
    message: `${order.customerName} requested ${reqRecord.type} on ${order.id}: "${reqRecord.reason}"`,
    linkId: reqRecord.id,
  });

  saveDB(db);
  res.json({ success: true, order: sanitizeOrderForPublic(order), returnRequest: reqRecord });
});

app.post('/api/support/inquire', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  const db = getDB();
  const inquiry: SupportInquiry = {
    id: `inq-${Date.now()}`,
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: phone ? String(phone).trim() : undefined,
    subject: String(subject || 'General Inquiry').trim(),
    message: String(message).trim(),
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  db.supportInquiries.unshift(inquiry);
  pushNotification(db, {
    audience: 'admin',
    category: 'security',
    title: 'New Support Inquiry',
    message: `${inquiry.name} (${inquiry.email}): ${inquiry.subject}`,
    linkId: inquiry.id,
  });
  saveDB(db);
  res.json({ success: true, message: 'Your inquiry has been received by our boutique support desk.' });
});

// =================== WHOLESALE SHOPPING PORTAL (+91 9310078735) ===================

app.post('/api/wholesale/register', (req, res) => {
  const { businessName, contactName, email, phone, gstNumber, city, state } = req.body;
  if (!businessName || !contactName || !email || !phone || !city || !state) {
    return res.status(400).json({ error: 'All business details (name, contact, email, phone, city, state) are required.' });
  }
  const db = getDB();
  const normEmail = String(email).trim().toLowerCase();
  const existing = db.wholesaleAccounts.find((w) => w.email.toLowerCase() === normEmail);
  if (existing) {
    return res.status(400).json({
      error: `Wholesale application already exists (${existing.status}). Call +91 9310078735 for urgent review.`,
    });
  }
  const session = getUserFromToken(req);
  const now = new Date().toISOString();
  const acc: WholesaleAccount = {
    id: `WS-${Date.now().toString().slice(-6)}`,
    userId: session?.userId,
    businessName: String(businessName).trim(),
    contactName: String(contactName).trim(),
    email: normEmail,
    phone: String(phone).trim(),
    gstNumber: gstNumber ? String(gstNumber).trim().toUpperCase() : undefined,
    city: String(city).trim(),
    state: String(state).trim(),
    status: 'pending',
    discountTierPercent: 25,
    createdAt: now,
    updatedAt: now,
  };
  db.wholesaleAccounts.unshift(acc);
  pushNotification(db, {
    audience: 'admin',
    category: 'wholesale',
    title: `New Wholesale B2B Application: ${acc.businessName}`,
    message: `${acc.contactName} (${acc.phone}, ${acc.city}) applied for wholesale portal access.`,
    linkId: acc.id,
  });
  saveDB(db);
  res.json({ success: true, account: acc, message: 'Wholesale application submitted for owner approval. Direct wholesale desk: +91 9310078735.' });
});

app.get('/api/wholesale/status', (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req);
  const queryEmail = String(req.query.email || session?.email || '').trim().toLowerCase();
  if (!queryEmail) return res.status(400).json({ error: 'Email or customer sign-in required.' });
  const account = db.wholesaleAccounts.find((w) => w.email.toLowerCase() === queryEmail);
  if (!account) return res.json({ registered: false, account: null });
  res.json({ registered: true, account });
});

app.get('/api/wholesale/catalog', (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req);
  const queryEmail = String(req.query.email || session?.email || '').trim().toLowerCase();
  const account = queryEmail
    ? db.wholesaleAccounts.find((w) => w.email.toLowerCase() === queryEmail && w.status === 'approved')
    : undefined;
  const isAdmin = session?.role === 'admin';

  if (!account && !isAdmin) {
    return res.status(403).json({
      error: 'Wholesale pricing and MOQ catalog are restricted to approved wholesale buyers. Please submit a B2B registration or call +91 9310078735.',
    });
  }

  const tierDiscount = account?.discountTierPercent || 25;
  const wholesaleCatalog = db.products.filter(isProductVisibleToPublic).map((p) => {
    const unitRate =
      p.wholesalePrice && p.wholesalePrice > 0
        ? p.wholesalePrice
        : Math.round(p.discountedPrice * (1 - tierDiscount / 100));
    const moq = p.wholesaleMoq && p.wholesaleMoq > 0 ? p.wholesaleMoq : 10;
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      fabric: p.fabric,
      images: p.images,
      retailPrice: p.discountedPrice,
      wholesalePrice: unitRate,
      wholesaleMoq: moq,
      stockQuantity: p.stockQuantity,
    };
  });

  res.json({ account: account || null, products: wholesaleCatalog });
});

app.post('/api/wholesale/orders', (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req);
  const { email, items } = req.body;
  const buyerEmail = String(email || session?.email || '').trim().toLowerCase();
  const account = db.wholesaleAccounts.find((w) => w.email.toLowerCase() === buyerEmail && w.status === 'approved');
  if (!account) {
    return res.status(403).json({ error: 'Only approved wholesale accounts can place bulk order requests.' });
  }
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Select at least one SKU for wholesale request.' });
  }

  const lineItems: WholesaleOrderRequest['items'] = [];
  let totalQuantity = 0;
  let estimatedTotal = 0;

  for (const it of items) {
    const prod = db.products.find((p) => p.id === it.productId);
    if (!prod) return res.status(400).json({ error: `Product ${it.productId} not found.` });
    const qty = Math.floor(Number(it.quantity) || 0);
    const moq = prod.wholesaleMoq && prod.wholesaleMoq > 0 ? prod.wholesaleMoq : 10;
    if (qty < moq) {
      return res.status(400).json({ error: `${prod.name} requires a minimum wholesale order quantity (MOQ) of ${moq} units.` });
    }
    const unitRate =
      prod.wholesalePrice && prod.wholesalePrice > 0
        ? prod.wholesalePrice
        : Math.round(prod.discountedPrice * (1 - (account.discountTierPercent || 25) / 100));
    totalQuantity += qty;
    estimatedTotal += unitRate * qty;
    lineItems.push({
      productId: prod.id,
      sku: prod.sku,
      name: prod.name,
      quantity: qty,
      requestedPrice: unitRate,
    });
  }

  const now = new Date().toISOString();
  const wsOrder: WholesaleOrderRequest = {
    id: `WSO-${Date.now().toString().slice(-6)}`,
    wholesaleAccountId: account.id,
    businessName: account.businessName,
    email: account.email,
    phone: account.phone,
    items: lineItems,
    totalQuantity,
    estimatedTotal,
    status: 'requested',
    createdAt: now,
    updatedAt: now,
  };

  db.wholesaleOrders.unshift(wsOrder);
  pushNotification(db, {
    audience: 'admin',
    category: 'wholesale',
    title: `Wholesale Bulk Request ${wsOrder.id}`,
    message: `${account.businessName} requested ${totalQuantity} units (Est. ₹${estimatedTotal.toLocaleString()}).`,
    linkId: wsOrder.id,
  });
  saveDB(db);
  res.json({ success: true, wholesaleOrder: wsOrder });
});

app.get('/api/wholesale/orders', (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req);
  const email = String(req.query.email || session?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Wholesale buyer email required.' });
  const list = db.wholesaleOrders.filter((w) => w.email.toLowerCase() === email);
  res.json({ orders: list });
});

// =================== AI SMART SHOPPING (SERVER-SIDE GEMINI-4-HYDROGEN) ===================

app.post('/api/ai/virtual-try-on', async (req, res) => {
  const { productName, productCategory, productImage, userPhoto } = req.body;
  if (!productName || !userPhoto) {
    return res.status(400).json({ error: 'Product details and customer photo are required.' });
  }

  const gemini = getGeminiClient();
  if (!gemini) {
    return res.json({
      success: true,
      aiConfigured: false,
      visualizationUrl: productImage,
      assessmentText:
        'AI Styling service (GEMINI_API_KEY) is not configured on the server. Showing garment photography preview only.',
    });
  }

  try {
    const cleanUserBase64 = String(userPhoto).replace(/^data:image\/\w+;base64,/, '');
    const mimeMatch = String(userPhoto).match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const prompt = `You are a women's ethnic fashion fit & styling consultant for Zohra Luxe.
The customer uploaded their photo to assess styling for "${productName}" (${productCategory}).
Provide a concise styling & drape consultation covering silhouette proportion, sleeve/neckline pairing, and jewelry/footwear suggestions. Keep it clear and helpful.`;

    const aiResponse = await gemini.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: [
        { inlineData: { mimeType, data: cleanUserBase64 } },
        { text: prompt },
      ],
    });

    return res.json({
      success: true,
      aiConfigured: true,
      visualizationUrl: productImage,
      assessmentText: aiResponse.text,
      note: 'Styling analysis generated via Gemini AI. Composite image synthesis is not active; showing catalog garment image.',
    });
  } catch (err) {
    console.error('AI try-on advisor error:', err);
    return res.status(500).json({
      error: 'Unable to complete AI styling assessment right now. Please try again later.',
    });
  }
});

app.post('/api/ai/style-assistant', async (req, res) => {
  const { query, heightCm, weightKg, bustIn, occasion } = req.body;
  const db = getDB();
  const visible = db.products.filter(isProductVisibleToPublic);

  const gemini = getGeminiClient();
  if (!gemini) {
    return res.status(503).json({
      configured: false,
      error: 'AI Styling Assistant requires GEMINI_API_KEY on the server.',
    });
  }

  try {
    const catalogContext = visible
      .slice(0, 20)
      .map((p) => `${p.id} | ${p.name} | ${p.category} | ₹${p.discountedPrice} | Sizes:${p.sizes.join(',')} | Fabric:${p.fabric}`)
      .join('\n');

    const aiResponse = await gemini.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are Zohra Luxe's fashion stylist. Recommend ONLY from this real catalog:\n${catalogContext}\n\nShopper request: ${query || ''}. Details: height ${heightCm || 'N/A'}cm, weight ${weightKg || 'N/A'}kg, bust ${bustIn || 'N/A'}in, occasion ${occasion || 'Any'}. Mention real product names, prices, and estimated size clearly as an estimate.`,
    });

    res.json({ success: true, advice: aiResponse.text });
  } catch (err) {
    console.error('AI style assistant error:', err);
    res.status(500).json({ error: 'AI styling request failed.' });
  }
});

// =================== CUSTOMER AUTH, RECOVERY, LOYALTY & NOTIFICATIONS ===================

app.post('/api/auth/register', (req, res) => {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`cust-reg:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSec));
    return res.status(429).json({ error: `Too many attempts. Retry in ${rl.retryAfterSec}s.` });
  }

  const { name, email, password, phone, referralCodeUsed, birthdayMonth, birthdayConsent } = req.body;
  if (!name || !email || !password || String(password).length < 6) {
    return res.status(400).json({ error: 'Name, valid email, and password (min 6 characters) are required.' });
  }

  const db = getDB();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  const now = new Date().toISOString();
  let startingPoints = 0;
  const loyaltyHistory: InternalUser['loyaltyHistory'] = [];

  if (referralCodeUsed) {
    const referrer = db.users.find(
      (u) => u.referralCode && u.referralCode.toUpperCase() === String(referralCodeUsed).trim().toUpperCase()
    );
    if (referrer) {
      startingPoints = 100;
      loyaltyHistory.push({
        id: `loy-${Date.now()}`,
        date: now,
        points: 100,
        type: 'referral_bonus',
        description: `Welcome referral bonus from ${referrer.referralCode}`,
      });
      referrer.loyaltyPoints = (referrer.loyaltyPoints || 0) + 100;
      referrer.loyaltyHistory = referrer.loyaltyHistory || [];
      referrer.loyaltyHistory.unshift({
        id: `loy-ref-${Date.now()}`,
        date: now,
        points: 100,
        type: 'referral_bonus',
        description: `Referral bonus: ${normalizedEmail} joined with your code`,
      });
    }
  }

  const userId = `user-${Date.now()}`;
  const newUser: InternalUser = {
    id: userId,
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(String(password)),
    phone: phone ? String(phone).trim() : undefined,
    role: 'customer',
    status: 'active',
    addresses: [],
    wishlist: [],
    loyaltyPoints: startingPoints,
    loyaltyHistory,
    referralCode: `ZL-${String(name).replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'VIP'}${userId.slice(-4).toUpperCase()}`,
    referredBy: referralCodeUsed ? String(referralCodeUsed).trim().toUpperCase() : undefined,
    birthdayMonth: birthdayConsent && birthdayMonth ? Number(birthdayMonth) : undefined,
    birthdayConsent: !!birthdayConsent,
    createdAt: now,
  };

  db.users.push(newUser);
  saveDB(db);

  const token = createSession(newUser, db.settings.sessionTimeoutHours || 168, {
    ipAddress: ip,
    userAgent: req.headers['user-agent'],
  });
  res.json({ token, user: sanitizeUserForPublic(newUser) });
});

app.post('/api/auth/login', (req, res) => {
  const ip = getClientIp(req);
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const rl = checkRateLimit(`cust-login:${ip}:${normalizedEmail}`, 8, 15 * 60 * 1000);
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSec));
    return res.status(429).json({ error: `Too many login attempts. Retry in ${rl.retryAfterSec}s.` });
  }

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const db = getDB();
  const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email address or password.' });
  }
  if (user.status && user.status !== 'active') {
    return res.status(403).json({ error: `Account is ${user.status}. Please contact customer care.` });
  }

  const check = verifyPassword(String(password), user.passwordHash);
  if (!check.valid) {
    return res.status(401).json({ error: 'Invalid email address or password.' });
  }

  if (check.needsRehash) {
    user.passwordHash = hashPassword(String(password));
    saveDB(db);
  }
  resetRateLimit(`cust-login:${ip}:${normalizedEmail}`);

  const token = createSession(user, db.settings.sessionTimeoutHours || 168, {
    ipAddress: ip,
    userAgent: req.headers['user-agent'],
  });
  res.json({ token, user: sanitizeUserForPublic(user) });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`cust-reset:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return res.status(429).json({ error: `Too many reset attempts. Retry in ${rl.retryAfterSec}s.` });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const db = getDB();
  const user = db.users.find((u) => u.email.toLowerCase() === email && u.role === 'customer');
  if (user && user.status === 'active') {
    const rawToken = issueResetToken(email, 'customer');
    console.log(`[SECURITY] Customer password recovery token issued for ${email}: ${rawToken}`);
  }
  // Consistent non-enumerating response
  res.json({
    success: true,
    message:
      'If an active customer account matches this email, a password recovery token has been issued (delivered via SMTP when configured or logged securely on the server).',
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Email, valid reset token, and password (min 6 characters) are required.' });
  }
  const normalized = String(email).trim().toLowerCase();
  if (!consumeResetToken(normalized, String(token), 'customer')) {
    return res.status(400).json({ error: 'Invalid or expired password recovery token.' });
  }
  const db = getDB();
  const user = db.users.find((u) => u.email.toLowerCase() === normalized && u.role === 'customer');
  if (!user) return res.status(404).json({ error: 'Customer account not found.' });

  user.passwordHash = hashPassword(String(newPassword));
  revokeSessionsForUser(user.id, user.email);
  saveDB(db);
  res.json({ success: true, message: 'Password updated securely. You may now sign in.' });
});

app.get('/api/auth/me', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  const db = getDB();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user || (user.status && user.status !== 'active')) {
    return res.status(403).json({ error: 'Account unavailable.' });
  }
  res.json({ user: sanitizeUserForPublic(user) });
});

app.put('/api/user/profile', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  const db = getDB();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, phone, birthdayMonth, birthdayConsent } = req.body;
  if (name && String(name).trim()) user.name = String(name).trim();
  if (phone !== undefined) user.phone = String(phone).trim() || undefined;
  if (birthdayConsent !== undefined) {
    user.birthdayConsent = !!birthdayConsent;
    user.birthdayMonth = user.birthdayConsent && birthdayMonth ? Number(birthdayMonth) : undefined;
  }
  saveDB(db);
  res.json({ success: true, user: sanitizeUserForPublic(user) });
});

app.get('/api/user/orders', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  const db = getDB();
  const userOrders = db.orders
    .filter((o) => o.userId === session.userId || o.customerEmail.toLowerCase() === session.email.toLowerCase())
    .map(sanitizeOrderForPublic);
  const returns = db.returnRequests.filter(
    (r) => r.customerEmail.toLowerCase() === session.email.toLowerCase()
  );
  res.json({ orders: userOrders, returns });
});

app.post('/api/user/wishlist/toggle', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
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

app.post('/api/user/alerts/toggle', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Sign in to subscribe to product alerts.' });
  const { productId, alertType } = req.body;
  const db = getDB();
  const user = db.users.find((u) => u.id === session.userId);
  const prod = db.products.find((p) => p.id === productId);
  if (!user || !prod) return res.status(404).json({ error: 'Product or account not found.' });

  if (alertType === 'stock') {
    user.stockAlerts = user.stockAlerts || [];
    if (user.stockAlerts.includes(productId)) {
      user.stockAlerts = user.stockAlerts.filter((id) => id !== productId);
    } else {
      user.stockAlerts.push(productId);
    }
  } else if (alertType === 'price') {
    user.priceDropAlerts = user.priceDropAlerts || {};
    if (user.priceDropAlerts[productId]) {
      delete user.priceDropAlerts[productId];
    } else {
      user.priceDropAlerts[productId] = prod.discountedPrice;
    }
  }
  saveDB(db);
  res.json({
    success: true,
    stockAlerts: user.stockAlerts || [],
    priceDropAlerts: user.priceDropAlerts || {},
  });
});

app.post('/api/user/address', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  const db = getDB();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { fullName, phone, street, city, state, pincode, isDefault } = req.body;
  if (!fullName || !phone || !street || !city || !state || !pincode) {
    return res.status(400).json({ error: 'All address fields are required.' });
  }
  const newAddr = {
    id: `addr-${Date.now()}`,
    fullName: String(fullName).trim(),
    phone: String(phone).trim(),
    street: String(street).trim(),
    city: String(city).trim(),
    state: String(state).trim(),
    pincode: String(pincode).trim(),
    isDefault: !!isDefault,
  };
  if (isDefault) user.addresses.forEach((a) => (a.isDefault = false));
  user.addresses.push(newAddr);
  saveDB(db);
  res.json({ addresses: user.addresses });
});

app.delete('/api/user/address/:id', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  const db = getDB();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.addresses = user.addresses.filter((a) => a.id !== req.params.id);
  saveDB(db);
  res.json({ addresses: user.addresses });
});

app.get('/api/user/notifications', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  const db = getDB();
  const list = db.notifications.filter(
    (n) =>
      n.audience === 'customer' &&
      (n.userId === session.userId || n.userEmail === session.email.toLowerCase())
  );
  res.json({ notifications: list, unreadCount: list.filter((n) => !n.isRead).length });
});

app.post('/api/user/notifications/read', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  const db = getDB();
  const { id } = req.body || {};
  db.notifications.forEach((n) => {
    if (
      n.audience === 'customer' &&
      (n.userId === session.userId || n.userEmail === session.email.toLowerCase()) &&
      (!id || n.id === id)
    ) {
      n.isRead = true;
    }
  });
  saveDB(db);
  res.json({ success: true });
});

// =================== SECURE ADMIN AUTHENTICATION & RECOVERY ===================

app.get('/api/admin/auth/status', (_req, res) => {
  const db = getDB();
  const owner = db.users.find(
    (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && u.role === 'admin'
  );
  const status = getIntegrationsStatus();
  res.json({
    googleOAuthConfigured: status.googleOAuthConfigured,
    googleClientId: status.googleClientId,
    needsInitialOwnerPassword: Boolean(owner && !owner.passwordHash && fs.existsSync(BOOTSTRAP_FILE)),
    smtpConfigured: status.smtpConfigured,
  });
});

// First-time bootstrap setup ONLY if Primary Owner has no passwordHash yet and matches one-time data/owner-bootstrap.txt
app.post('/api/admin/bootstrap-owner-password', (req, res) => {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`admin-boot:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) return res.status(429).json({ error: `Rate limit exceeded. Retry in ${rl.retryAfterSec}s.` });

  const { email, bootstrapCode, newPassword } = req.body;
  const norm = String(email || '').trim().toLowerCase();
  if (norm !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'Bootstrap setup applies exclusively to the Primary Owner account.' });
  }
  if (!newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: 'Owner password must be at least 8 characters long.' });
  }
  if (!fs.existsSync(BOOTSTRAP_FILE)) {
    return res.status(403).json({ error: 'Initial password bootstrap is disabled (already configured).' });
  }
  const db = getDB();
  const owner = db.users.find((u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && u.role === 'admin');
  if (!owner || owner.passwordHash) {
    return res.status(403).json({ error: 'Owner password is already set. Use sign-in or password recovery.' });
  }

  const expectedCode = fs.readFileSync(BOOTSTRAP_FILE, 'utf-8').trim();
  const givenCode = String(bootstrapCode || '').trim();
  const a = Buffer.from(expectedCode);
  const b = Buffer.from(givenCode);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: 'Invalid one-time bootstrap setup code.' });
  }

  owner.passwordHash = hashPassword(String(newPassword));
  fs.unlinkSync(BOOTSTRAP_FILE);
  logAudit(db, {
    adminEmail: owner.email,
    actorId: owner.id,
    action: 'Owner Initial Password Set',
    result: 'success',
    ipAddress: ip,
    details: 'Primary Owner initialized salted scrypt password and disabled bootstrap.',
  });
  saveDB(db);
  res.json({ success: true, message: 'Owner password initialized securely. Please sign in.' });
});

app.post('/api/admin/login', (req, res) => {
  const ip = getClientIp(req);
  const { username, email, password } = req.body;
  const targetEmail = String(username || email || '').trim().toLowerCase();
  const targetPassword = String(password || '');

  const rl = checkRateLimit(`admin-login:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfterSec));
    return res.status(429).json({
      error: `Too many admin login attempts. Account/IP temporarily rate-limited for ${rl.retryAfterSec}s.`,
    });
  }

  if (!targetEmail || !targetPassword) {
    return res.status(400).json({ error: 'Authorized email address and password are required.' });
  }

  const db = getDB();
  const matchingUser = db.users.find((u) => u.email.toLowerCase() === targetEmail);

  if (!matchingUser || matchingUser.role !== 'admin') {
    logAudit(db, {
      adminEmail: targetEmail,
      action: 'Unauthorized Admin Login Attempt',
      result: 'blocked',
      ipAddress: ip,
      details: `Rejected login attempt for non-admin email ${targetEmail}.`,
    });
    pushNotification(db, {
      audience: 'admin',
      category: 'security',
      title: 'Blocked Unauthorized Admin Login',
      message: `Unauthorized login attempt from ${targetEmail} (${ip}).`,
    });
    saveDB(db);
    return res.status(403).json({
      error: `Access Denied: ${targetEmail} is not an authorized store admin.`,
    });
  }

  if (matchingUser.status !== 'active') {
    logAudit(db, {
      adminEmail: targetEmail,
      actorId: matchingUser.id,
      action: 'Suspended Admin Login Blocked',
      result: 'blocked',
      ipAddress: ip,
      details: `Blocked login for ${matchingUser.status} admin account ${targetEmail}.`,
    });
    saveDB(db);
    return res.status(403).json({
      error: `Access Denied: Admin account (${targetEmail}) is ${matchingUser.status}.`,
    });
  }

  if (!matchingUser.passwordHash) {
    return res.status(403).json({
      error: 'Password is not yet initialized for this account. Complete first-time owner setup, reset password, or use verified Google OAuth.',
    });
  }

  const passCheck = verifyPassword(targetPassword, matchingUser.passwordHash);
  if (!passCheck.valid) {
    logAudit(db, {
      adminEmail: targetEmail,
      actorId: matchingUser.id,
      action: 'Admin Password Failed',
      result: 'failure',
      ipAddress: ip,
      details: `Incorrect password attempt for ${targetEmail}.`,
    });
    saveDB(db);
    return res.status(401).json({
      error: 'Invalid email or password.',
    });
  }

  if (passCheck.needsRehash) {
    matchingUser.passwordHash = hashPassword(targetPassword);
  }
  resetRateLimit(`admin-login:${ip}`);

  const isSuper = targetEmail === SUPER_ADMIN_EMAIL.toLowerCase() || !!matchingUser.isSuperAdmin;
  matchingUser.isSuperAdmin = isSuper;
  const permissions = resolveEffectivePermissions(matchingUser, SUPER_ADMIN_EMAIL);

  const token = createSession(
    {
      id: matchingUser.id,
      email: matchingUser.email,
      role: 'admin',
      isSuperAdmin: isSuper,
      adminRole: matchingUser.adminRole,
    },
    db.settings.sessionTimeoutHours || 168,
    { ipAddress: ip, userAgent: req.headers['user-agent'] }
  );

  logAudit(db, {
    adminEmail: matchingUser.email,
    actorId: matchingUser.id,
    action: 'Admin Login Success',
    result: 'success',
    ipAddress: ip,
    details: `${matchingUser.name} signed in via password (${matchingUser.adminRole || 'admin'}).`,
  });
  saveDB(db);

  res.json({
    token,
    admin: {
      id: matchingUser.id,
      name: matchingUser.name,
      email: matchingUser.email,
      role: matchingUser.role,
      adminRole: matchingUser.adminRole || (isSuper ? 'primary_owner' : 'store_partner'),
      isSuperAdmin: isSuper,
      permissions,
    },
  });
});

// Strict Server-Verified Google OAuth Login (NO blind email trust!)
app.post('/api/admin/google-login', async (req, res) => {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`admin-glogin:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    return res.status(429).json({ error: `Rate limit exceeded. Retry in ${rl.retryAfterSec}s.` });
  }

  const { idToken, credential, accessToken } = req.body;
  const verification = await verifyGoogleOAuthToken({
    idToken: idToken || credential,
    accessToken,
  });

  if (!verification.ok || !verification.email) {
    return res.status(verification.notConfigured ? 503 : 401).json({
      configured: !verification.notConfigured,
      error: verification.error || 'Google OAuth token verification failed.',
    });
  }

  const db = getDB();
  const normalized = verification.email;
  const matching = db.users.find((u) => u.email.toLowerCase() === normalized && u.role === 'admin');
  if (!matching) {
    logAudit(db, {
      adminEmail: normalized,
      action: 'Unauthorized Google Admin Blocked',
      result: 'blocked',
      ipAddress: ip,
      details: `Verified Google account ${normalized} is not in store admin team.`,
    });
    saveDB(db);
    return res.status(403).json({
      error: `Access Denied: Google account ${normalized} is not authorized as an admin.`,
    });
  }
  if (matching.status !== 'active') {
    return res.status(403).json({
      error: `Access Denied: Admin account (${normalized}) is ${matching.status}.`,
    });
  }

  const isSuper = normalized === SUPER_ADMIN_EMAIL.toLowerCase() || !!matching.isSuperAdmin;
  matching.isSuperAdmin = isSuper;
  const permissions = resolveEffectivePermissions(matching, SUPER_ADMIN_EMAIL);

  const token = createSession(
    {
      id: matching.id,
      email: matching.email,
      role: 'admin',
      isSuperAdmin: isSuper,
      adminRole: matching.adminRole,
    },
    db.settings.sessionTimeoutHours || 168,
    { ipAddress: ip, userAgent: req.headers['user-agent'] }
  );

  logAudit(db, {
    adminEmail: matching.email,
    actorId: matching.id,
    action: 'Admin Google OAuth Login',
    result: 'success',
    ipAddress: ip,
    details: `${matching.email} signed in via verified Google OAuth ID token.`,
  });
  saveDB(db);

  res.json({
    token,
    admin: {
      id: matching.id,
      name: matching.name,
      email: matching.email,
      role: matching.role,
      adminRole: matching.adminRole || (isSuper ? 'primary_owner' : 'store_partner'),
      isSuperAdmin: isSuper,
      permissions,
    },
  });
});

app.post('/api/admin/forgot-password', (req, res) => {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`admin-reset:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) return res.status(429).json({ error: `Rate limit exceeded. Retry in ${rl.retryAfterSec}s.` });

  const email = String(req.body?.email || '').trim().toLowerCase();
  const db = getDB();
  const admin = getAuthorizedAdmin(email, db);
  if (admin) {
    const rawToken = issueResetToken(email, 'admin');
    console.log(`[SECURITY] Admin password recovery token issued for ${email}: ${rawToken}`);
    logAudit(db, {
      adminEmail: email,
      actorId: admin.id,
      action: 'Admin Recovery Token Issued',
      result: 'success',
      ipAddress: ip,
      details: `Issued 15-minute password recovery token for ${email}.`,
    });
    saveDB(db);
  }
  res.json({
    success: true,
    message:
      'If an active authorized admin matches this email, a recovery token has been generated (sent via SMTP when configured or printed in server security logs).',
  });
});

app.post('/api/admin/reset-password', (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: 'Valid email, recovery token, and password (min 8 chars) are required.' });
  }
  const normalized = String(email).trim().toLowerCase();
  if (!consumeResetToken(normalized, String(token), 'admin')) {
    return res.status(400).json({ error: 'Invalid or expired admin recovery token.' });
  }
  const db = getDB();
  const admin = db.users.find((u) => u.email.toLowerCase() === normalized && u.role === 'admin');
  if (!admin) return res.status(404).json({ error: 'Admin account not found.' });

  admin.passwordHash = hashPassword(String(newPassword));
  revokeSessionsForUser(admin.id, admin.email);
  logAudit(db, {
    adminEmail: admin.email,
    actorId: admin.id,
    action: 'Admin Password Reset Completed',
    result: 'success',
    ipAddress: getClientIp(req),
    details: `Admin password reset and all prior sessions revoked for ${admin.email}.`,
  });
  saveDB(db);
  res.json({ success: true, message: 'Admin password updated securely. Prior sessions have been revoked.' });
});

app.post('/api/admin/logout', requireAdmin, (req: AdminRequest, res) => {
  if (req.sessionToken) revokeSessionToken(req.sessionToken);
  res.json({ success: true });
});

app.get('/api/admin/me', requireAdmin, (req: AdminRequest, res) => {
  const user = req.adminUser!;
  const isSuper = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || !!user.isSuperAdmin;
  res.json({
    admin: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      adminRole: user.adminRole || (isSuper ? 'primary_owner' : 'store_partner'),
      isSuperAdmin: isSuper,
      permissions: req.adminPermissions || [],
    },
    rolePresets: ROLE_PRESET_PERMISSIONS,
    allPermissions: ALL_PERMISSIONS,
  });
});

// =================== ADMIN 1: OVERVIEW & NOTIFICATIONS ===================

app.get('/api/admin/overview', requirePermission('overview.view'), (_req, res) => {
  const db = getDB();
  const totalProducts = db.products.length;
  const totalOrders = db.orders.length;
  const pendingOrders = db.orders.filter((o) =>
    ['Order Placed', 'Payment Confirmed', 'Order Confirmed', 'Processing', 'Packed'].includes(o.orderStatus)
  ).length;
  const deliveredOrders = db.orders.filter((o) => o.orderStatus === 'Delivered').length;
  const totalCustomers = db.users.filter((u) => u.role === 'customer' && u.status !== 'archived').length;
  const lowStockCount = db.products.filter((p) => p.stockQuantity <= (p.lowStockThreshold || 10)).length;

  const validOrders = db.orders.filter((o) => o.orderStatus !== 'Cancelled');
  const totalSales = validOrders.reduce((sum, o) => sum + o.total, 0);

  const now = new Date();
  const monthlyRevenue = validOrders
    .filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, o) => sum + o.total, 0);

  const pnl = computeProfitAndLoss(db);

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
      netProfit: pnl.netProfit,
      pendingReturns: db.returnRequests.filter((r) => ['requested', 'approved', 'pickup_scheduled'].includes(r.status)).length,
      pendingWholesale: db.wholesaleAccounts.filter((w) => w.status === 'pending').length,
    },
    recentOrders: db.orders.slice(0, 8).map(sanitizeOrderForPublic),
    superAdminEmail: SUPER_ADMIN_EMAIL,
    integrations: getIntegrationsStatus(),
  });
});

app.get('/api/admin/notifications', requirePermission('notifications.manage', 'overview.view'), (_req, res) => {
  const db = getDB();
  const list = db.notifications.filter((n) => n.audience === 'admin');
  res.json({ notifications: list, unreadCount: list.filter((n) => !n.isRead).length });
});

app.post('/api/admin/notifications/read', requirePermission('notifications.manage', 'overview.view'), (req, res) => {
  const db = getDB();
  const { id } = req.body || {};
  db.notifications.forEach((n) => {
    if (n.audience === 'admin' && (!id || n.id === id)) n.isRead = true;
  });
  saveDB(db);
  res.json({ success: true });
});

// =================== ADMIN 2 & 3 & 4: PRODUCTS, INVENTORY, CATEGORIES ===================

app.get('/api/admin/products', requirePermission('products.manage', 'inventory.manage'), (_req, res) => {
  const db = getDB();
  res.json({ products: db.products });
});

app.post('/api/admin/products', requirePermission('products.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const {
    sku,
    name,
    brand,
    supplier,
    category,
    costPrice,
    originalPrice,
    discountedPrice,
    wholesalePrice,
    wholesaleMoq,
    sizes,
    colors,
    variantStock,
    fabric,
    sleeveType,
    kurtiLength,
    occasion,
    badge,
    description,
    stockQuantity,
    lowStockThreshold,
    isNewArrival,
    isBestSeller,
    isTrending,
    isPublished,
    scheduledPublishAt,
    images,
    videos,
    details,
  } = req.body;

  if (!name || !category || !originalPrice || !discountedPrice || !fabric) {
    return res.status(400).json({ error: 'Name, category, MRP, offer price, and fabric are required.' });
  }

  const cleanSizes = Array.isArray(sizes) && sizes.length ? sizes : ['XS', 'S', 'M', 'L', 'XL'];
  const cleanColors = Array.isArray(colors) && colors.length ? colors : [{ name: 'Blush Pink', hex: '#E8C5C8' }];
  const prodId = `zk-${Date.now().toString().slice(-6)}`;
  const cleanSku = String(sku || `ZL-${prodId.toUpperCase()}`).trim().toUpperCase();

  if (db.products.some((p) => p.sku.toUpperCase() === cleanSku)) {
    return res.status(400).json({ error: `Duplicate SKU "${cleanSku}". Every product must have a unique SKU.` });
  }

  const origP = Number(originalPrice);
  const discP = Number(discountedPrice);
  const discountPercent = origP > discP ? Math.round(((origP - discP) / origP) * 100) : 0;

  const matrix =
    variantStock && typeof variantStock === 'object' && Object.keys(variantStock).length > 0
      ? variantStock
      : distributeVariantStock(cleanSizes, cleanColors, Math.max(0, Number(stockQuantity) || 0));

  const newProduct: Product = {
    id: prodId,
    sku: cleanSku,
    name: String(name).trim(),
    brand: String(brand || 'Zohra Luxe').trim(),
    supplier: supplier ? String(supplier).trim() : undefined,
    category: String(category).trim(),
    costPrice: Math.max(0, Number(costPrice) || 0),
    originalPrice: origP,
    discountedPrice: discP,
    wholesalePrice: wholesalePrice ? Number(wholesalePrice) : undefined,
    wholesaleMoq: wholesaleMoq ? Number(wholesaleMoq) : undefined,
    discountPercent,
    sizes: cleanSizes,
    colors: cleanColors,
    variantStock: matrix,
    lowStockThreshold: Number(lowStockThreshold) || 10,
    fabric: String(fabric).trim(),
    sleeveType: sleeveType || 'Three-Quarter',
    kurtiLength: kurtiLength || 'Calf-Length',
    occasion: occasion || 'Festive Wear',
    badge: badge || (isNewArrival ? 'NEW ARRIVAL' : isBestSeller ? 'BEST SELLER' : undefined),
    description: String(description || 'Handcrafted luxury ethnic attire.').trim(),
    inStock: true,
    stockQuantity: 0,
    isNewArrival: !!isNewArrival,
    isBestSeller: !!isBestSeller,
    isTrending: !!isTrending,
    isPublished: isPublished !== false,
    scheduledPublishAt: scheduledPublishAt || undefined,
    rating: 5.0,
    reviewCount: 0,
    salesCount: 0,
    images:
      Array.isArray(images) && images.length
        ? images
        : ['/src/assets/images/category_kurtis_showcase_1794109164419.jpg'],
    videos: Array.isArray(videos) ? videos.filter(Boolean) : [],
    details: details || {
      neckline: 'Refined Collar / Yoke',
      sleeves: sleeveType || 'Three-Quarter Sleeves',
      pattern: 'Artisanal Zari Work',
      washCare: 'Dry Clean Recommended',
      lining: 'Soft Pure Mulmul Lining',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  recalcProductStock(newProduct);
  db.products.unshift(newProduct);

  recordStockMovement(db, {
    productId: newProduct.id,
    productName: newProduct.name,
    sku: newProduct.sku,
    delta: newProduct.stockQuantity,
    previousStock: 0,
    newStock: newProduct.stockQuantity,
    reason: 'initial',
    actorEmail: actor.email,
  });

  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Created Product',
    recordId: newProduct.id,
    after: { id: newProduct.id, sku: newProduct.sku, name: newProduct.name, price: newProduct.discountedPrice },
    details: `Created product ${newProduct.name} (${newProduct.sku}).`,
  });
  saveDB(db);
  res.json({ success: true, product: newProduct });
});

app.put('/api/admin/products/:id', requirePermission('products.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found.' });

  const existing = db.products[idx];
  const prevPrice = existing.discountedPrice;
  const prevStock = existing.stockQuantity;
  const beforeSnap = { name: existing.name, sku: existing.sku, price: existing.discountedPrice, stock: existing.stockQuantity };

  if (req.body.sku) {
    const nextSku = String(req.body.sku).trim().toUpperCase();
    if (db.products.some((p) => p.id !== existing.id && p.sku.toUpperCase() === nextSku)) {
      return res.status(400).json({ error: `Duplicate SKU "${nextSku}".` });
    }
  }

  const origP = req.body.originalPrice !== undefined ? Number(req.body.originalPrice) : existing.originalPrice;
  const discP = req.body.discountedPrice !== undefined ? Number(req.body.discountedPrice) : existing.discountedPrice;
  const discountPercent = origP > discP ? Math.round(((origP - discP) / origP) * 100) : 0;

  let nextMatrix = req.body.variantStock || existing.variantStock;
  if (req.body.stockQuantity !== undefined && !req.body.variantStock && Number(req.body.stockQuantity) !== existing.stockQuantity) {
    nextMatrix = distributeVariantStock(
      req.body.sizes || existing.sizes,
      req.body.colors || existing.colors,
      Math.max(0, Number(req.body.stockQuantity))
    );
  }

  const updated: Product = {
    ...existing,
    ...req.body,
    sku: req.body.sku ? String(req.body.sku).trim().toUpperCase() : existing.sku,
    costPrice: req.body.costPrice !== undefined ? Math.max(0, Number(req.body.costPrice)) : existing.costPrice,
    originalPrice: origP,
    discountedPrice: discP,
    discountPercent,
    variantStock: nextMatrix,
    updatedAt: new Date().toISOString(),
  };
  recalcProductStock(updated);
  db.products[idx] = updated;

  // Back-in-stock & Price-drop customer notifications
  if (prevStock === 0 && updated.stockQuantity > 0) {
    db.users.forEach((u) => {
      if (u.stockAlerts?.includes(updated.id)) {
        pushNotification(db, {
          audience: 'customer',
          userId: u.id,
          userEmail: u.email,
          category: 'stock',
          title: `Back in Stock: ${updated.name}`,
          message: `${updated.name} is back in stock (${updated.stockQuantity} pieces available).`,
          linkId: updated.id,
        });
      }
    });
  }
  if (updated.discountedPrice < prevPrice) {
    db.users.forEach((u) => {
      if (u.priceDropAlerts && u.priceDropAlerts[updated.id] && updated.discountedPrice < u.priceDropAlerts[updated.id]) {
        pushNotification(db, {
          audience: 'customer',
          userId: u.id,
          userEmail: u.email,
          category: 'promo',
          title: `Price Drop Alert: ${updated.name}`,
          message: `Price dropped to ₹${updated.discountedPrice.toLocaleString()} (was ₹${prevPrice.toLocaleString()}).`,
          linkId: updated.id,
        });
        u.priceDropAlerts[updated.id] = updated.discountedPrice;
      }
    });
  }

  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Updated Product',
    recordId: updated.id,
    before: beforeSnap,
    after: { name: updated.name, sku: updated.sku, price: updated.discountedPrice, stock: updated.stockQuantity },
    details: `Updated product ${updated.name} (${updated.sku}).`,
  });
  saveDB(db);
  res.json({ success: true, product: updated });
});

app.post('/api/admin/products/:id/duplicate', requirePermission('products.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const src = db.products.find((p) => p.id === req.params.id);
  if (!src) return res.status(404).json({ error: 'Product not found.' });

  const copyId = `zk-${Date.now().toString().slice(-6)}`;
  const copySku = `${src.sku}-COPY-${copyId.slice(-3)}`;
  const copy: Product = {
    ...JSON.parse(JSON.stringify(src)),
    id: copyId,
    sku: copySku,
    name: `${src.name} (Copy)`,
    isPublished: false,
    salesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.products.unshift(copy);
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Duplicated Product',
    recordId: copy.id,
    details: `Duplicated ${src.id} into draft ${copy.id} (${copy.sku}).`,
  });
  saveDB(db);
  res.json({ success: true, product: copy });
});

app.delete('/api/admin/products/:id', requirePermission('products.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const prod = db.products.find((p) => p.id === req.params.id);
  if (!prod) return res.status(404).json({ error: 'Product not found.' });

  db.products = db.products.filter((p) => p.id !== req.params.id);
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Deleted Product',
    recordId: prod.id,
    before: { id: prod.id, sku: prod.sku, name: prod.name },
    details: `Deleted product ${prod.name} (${prod.id}).`,
  });
  saveDB(db);
  res.json({ success: true, message: 'Product deleted permanently.' });
});

// Product CSV Export & Import (Excel-compatible UTF-8 BOM CSV)
app.get('/api/admin/products/export/csv', requirePermission('products.manage', 'inventory.manage', 'reports.view'), (_req, res) => {
  const db = getDB();
  const headers = [
    'id',
    'sku',
    'name',
    'brand',
    'category',
    'fabric',
    'costPrice',
    'originalPrice',
    'discountedPrice',
    'stockQuantity',
    'sizes',
    'colors',
    'isPublished',
    'description',
  ];
  const rows = db.products.map((p) => [
    p.id,
    p.sku,
    p.name,
    p.brand,
    p.category,
    p.fabric,
    p.costPrice,
    p.originalPrice,
    p.discountedPrice,
    p.stockQuantity,
    p.sizes.join('|'),
    p.colors.map((c) => `${c.name}:${c.hex}`).join('|'),
    p.isPublished !== false ? 'true' : 'false',
    p.description,
  ]);
  const csv = '\uFEFF' + buildCsv(headers, rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="zohra_products_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

app.post('/api/admin/products/import', requirePermission('products.manage'), (req: AdminRequest, res) => {
  const { csvText } = req.body;
  if (!csvText || typeof csvText !== 'string') {
    return res.status(400).json({ error: 'CSV content is required.' });
  }
  const rows = parseCsv(csvText);
  if (rows.length < 2) return res.status(400).json({ error: 'CSV must include header row and at least one product row.' });

  const header = rows[0].map((h) => h.trim());
  const idxOf = (col: string) => header.findIndex((h) => h.toLowerCase() === col.toLowerCase());
  const db = getDB();
  const actor = req.adminUser!;
  let created = 0;
  let updated = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (col: string) => {
      const idx = idxOf(col);
      return idx >= 0 && r[idx] !== undefined ? r[idx].trim() : '';
    };
    const name = get('name');
    const sku = (get('sku') || `ZL-IMP-${Date.now()}-${i}`).toUpperCase();
    const category = get('category') || "Women's Kurtis";
    if (!name) continue;

    const orig = Number(get('originalPrice')) || 1999;
    const disc = Number(get('discountedPrice')) || orig;
    const cost = Number(get('costPrice')) || 0;
    const stock = Math.max(0, Number(get('stockQuantity')) || 0);
    const sizes = get('sizes') ? get('sizes').split('|').map((s) => s.trim()).filter(Boolean) : ['S', 'M', 'L', 'XL'];
    const colors = get('colors')
      ? get('colors')
          .split('|')
          .map((c) => {
            const [cn, hx] = c.split(':');
            return { name: cn?.trim() || 'Classic', hex: hx?.trim() || '#D4AF6A' };
          })
      : [{ name: 'Classic Cream', hex: '#FAF8F5' }];

    const existing = db.products.find((p) => p.sku.toUpperCase() === sku || (get('id') && p.id === get('id')));
    if (existing) {
      existing.name = name;
      existing.category = category;
      existing.fabric = get('fabric') || existing.fabric;
      existing.costPrice = cost;
      existing.originalPrice = orig;
      existing.discountedPrice = disc;
      existing.discountPercent = orig > disc ? Math.round(((orig - disc) / orig) * 100) : 0;
      existing.variantStock = distributeVariantStock(sizes, colors, stock);
      recalcProductStock(existing);
      existing.updatedAt = new Date().toISOString();
      updated++;
    } else {
      const id = get('id') || `zk-imp-${Date.now().toString().slice(-5)}-${i}`;
      const prod: Product = {
        id,
        sku,
        name,
        brand: get('brand') || 'Zohra Luxe',
        category,
        costPrice: cost,
        originalPrice: orig,
        discountedPrice: disc,
        discountPercent: orig > disc ? Math.round(((orig - disc) / orig) * 100) : 0,
        sizes,
        colors,
        variantStock: distributeVariantStock(sizes, colors, stock),
        fabric: get('fabric') || 'Pure Cotton',
        description: get('description') || `${name} curated for Zohra Luxe.`,
        inStock: stock > 0,
        stockQuantity: stock,
        isNewArrival: true,
        isBestSeller: false,
        isTrending: false,
        isPublished: get('isPublished') !== 'false',
        rating: 5.0,
        reviewCount: 0,
        images: ['/src/assets/images/category_kurtis_showcase_1794109164419.jpg'],
        details: {
          neckline: 'Tailored Yoke',
          sleeves: 'Three-Quarter',
          pattern: 'Artisanal Craft',
          washCare: 'Gentle Wash',
          lining: 'Mulmul Cotton',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.products.unshift(prod);
      created++;
    }
  }

  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Bulk CSV Product Import',
    details: `Imported ${created} new and updated ${updated} existing products.`,
  });
  saveDB(db);
  res.json({ success: true, created, updated });
});

app.get('/api/admin/inventory', requirePermission('inventory.manage', 'products.manage'), (_req, res) => {
  const db = getDB();
  const lowStockItems = db.products.filter((p) => p.stockQuantity <= (p.lowStockThreshold || 10));
  res.json({
    products: db.products,
    lowStockItems,
    stockMovements: db.stockMovements.slice(0, 150),
  });
});

app.post('/api/admin/inventory/:id/adjust', requirePermission('inventory.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const prod = db.products.find((p) => p.id === req.params.id);
  if (!prod) return res.status(404).json({ error: 'Product not found.' });

  const { size, color, newQuantity, reason } = req.body;
  const qty = Math.max(0, Math.floor(Number(newQuantity) || 0));
  const sz = String(size || prod.sizes[0] || 'M');
  const col = String(color || prod.colors[0]?.name || 'Standard');
  const current = getVariantStock(prod, sz, col);
  const delta = qty - current;

  const result = adjustVariantStock(db, {
    product: prod,
    size: sz,
    color: col,
    delta,
    reason: 'manual_adjustment',
    referenceId: reason ? String(reason).slice(0, 40) : 'admin_stock_update',
    actorEmail: actor.email,
  });

  if (!result.ok) return res.status(400).json({ error: result.error });
  prod.updatedAt = new Date().toISOString();
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Adjusted Variant Stock',
    recordId: prod.id,
    before: { variant: `${sz}::${col}`, stock: current },
    after: { variant: `${sz}::${col}`, stock: qty },
    details: `Updated ${prod.name} (${sz}, ${col}) stock from ${current} to ${qty}.`,
  });
  saveDB(db);
  res.json({ success: true, product: prod });
});

app.post('/api/admin/categories', requirePermission('categories.manage'), (req: AdminRequest, res) => {
  const { name, description, image } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  const db = getDB();
  const actor = req.adminUser!;
  const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const newCat: Category = {
    id: `cat-${Date.now()}`,
    name: String(name).trim(),
    slug,
    description: String(description || 'Curated women collection.').trim(),
    image: image || '/src/assets/images/category_kurtis_showcase_1794109164419.jpg',
  };
  db.categories.push(newCat);
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Added Category',
    recordId: newCat.id,
    details: `Created category ${newCat.name}.`,
  });
  saveDB(db);
  res.json({ success: true, category: newCat });
});

app.put('/api/admin/categories/:id', requirePermission('categories.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const cat = db.categories.find((c) => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  if (req.body.name) cat.name = String(req.body.name).trim();
  if (req.body.description !== undefined) cat.description = String(req.body.description).trim();
  if (req.body.image) cat.image = req.body.image;
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Updated Category', recordId: cat.id, details: `Updated ${cat.name}` });
  saveDB(db);
  res.json({ success: true, category: cat });
});

app.delete('/api/admin/categories/:id', requirePermission('categories.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const cat = db.categories.find((c) => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Deleted Category', recordId: cat.id, details: `Deleted ${cat.name}` });
  saveDB(db);
  res.json({ success: true });
});

// =================== ADMIN 5 & 9 & 10: ORDERS, PAYMENTS & RETURNS ===================

app.get('/api/admin/orders', requirePermission('orders.view', 'orders.manage', 'delivery.manage'), (_req, res) => {
  const db = getDB();
  res.json({
    orders: db.orders,
    shiprocketConfigured: getIntegrationsStatus().shiprocketConfigured,
  });
});

app.patch('/api/admin/orders/:id', requirePermission('orders.manage', 'delivery.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const { status, paymentStatus, courierProvider, trackingNumber, trackingUrl, estimatedDelivery, internalNote, notes } = req.body;
  const beforeStatus = order.orderStatus;

  if (status) {
    order.orderStatus = status as OrderStage;
    const timelineOrder: OrderStage[] = [
      'Order Placed',
      'Payment Confirmed',
      'Order Confirmed',
      'Processing',
      'Packed',
      'Shipped',
      'Out for Delivery',
      'Delivered',
    ];
    const currentIdx = timelineOrder.indexOf(status as OrderStage);
    if (currentIdx !== -1) {
      order.trackingSteps = timelineOrder.map((title, idx) => ({
        title,
        date: idx <= currentIdx ? (idx === currentIdx ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Completed') : 'Pending',
        completed: idx <= currentIdx,
      }));
    }
    if (status === 'Delivered' && order.paymentMethod === 'cod') {
      order.paymentStatus = 'paid';
      const tx = db.paymentTransactions.find((t) => t.orderId === order.id);
      if (tx) {
        tx.status = 'captured';
        tx.updatedAt = new Date().toISOString();
      }
    }
    pushNotification(db, {
      audience: 'customer',
      userId: order.userId,
      userEmail: order.customerEmail,
      category: 'order',
      title: `Order ${order.id} is now ${status}`,
      message: `Your order status changed from ${beforeStatus} to ${status}.`,
      linkId: order.id,
    });
  }

  // Only allow finance/owner or payments.refund permission to manually alter paymentStatus
  if (paymentStatus) {
    const canModifyPay =
      actor.isSuperAdmin ||
      req.adminPermissions?.includes('payments.refund') ||
      req.adminPermissions?.includes('finance.view');
    if (canModifyPay) order.paymentStatus = paymentStatus;
  }

  if (courierProvider !== undefined || trackingNumber !== undefined) {
    order.courierDetails = {
      provider: courierProvider ? String(courierProvider).trim() : order.courierDetails?.provider || 'Manual Courier',
      trackingNumber: trackingNumber ? String(trackingNumber).trim() : order.courierDetails?.trackingNumber || '',
      trackingMode: 'manual',
      trackingUrl: trackingUrl ? String(trackingUrl).trim() : order.courierDetails?.trackingUrl,
      estimatedDelivery: estimatedDelivery || order.courierDetails?.estimatedDelivery || '2-4 Business Days',
    };
  }

  if (notes !== undefined) order.notes = String(notes);
  if (internalNote && String(internalNote).trim()) {
    order.internalNotes = order.internalNotes || [];
    order.internalNotes.unshift({
      id: `note-${Date.now()}`,
      authorEmail: actor.email,
      text: String(internalNote).trim(),
      createdAt: new Date().toISOString(),
    });
  }

  order.updatedAt = new Date().toISOString();
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Updated Order',
    recordId: order.id,
    before: { status: beforeStatus },
    after: { status: order.orderStatus, courier: order.courierDetails },
    details: `Order ${order.id} updated (${beforeStatus} -> ${order.orderStatus}).`,
  });
  saveDB(db);
  res.json({ success: true, order });
});

app.get('/api/admin/payments', requirePermission('payments.view', 'finance.view'), (_req, res) => {
  const db = getDB();
  res.json({
    transactions: db.paymentTransactions,
    orders: db.orders,
    gatewayStatus: getIntegrationsStatus(),
  });
});

app.post('/api/admin/orders/:id/refund', requirePermission('payments.refund'), async (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (order.paymentStatus === 'refunded') {
    return res.status(400).json({ error: 'Order has already been refunded.' });
  }

  let gatewayRefundId: string | undefined;
  if (order.gatewayPaymentId && getIntegrationsStatus().razorpayConfigured) {
    const rzp = await createRazorpayRefund(order.gatewayPaymentId, order.total);
    if (rzp.configured && !rzp.ok) {
      return res.status(502).json({ error: rzp.error || 'Razorpay refund failed.' });
    }
    if (rzp.ok) gatewayRefundId = rzp.refund.id;
  }

  const now = new Date().toISOString();
  order.paymentStatus = 'refunded';
  order.orderStatus = 'Refunded';
  order.updatedAt = now;

  const tx = db.paymentTransactions.find((t) => t.orderId === order.id);
  if (tx) {
    tx.status = 'refunded';
    tx.refundId = gatewayRefundId || `MANUAL-REF-${Date.now().toString().slice(-6)}`;
    tx.refundAmount = order.total;
    tx.updatedAt = now;
  }

  pushNotification(db, {
    audience: 'customer',
    userId: order.userId,
    userEmail: order.customerEmail,
    category: 'payment',
    title: `Refund Processed: ${order.id}`,
    message: `A refund of ₹${order.total.toLocaleString()} has been processed for Order ${order.id}.`,
    linkId: order.id,
  });

  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Processed Order Refund',
    recordId: order.id,
    after: { refundAmount: order.total, gatewayRefundId },
    details: `Refunded ₹${order.total} for Order ${order.id}.`,
  });
  saveDB(db);
  res.json({ success: true, order, gatewayRefundId });
});

app.get('/api/admin/returns', requirePermission('returns.manage', 'orders.view'), (_req, res) => {
  const db = getDB();
  res.json({ returns: db.returnRequests });
});

app.patch('/api/admin/returns/:id', requirePermission('returns.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const ret = db.returnRequests.find((r) => r.id === req.params.id);
  if (!ret) return res.status(404).json({ error: 'Return request not found.' });

  const { status, pickupCourier, pickupDate, pickupTrackingId, adminNotes } = req.body;
  const prevStatus = ret.status;
  if (status) ret.status = status;
  if (pickupCourier || pickupDate || pickupTrackingId) {
    ret.pickupDetails = {
      courier: pickupCourier || ret.pickupDetails?.courier || 'Manual Reverse Pickup',
      pickupDate: pickupDate || ret.pickupDetails?.pickupDate || new Date().toISOString().slice(0, 10),
      trackingId: pickupTrackingId || ret.pickupDetails?.trackingId,
    };
  }
  if (adminNotes !== undefined) ret.adminNotes = String(adminNotes);

  const order = db.orders.find((o) => o.id === ret.orderId);

  // SELECTIVE INVENTORY RESTORATION: Restore stock ONLY when explicitly marked received_eligible (and not restored twice)
  if (ret.status === 'received_eligible' && !ret.inventoryRestored && order) {
    for (const item of order.items) {
      if (ret.productId && item.productId !== ret.productId) continue;
      const prod = db.products.find((p) => p.id === item.productId);
      if (prod) {
        const prevProdStock = prod.stockQuantity;
        adjustVariantStock(db, {
          product: prod,
          size: item.size,
          color: item.color,
          delta: item.quantity,
          reason: 'return_restock',
          referenceId: ret.id,
          actorEmail: actor.email,
        });
        if (prevProdStock === 0 && prod.stockQuantity > 0) {
          db.users.forEach((u) => {
            if (u.stockAlerts?.includes(prod.id)) {
              pushNotification(db, {
                audience: 'customer',
                userId: u.id,
                userEmail: u.email,
                category: 'stock',
                title: `Back in Stock: ${prod.name}`,
                message: `${prod.name} is back in stock (${prod.stockQuantity} pieces available).`,
                linkId: prod.id,
              });
            }
          });
        }
      }
    }
    ret.inventoryRestored = true;
    if (order) order.orderStatus = 'Returned';
  }

  if (ret.status === 'refund_initiated' && order) {
    order.orderStatus = 'Refund Initiated';
    order.paymentStatus = 'refund_initiated';
  } else if (ret.status === 'refunded' && order) {
    order.orderStatus = 'Refunded';
    order.paymentStatus = 'refunded';
  }

  ret.updatedAt = new Date().toISOString();

  pushNotification(db, {
    audience: 'customer',
    userEmail: ret.customerEmail,
    category: 'return',
    title: `Return Update (${ret.id}): ${ret.status.replace(/_/g, ' ')}`,
    message: `Your ${ret.type} request for order ${ret.orderId} is now "${ret.status.replace(/_/g, ' ')}".`,
    linkId: ret.id,
  });

  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Updated Return Request',
    recordId: ret.id,
    before: { status: prevStatus },
    after: { status: ret.status, inventoryRestored: ret.inventoryRestored },
    details: `Return ${ret.id} (${ret.orderId}) -> ${ret.status}. Restock: ${ret.inventoryRestored}.`,
  });
  saveDB(db);
  res.json({ success: true, returnRequest: ret });
});

// =================== ADMIN 6: CUSTOMERS (ARCHIVAL INSTEAD OF DESTRUCTIVE DELETE) ===================

app.get('/api/admin/customers', requirePermission('customers.view', 'customers.manage'), (_req, res) => {
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
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status || 'active',
        joined: u.createdAt,
        addresses: u.addresses || [],
        loyaltyPoints: u.loyaltyPoints || 0,
        internalNotes: u.internalNotes || '',
        orderCount: userOrders.length,
        deliveredOrdersCount: userOrders.filter((o) => o.orderStatus === 'Delivered').length,
        activeOrdersCount: userOrders.filter((o) => !['Delivered', 'Cancelled', 'Returned', 'Refunded'].includes(o.orderStatus)).length,
        hasDeliveredOrders: userOrders.some((o) => o.orderStatus === 'Delivered'),
        totalSpent,
        orders: userOrders.map(sanitizeOrderForPublic),
      };
    });
  res.json({ customers });
});

app.get('/api/admin/customers/export/csv', requirePermission('customers.view', 'customers.manage', 'reports.view'), (_req, res) => {
  const db = getDB();
  const headers = ['id', 'name', 'email', 'phone', 'status', 'orders', 'totalSpent', 'loyaltyPoints', 'joined'];
  const rows = db.users
    .filter((u) => u.role === 'customer')
    .map((u) => {
      const orders = db.orders.filter((o) => o.userId === u.id || o.customerEmail === u.email);
      const spend = orders.filter((o) => o.orderStatus !== 'Cancelled').reduce((s, o) => s + o.total, 0);
      return [u.id, u.name, u.email, u.phone || '', u.status || 'active', orders.length, spend, u.loyaltyPoints || 0, u.createdAt || ''];
    });
  const csv = '\uFEFF' + buildCsv(headers, rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="zohra_customers_${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

app.put('/api/admin/customers/:id', requirePermission('customers.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const customer = db.users.find((u) => u.id === req.params.id && u.role === 'customer');
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { name, email, phone, status, internalNotes } = req.body;
  if (email !== undefined) {
    const normalized = String(email).trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) return res.status(400).json({ error: 'Valid email is required.' });
    if (db.users.some((u) => u.id !== customer.id && u.email.toLowerCase() === normalized)) {
      return res.status(400).json({ error: `Email ${normalized} is already registered.` });
    }
    customer.email = normalized;
  }
  if (name && String(name).trim()) customer.name = String(name).trim();
  if (phone !== undefined) customer.phone = String(phone).trim() || undefined;
  if (internalNotes !== undefined) customer.internalNotes = String(internalNotes);
  if (status && ['active', 'blocked', 'suspended', 'archived'].includes(status)) {
    customer.status = status;
    if (status !== 'active') revokeSessionsForUser(customer.id, customer.email);
  }

  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Updated Customer Record',
    recordId: customer.id,
    details: `Updated profile/notes/status for ${customer.email}.`,
  });
  saveDB(db);
  res.json({ success: true, customer: sanitizeUserForPublic(customer) });
});

app.patch('/api/admin/customers/:id/status', requirePermission('customers.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const user = db.users.find((u) => u.id === req.params.id && u.role === 'customer');
  if (!user) return res.status(404).json({ error: 'Customer not found' });

  const { status } = req.body;
  if (!['active', 'blocked', 'suspended', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Status must be active, blocked, suspended, or archived' });
  }
  user.status = status;
  if (status !== 'active') revokeSessionsForUser(user.id, user.email);
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Updated Customer Status',
    recordId: user.id,
    after: { status },
    details: `Customer ${user.email} status set to ${status}.`,
  });
  saveDB(db);
  res.json({ success: true, user: sanitizeUserForPublic(user) });
});

// Safe archival instead of hard deleting customers who have orders/transaction records!
app.delete('/api/admin/customers/:id', requirePermission('customers.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const customer = db.users.find((u) => u.id === req.params.id && u.role === 'customer');
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const hasOrders = db.orders.some(
    (o) => o.userId === customer.id || o.customerEmail.toLowerCase() === customer.email.toLowerCase()
  );

  revokeSessionsForUser(customer.id, customer.email);

  if (hasOrders) {
    customer.status = 'archived';
    logAudit(db, {
      adminEmail: actor.email,
      actorId: actor.id,
      action: 'Archived Customer (Preserved Orders)',
      recordId: customer.id,
      details: `Archived ${customer.email} instead of deleting to preserve historical invoices and transactions.`,
    });
    saveDB(db);
    return res.json({
      success: true,
      archived: true,
      message: `Customer ${customer.name} archived safely to preserve existing order & invoice records.`,
    });
  }

  db.users = db.users.filter((u) => u.id !== customer.id);
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Deleted Unused Customer Account',
    recordId: customer.id,
    details: `Removed customer ${customer.email} (zero transaction history).`,
  });
  saveDB(db);
  res.json({ success: true, archived: false, message: `Customer ${customer.name} removed.` });
});

// =================== ADMIN 7 & 8: STORE PARTNERS, STAFF ROLES & PERMISSIONS ===================

app.get('/api/admin/team', requirePermission('team.manage', 'staff.manage', 'overview.view'), (_req, res) => {
  const db = getDB();
  const admins = db.users
    .filter((u) => u.role === 'admin')
    .map((u) => {
      const isSuper = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || !!u.isSuperAdmin;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        adminRole: u.adminRole || (isSuper ? 'primary_owner' : 'store_partner'),
        permissions: resolveEffectivePermissions(u, SUPER_ADMIN_EMAIL),
        isSuperAdmin: isSuper,
        status: u.status || 'active',
        createdAt: u.createdAt,
      };
    });
  res.json({
    admins,
    primaryOwnerEmail: SUPER_ADMIN_EMAIL,
    rolePresets: ROLE_PRESET_PERMISSIONS,
    allPermissions: ALL_PERMISSIONS,
  });
});

app.post('/api/admin/team/add', requirePermission('team.manage', 'staff.manage'), (req: AdminRequest, res) => {
  const actor = req.adminUser!;
  const isOwner = actor.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || !!actor.isSuperAdmin;
  const { name, email, password, phone, adminRole, permissions } = req.body;

  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!password || String(password).length < 8) {
    return res.status(400).json({ error: 'A strong initial password (min 8 characters) is required. Default passwords are disabled.' });
  }

  const targetRole: AdminRolePreset =
    adminRole && adminRole !== 'primary_owner' && ROLE_PRESET_PERMISSIONS[adminRole as AdminRolePreset]
      ? (adminRole as AdminRolePreset)
      : 'store_partner';

  // Non-owners cannot grant privileges they do not themselves hold
  const requestedPerms: AdminPermission[] = Array.isArray(permissions)
    ? permissions.filter((p): p is AdminPermission => ALL_PERMISSIONS.includes(p) && p !== 'ownership.transfer')
    : [...ROLE_PRESET_PERMISSIONS[targetRole]];

  if (!isOwner) {
    const callerPerms = req.adminPermissions || [];
    const illegal = requestedPerms.find((p) => !callerPerms.includes(p));
    if (illegal) {
      return res.status(403).json({
        error: `Privilege escalation blocked: you cannot grant permission "${illegal}" that you do not hold.`,
      });
    }
  }

  const normalized = String(email).trim().toLowerCase();
  const db = getDB();
  const existing = db.users.find((u) => u.email.toLowerCase() === normalized);
  if (existing && existing.role === 'admin' && existing.status === 'active') {
    return res.status(400).json({ error: `${normalized} is already an active team member.` });
  }

  const hashed = hashPassword(String(password));
  if (existing) {
    existing.role = 'admin';
    existing.isSuperAdmin = false;
    existing.adminRole = targetRole;
    existing.permissions = requestedPerms;
    existing.status = 'active';
    existing.name = name ? String(name).trim() : existing.name;
    existing.phone = phone ? String(phone).trim() : existing.phone;
    existing.passwordHash = hashed;
  } else {
    db.users.push({
      id: `admin-${Date.now()}`,
      name: name ? String(name).trim() : 'Store Partner',
      email: normalized,
      phone: phone ? String(phone).trim() : undefined,
      passwordHash: hashed,
      role: 'admin',
      isSuperAdmin: false,
      adminRole: targetRole,
      permissions: requestedPerms,
      status: 'active',
      addresses: [],
      wishlist: [],
      createdAt: new Date().toISOString(),
    });
  }

  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Added Staff/Partner Account',
    after: { email: normalized, role: targetRole, permissions: requestedPerms },
    details: `Authorized ${normalized} with role ${targetRole}.`,
  });
  saveDB(db);
  res.json({ success: true, message: `Added ${normalized} (${targetRole}) with scrypt-secured credentials.` });
});

app.put('/api/admin/team/:id', requirePermission('team.manage', 'staff.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const isCallerOwner = actor.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || !!actor.isSuperAdmin;
  const targetUser = db.users.find((u) => u.id === req.params.id && u.role === 'admin');
  if (!targetUser) return res.status(404).json({ error: 'Staff member not found.' });

  const isTargetOwner =
    targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || !!targetUser.isSuperAdmin;
  if (isTargetOwner && !isCallerOwner) {
    return res.status(403).json({ error: 'Partners/staff cannot modify the Primary Store Owner.' });
  }

  const { name, phone, password, status, adminRole, permissions } = req.body;
  const before = { adminRole: targetUser.adminRole, permissions: targetUser.permissions, status: targetUser.status };

  if (adminRole && adminRole !== 'primary_owner' && !isTargetOwner) {
    if (ROLE_PRESET_PERMISSIONS[adminRole as AdminRolePreset]) {
      targetUser.adminRole = adminRole as AdminRolePreset;
    }
  }
  if (Array.isArray(permissions) && !isTargetOwner) {
    const clean = permissions.filter((p): p is AdminPermission => ALL_PERMISSIONS.includes(p) && p !== 'ownership.transfer');
    if (!isCallerOwner) {
      const illegal = clean.find((p) => !(req.adminPermissions || []).includes(p));
      if (illegal) {
        return res.status(403).json({ error: `Cannot assign unowned permission "${illegal}".` });
      }
    }
    targetUser.permissions = clean;
  }

  if (name && String(name).trim()) targetUser.name = String(name).trim();
  if (phone !== undefined) targetUser.phone = String(phone).trim() || undefined;
  if (password && String(password).trim().length >= 8) {
    targetUser.passwordHash = hashPassword(String(password).trim());
    revokeSessionsForUser(targetUser.id, targetUser.email);
  }
  if (status && ['active', 'blocked', 'suspended'].includes(status)) {
    if (isTargetOwner && status !== 'active') {
      return res.status(400).json({ error: 'Primary Owner cannot be suspended or blocked.' });
    }
    targetUser.status = status;
    if (status !== 'active') revokeSessionsForUser(targetUser.id, targetUser.email);
  }

  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Updated Team Member Permissions/Profile',
    recordId: targetUser.id,
    before,
    after: { adminRole: targetUser.adminRole, permissions: targetUser.permissions, status: targetUser.status },
    details: `Updated ${targetUser.email}.`,
  });
  saveDB(db);
  res.json({ success: true, message: `Updated ${targetUser.email}.` });
});

app.post('/api/admin/team/:id/toggle', requirePermission('team.manage', 'staff.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const targetUser = db.users.find((u) => u.id === req.params.id && u.role === 'admin');
  if (!targetUser) return res.status(404).json({ error: 'Staff member not found.' });
  if (targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || targetUser.isSuperAdmin) {
    return res.status(403).json({ error: 'Primary Owner status cannot be toggled.' });
  }
  targetUser.status = targetUser.status === 'active' ? 'suspended' : 'active';
  if (targetUser.status !== 'active') revokeSessionsForUser(targetUser.id, targetUser.email);
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Toggled Staff Status',
    recordId: targetUser.id,
    after: { status: targetUser.status },
    details: `Set ${targetUser.email} status to ${targetUser.status}.`,
  });
  saveDB(db);
  res.json({ success: true, status: targetUser.status });
});

app.delete('/api/admin/team/:id', requirePermission('team.manage', 'staff.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const targetUser = db.users.find((u) => u.id === req.params.id && u.role === 'admin');
  if (!targetUser) return res.status(404).json({ error: 'Team member not found.' });
  if (targetUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || targetUser.isSuperAdmin) {
    return res.status(403).json({ error: 'Primary Store Owner cannot be deleted or demoted.' });
  }

  db.users = db.users.filter((u) => u.id !== targetUser.id);
  revokeSessionsForUser(targetUser.id, targetUser.email);
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Removed Team Member',
    recordId: targetUser.id,
    details: `Removed ${targetUser.email} and revoked all active sessions.`,
  });
  saveDB(db);
  res.json({ success: true, message: `Removed ${targetUser.email} and revoked active sessions.` });
});

app.post('/api/admin/config/super-admin-email', requirePermission('ownership.transfer'), (req: AdminRequest, res) => {
  const actor = req.adminUser!;
  if (actor.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase() && !actor.isSuperAdmin) {
    return res.status(403).json({ error: 'Only Primary Owner can transfer ownership.' });
  }
  const { newEmail } = req.body;
  if (!newEmail || !String(newEmail).includes('@')) {
    return res.status(400).json({ error: 'Valid Gmail address required.' });
  }
  const normalized = String(newEmail).trim().toLowerCase();
  const oldEmail = SUPER_ADMIN_EMAIL;
  setSuperAdminEmail(normalized);

  const db = getDB();
  db.users.forEach((u) => {
    if (u.role === 'admin' && u.email.toLowerCase() !== normalized) {
      u.isSuperAdmin = false;
      if (u.adminRole === 'primary_owner') u.adminRole = 'store_partner';
    }
  });
  let newOwner = db.users.find((u) => u.email.toLowerCase() === normalized);
  if (!newOwner) {
    newOwner = {
      id: 'user-owner-super-admin',
      name: 'Primary Store Owner',
      email: normalized,
      role: 'admin',
      isSuperAdmin: true,
      adminRole: 'primary_owner',
      status: 'active',
      addresses: [],
      wishlist: [],
      createdAt: new Date().toISOString(),
    };
    db.users.unshift(newOwner);
  } else {
    newOwner.role = 'admin';
    newOwner.isSuperAdmin = true;
    newOwner.adminRole = 'primary_owner';
    newOwner.status = 'active';
  }
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Ownership Transferred',
    details: `Primary Ownership transferred from ${oldEmail} to ${normalized}.`,
  });
  saveDB(db);
  res.json({ success: true, superAdminEmail: normalized, message: `Primary ownership transferred to ${normalized}.` });
});

// =================== ADMIN 11: WHOLESALE MANAGEMENT ===================

app.get('/api/admin/wholesale', requirePermission('wholesale.manage'), (_req, res) => {
  const db = getDB();
  res.json({
    accounts: db.wholesaleAccounts,
    orders: db.wholesaleOrders,
  });
});

app.patch('/api/admin/wholesale/accounts/:id', requirePermission('wholesale.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const acc = db.wholesaleAccounts.find((w) => w.id === req.params.id);
  if (!acc) return res.status(404).json({ error: 'Wholesale account not found.' });

  const { status, discountTierPercent, notes } = req.body;
  if (status && ['pending', 'approved', 'rejected', 'suspended'].includes(status)) acc.status = status;
  if (discountTierPercent !== undefined) acc.discountTierPercent = Math.min(70, Math.max(5, Number(discountTierPercent)));
  if (notes !== undefined) acc.notes = String(notes);
  acc.updatedAt = new Date().toISOString();

  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Updated Wholesale Buyer',
    recordId: acc.id,
    after: { status: acc.status, discountTierPercent: acc.discountTierPercent },
    details: `${acc.businessName} status updated to ${acc.status}.`,
  });
  saveDB(db);
  res.json({ success: true, account: acc });
});

app.patch('/api/admin/wholesale/orders/:id', requirePermission('wholesale.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const wsOrder = db.wholesaleOrders.find((w) => w.id === req.params.id);
  if (!wsOrder) return res.status(404).json({ error: 'Wholesale order request not found.' });
  const { status, adminQuoteNotes } = req.body;
  if (status) wsOrder.status = status;
  if (adminQuoteNotes !== undefined) wsOrder.adminQuoteNotes = String(adminQuoteNotes);
  wsOrder.updatedAt = new Date().toISOString();
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Updated Wholesale Order Quote',
    recordId: wsOrder.id,
    after: { status: wsOrder.status },
    details: `Wholesale request ${wsOrder.id} -> ${wsOrder.status}.`,
  });
  saveDB(db);
  res.json({ success: true, wholesaleOrder: wsOrder });
});

// =================== ADMIN 12 & 13: COUPONS & REVIEWS ===================

app.get('/api/admin/coupons', requirePermission('coupons.manage'), (_req, res) => {
  const db = getDB();
  res.json({ coupons: db.coupons });
});

app.post('/api/admin/coupons', requirePermission('coupons.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const {
    code,
    discountType,
    discountValue,
    minOrderValue,
    maxDiscountAmount,
    description,
    expiryDate,
    festivalOffer,
    usageLimitTotal,
    usageLimitPerUser,
    firstOrderOnly,
    returningCustomerOnly,
    vipOnly,
    eligibleCategories,
  } = req.body;
  if (!code || !discountValue || minOrderValue === undefined) {
    return res.status(400).json({ error: 'Code, discount value, and min order value are required' });
  }
  const normalizedCode = String(code).trim().toUpperCase();
  if (db.coupons.some((c) => c.code === normalizedCode)) {
    return res.status(400).json({ error: 'Coupon code already exists' });
  }
  const newCoupon: Coupon = {
    code: normalizedCode,
    discountType: discountType === 'fixed' ? 'fixed' : 'percentage',
    discountValue: Number(discountValue),
    minOrderValue: Math.max(0, Number(minOrderValue)),
    maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
    description: String(description || `${discountValue}% off`).trim(),
    expiryDate: expiryDate || '2026-12-31',
    festivalOffer: !!festivalOffer,
    isActive: true,
    usedCount: 0,
    usageLimitTotal: usageLimitTotal ? Number(usageLimitTotal) : undefined,
    usageLimitPerUser: usageLimitPerUser ? Number(usageLimitPerUser) : undefined,
    firstOrderOnly: !!firstOrderOnly,
    returningCustomerOnly: !!returningCustomerOnly,
    vipOnly: !!vipOnly,
    eligibleCategories: Array.isArray(eligibleCategories) && eligibleCategories.length ? eligibleCategories : undefined,
    usedByEmails: {},
  };
  db.coupons.unshift(newCoupon);
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Created Coupon', recordId: newCoupon.code, after: newCoupon, details: `Created ${newCoupon.code}` });
  saveDB(db);
  res.json({ success: true, coupon: newCoupon });
});

app.patch('/api/admin/coupons/:code/toggle', requirePermission('coupons.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const coupon = db.coupons.find((c) => c.code === req.params.code.toUpperCase());
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
  coupon.isActive = !coupon.isActive;
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Toggled Coupon', recordId: coupon.code, details: `${coupon.code} active=${coupon.isActive}` });
  saveDB(db);
  res.json({ success: true, coupon });
});

app.delete('/api/admin/coupons/:code', requirePermission('coupons.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  db.coupons = db.coupons.filter((c) => c.code !== req.params.code.toUpperCase());
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Deleted Coupon', recordId: req.params.code.toUpperCase(), details: `Deleted coupon ${req.params.code}` });
  saveDB(db);
  res.json({ success: true });
});

app.get('/api/admin/reviews', requirePermission('reviews.manage'), (_req, res) => {
  const db = getDB();
  const enriched = db.reviews.map((r) => ({
    ...r,
    productName: db.products.find((p) => p.id === r.productId)?.name || r.productId,
  }));
  res.json({ reviews: enriched });
});

app.patch('/api/admin/reviews/:id', requirePermission('reviews.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const rev = db.reviews.find((r) => r.id === req.params.id);
  if (!rev) return res.status(404).json({ error: 'Review not found.' });

  const { moderationStatus, replyMessage } = req.body;
  if (moderationStatus && ['approved', 'pending', 'hidden'].includes(moderationStatus)) {
    rev.moderationStatus = moderationStatus;
  }
  if (replyMessage && String(replyMessage).trim()) {
    rev.adminReply = {
      author: actor.name || actor.email,
      message: String(replyMessage).trim(),
      repliedAt: new Date().toISOString(),
    };
  }

  const prod = db.products.find((p) => p.id === rev.productId);
  if (prod) {
    const visible = db.reviews.filter((r) => r.productId === prod.id && r.moderationStatus !== 'hidden');
    prod.reviewCount = visible.length;
    prod.rating = visible.length ? Number((visible.reduce((s, r) => s + r.rating, 0) / visible.length).toFixed(1)) : 5.0;
  }

  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Moderated Review',
    recordId: rev.id,
    details: `Review ${rev.id} status=${rev.moderationStatus}`,
  });
  saveDB(db);
  res.json({ success: true, review: rev });
});

app.delete('/api/admin/reviews/:id', requirePermission('reviews.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const rev = db.reviews.find((r) => r.id === req.params.id);
  if (!rev) return res.status(404).json({ error: 'Review not found.' });
  db.reviews = db.reviews.filter((r) => r.id !== rev.id);
  saveDB(db);
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Deleted Review', recordId: rev.id, details: `Removed review ${rev.id}` });
  res.json({ success: true });
});

// =================== ADMIN 14 & 15: REPORTS, ANALYTICS & REAL PROFIT/LOSS ===================

app.get('/api/admin/analytics/reports', requirePermission('reports.view', 'finance.view'), (_req, res) => {
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

  const productTally: Record<string, { id: string; sku: string; name: string; category: string; qty: number; revenue: number; costRecorded: number }> = {};
  validOrders.forEach((o) => {
    o.items.forEach((item) => {
      const prod = db.products.find((p) => p.id === item.productId);
      if (!productTally[item.productId]) {
        productTally[item.productId] = {
          id: item.productId,
          sku: item.sku || prod?.sku || item.productId,
          name: item.name,
          category: prod?.category || 'Ethnic Wear',
          qty: 0,
          revenue: 0,
          costRecorded: 0,
        };
      }
      const unitCost = item.costPrice && item.costPrice > 0 ? item.costPrice : prod?.costPrice || 0;
      productTally[item.productId].qty += item.quantity;
      productTally[item.productId].revenue += item.price * item.quantity;
      productTally[item.productId].costRecorded += unitCost * item.quantity;
    });
  });

  const topProducts = Object.values(productTally).sort((a, b) => b.revenue - a.revenue);
  const categoryTally: Record<string, { name: string; count: number; revenue: number }> = {};
  topProducts.forEach((p) => {
    if (!categoryTally[p.category]) categoryTally[p.category] = { name: p.category, count: 0, revenue: 0 };
    categoryTally[p.category].count += p.qty;
    categoryTally[p.category].revenue += p.revenue;
  });

  const pendingPayments = db.orders.filter((o) => o.paymentStatus === 'pending').reduce((s, o) => s + o.total, 0);

  res.json({
    dailySales,
    weeklySales,
    monthlySales,
    yearlySales,
    totalRevenue: validOrders.reduce((s, o) => s + o.total, 0),
    totalOrders: db.orders.length,
    pendingPayments,
    topProducts,
    topCategories: Object.values(categoryTally).sort((a, b) => b.revenue - a.revenue),
    pnl: computeProfitAndLoss(db),
  });
});

app.get('/api/admin/finance/pnl', requirePermission('finance.view', 'reports.view'), (req, res) => {
  const db = getDB();
  const from = req.query.from ? String(req.query.from) : undefined;
  const to = req.query.to ? String(req.query.to) : undefined;
  res.json(computeProfitAndLoss(db, from, to));
});

app.post('/api/admin/finance/expenses', requirePermission('finance.view'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const { date, category, description, amount } = req.body;
  const numAmount = Number(amount);
  if (!description || !numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid expense description and positive INR amount are required.' });
  }
  const exp = {
    id: `exp-${Date.now()}`,
    date: date || new Date().toISOString().slice(0, 10),
    category: category || 'operations',
    description: String(description).trim(),
    amount: numAmount,
    recordedBy: actor.email,
    createdAt: new Date().toISOString(),
  };
  db.expenses.unshift(exp);
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Recorded Expense',
    recordId: exp.id,
    after: exp,
    details: `Recorded ₹${numAmount} (${exp.category}): ${exp.description}`,
  });
  saveDB(db);
  res.json({ success: true, expense: exp, pnl: computeProfitAndLoss(db) });
});

app.delete('/api/admin/finance/expenses/:id', requirePermission('finance.view'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  db.expenses = db.expenses.filter((e) => e.id !== req.params.id);
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Removed Expense', recordId: req.params.id, details: `Deleted expense ${req.params.id}` });
  saveDB(db);
  res.json({ success: true, pnl: computeProfitAndLoss(db) });
});

// =================== ADMIN 17 & 18 & 19 & 20: CONTENT, SETTINGS, SECURITY LOGS, BACKUPS ===================

app.get('/api/admin/settings', requirePermission('settings.manage', 'content.manage'), (_req, res) => {
  const db = getDB();
  res.json({ settings: db.settings });
});

app.put('/api/admin/settings', requirePermission('settings.manage', 'content.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const before = { brandName: db.settings.brandName, returnPolicyDays: db.settings.returnPolicyDays };
  db.settings = {
    ...db.settings,
    ...req.body,
    socialLinks: {
      ...db.settings.socialLinks,
      ...(req.body?.socialLinks || {}),
    },
  };
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Updated Store Settings / CMS Content',
    before,
    after: { brandName: db.settings.brandName, returnPolicyDays: db.settings.returnPolicyDays },
    details: 'Updated website store branding, policies, banners, or FAQs.',
  });
  saveDB(db);
  res.json({ success: true, settings: db.settings });
});

app.get('/api/admin/logs', requirePermission('security.logs'), (_req, res) => {
  const db = getDB();
  res.json({ logs: db.activityLogs, activeSessions: listActiveSessions() });
});

app.delete('/api/admin/sessions/:userId', requirePermission('security.logs', 'team.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  revokeSessionsForUser(req.params.userId);
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Revoked User Sessions',
    recordId: req.params.userId,
    details: `Revoked all active sessions for user ${req.params.userId}.`,
  });
  saveDB(db);
  res.json({ success: true });
});

app.get('/api/admin/support', requirePermission('customers.manage', 'customers.view', 'security.logs'), (_req, res) => {
  const db = getDB();
  res.json({ inquiries: db.supportInquiries });
});

app.patch('/api/admin/support/:id', requirePermission('customers.manage', 'security.logs'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const inq = db.supportInquiries.find((i) => i.id === req.params.id);
  if (!inq) return res.status(404).json({ error: 'Inquiry not found' });
  inq.status = inq.status === 'open' ? 'resolved' : 'open';
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Support Inquiry Update', recordId: inq.id, details: `Marked ${inq.id} as ${inq.status}` });
  saveDB(db);
  res.json({ success: true, inquiry: inq });
});

// Backup & Recovery APIs
app.get('/api/admin/backups', requirePermission('backups.manage'), (_req, res) => {
  const db = getDB();
  res.json({
    backups: db.backups,
    retentionCount: db.settings.backupRetentionCount || 15,
    backupsDir: 'data/backups',
  });
});

app.post('/api/admin/backups', requirePermission('backups.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const record = createBackupFile(db, actor.email, 'manual');
  logAudit(db, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Created Database Backup',
    recordId: record.id,
    details: `Snapshot ${record.filename} (${record.sizeBytes} bytes, checksum ${record.checksum.slice(0, 12)}...).`,
  });
  saveDB(db);
  res.json({ success: true, backup: record });
});

app.post('/api/admin/backups/:id/verify', requirePermission('backups.manage'), (req, res) => {
  const db = getDB();
  const rec = db.backups.find((b) => b.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'Backup record not found.' });
  const check = verifyBackupFile(rec);
  res.json({
    valid: check.valid,
    error: check.error,
    counts: rec.counts,
    checksum: rec.checksum,
  });
});

app.post('/api/admin/backups/:id/restore', requirePermission('backups.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const rec = db.backups.find((b) => b.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'Backup record not found.' });

  const check = verifyBackupFile(rec);
  if (!check.valid || !check.payload) {
    return res.status(400).json({ error: check.error || 'Backup integrity verification failed.' });
  }

  // Create safety pre-restore snapshot first!
  const safety = createBackupFile(db, actor.email, 'pre_restore');
  const currentBackups = [...db.backups];

  const restoredDB: DatabaseSchema = {
    ...check.payload,
    backups: currentBackups,
  };

  logAudit(restoredDB, {
    adminEmail: actor.email,
    actorId: actor.id,
    action: 'Restored Database Backup',
    recordId: rec.id,
    details: `Restored state from ${rec.filename}. Pre-restore safety snapshot saved as ${safety.filename}.`,
  });

  saveDB(restoredDB);
  res.json({
    success: true,
    restoredBackupId: rec.id,
    safetyBackupId: safety.id,
    message: `Restored backup ${rec.id}. Safety rollback point created (${safety.id}).`,
  });
});

// Download single backup JSON safely
app.get('/api/admin/backups/:id/download', requirePermission('backups.manage'), (req, res) => {
  const db = getDB();
  const rec = db.backups.find((b) => b.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'Backup record not found.' });
  const fullPath = path.join(BACKUPS_DIR, rec.filename);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Backup file missing.' });
  res.download(fullPath, rec.filename);
});

// =================== SECTION A, B, C: FASHION INTELLIGENCE, SALES RETENTION & CUSTOMER EXPERIENCE ===================

app.get('/api/lookbooks', (_req, res) => {
  const db = getDB();
  const activeLookbooks = (db.lookbooks || [])
    .filter((l) => l.active)
    .map((lb) => ({
      ...lb,
      products: lb.productIds
        .map((pid) => db.products.find((p) => p.id === pid && isProductVisibleToPublic(p)))
        .filter((p): p is Product => Boolean(p))
        .map((p) => enrichProductForPublic(db, p, false))
        .map(({ costPrice: _cp, supplier: _sp, wholesalePrice: _wp, wholesaleMoq: _wm, ...pub }) => pub),
    }));
  res.json({ lookbooks: activeLookbooks });
});

app.get('/api/bundles', (_req, res) => {
  const db = getDB();
  res.json({ bundles: (db.bundles || []).filter((b) => b.active) });
});

app.get('/api/flash-sales/active', (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req);
  const vip = session ? getCustomerVipStatus(db, session.email, session.userId) : null;
  const earlyAccess = Boolean(vip?.tier?.earlyAccessFlashSales);
  const nowTs = Date.now();

  const activeSales = (db.flashSales || []).filter((rule) => {
    if (!rule.active) return false;
    const s = new Date(rule.startsAt).getTime();
    const e = new Date(rule.endsAt).getTime();
    if (isNaN(s) || isNaN(e)) return false;
    const earlyMs = earlyAccess && rule.vipEarlyAccessHours ? rule.vipEarlyAccessHours * 3600000 : 0;
    return nowTs >= s - earlyMs && nowTs <= e;
  });

  const saleProducts = db.products
    .filter(isProductVisibleToPublic)
    .map((p) => enrichProductForPublic(db, p, earlyAccess))
    .filter((p) => Boolean(p.flashSalePrice))
    .map(({ costPrice: _cp, supplier: _sp, wholesalePrice: _wp, wholesaleMoq: _wm, ...pub }) => pub);

  res.json({ flashSales: activeSales, products: saleProducts, isVipEarlyAccess: earlyAccess });
});

app.get('/api/vip-tiers', (_req, res) => {
  const db = getDB();
  res.json({ vipTiers: db.vipTiers || [] });
});

app.get('/api/campaigns/active', (_req, res) => {
  const db = getDB();
  const nowTs = Date.now();
  const active = (db.campaigns || []).filter((c) => {
    if (c.status !== 'active') return false;
    const s = new Date(c.startsAt).getTime();
    const e = new Date(c.endsAt).getTime();
    return (!s || nowTs >= s) && (!e || nowTs <= e);
  });
  res.json({ campaigns: active });
});

app.post('/api/size-recommend', (req, res) => {
  const { productId, bustIn, waistIn, hipIn, heightInches, weightKg, fitPreference } = req.body;
  const db = getDB();
  const product = productId ? db.products.find((p) => p.id === productId) : undefined;
  const result = recommendGarmentSize(product, {
    bustIn,
    waistIn,
    hipIn,
    heightInches,
    weightKg,
    fitPreference,
  });
  res.json(result);
});

app.post('/api/checkout/preview', (req, res) => {
  const db = getDB();
  const session = getUserFromToken(req);
  const { items, couponCode, giftCardCode, redeemPoints, customerEmail } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.json({
      ok: true,
      subtotal: 0,
      bundleDiscount: 0,
      vipDiscount: 0,
      couponDiscount: 0,
      loyaltyDiscount: 0,
      giftCardDiscount: 0,
      shipping: 0,
      total: 0,
      pointsToEarn: 0,
      vipStatus: getCustomerVipStatus(db, String(customerEmail || session?.email || ''), session?.userId),
    });
  }
  const pricing = evaluateCartPricing(db, {
    items,
    customerEmail: String(customerEmail || session?.email || ''),
    userId: session?.userId,
    couponCode,
    giftCardCode,
    redeemPoints,
    validateStock: false,
  });
  res.json({
    ...pricing,
    lines: pricing.lines.map((l) => ({
      productId: l.product.id,
      name: l.product.name,
      size: l.size,
      color: l.color,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      originalUnitPrice: l.originalUnitPrice,
      flashSaleApplied: l.flashSaleApplied,
      lineTotal: l.lineTotal,
    })),
  });
});

// Digital Gift Cards (Purchase, Validate & My Gift Cards)
app.post('/api/gift-cards/validate', (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'Gift card code is required.' });
  const db = getDB();
  const gc = (db.giftCards || []).find((g) => g.code.toUpperCase() === code);
  if (!gc) return res.status(404).json({ error: 'Gift card code not found.' });
  if (gc.status !== 'active' || gc.currentBalance <= 0) {
    return res.status(400).json({ error: 'This gift card has already been redeemed or disabled.' });
  }
  if (gc.expiresAt && new Date(gc.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This gift card has expired.' });
  }
  res.json({
    valid: true,
    code: gc.code,
    currentBalance: gc.currentBalance,
    recipientName: gc.recipientName,
    expiresAt: gc.expiresAt,
  });
});

app.post('/api/gift-cards/purchase', (req, res) => {
  const { amount, recipientName, recipientEmail, senderName, message } = req.body || {};
  const val = Math.round(Number(amount) || 0);
  if (!val || val < 500 || val > 50000) {
    return res.status(400).json({ error: 'Gift card value must be between ₹500 and ₹50,000.' });
  }
  if (!recipientName || !recipientEmail || !senderName) {
    return res.status(400).json({ error: 'Recipient name, recipient email, and sender name are required.' });
  }
  const db = getDB();
  const session = getUserFromToken(req);
  const now = new Date();
  const expires = new Date(now.getTime() + 365 * 86400000);
  const code = `ZLGC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const card = {
    id: `gc-${Date.now()}`,
    code,
    initialBalance: val,
    currentBalance: val,
    recipientName: String(recipientName).trim(),
    recipientEmail: String(recipientEmail).trim().toLowerCase(),
    senderName: String(senderName).trim(),
    message: message ? String(message).trim() : undefined,
    purchasedByEmail: session?.email?.toLowerCase() || String(senderName).trim(),
    expiresAt: expires.toISOString().slice(0, 10),
    status: 'active' as const,
    createdAt: now.toISOString(),
    transactions: [
      {
        id: `gc-tx-${Date.now()}`,
        date: now.toISOString(),
        amount: val,
        type: 'issued' as const,
        note: `Issued by ${String(senderName).trim()} for ${String(recipientName).trim()}`,
      },
    ],
  };

  db.giftCards.unshift(card);
  pushNotification(db, {
    audience: 'admin',
    category: 'payment',
    title: `Digital Gift Card Issued: ${card.code}`,
    message: `₹${val.toLocaleString()} gift card issued for ${card.recipientName} (${card.recipientEmail}).`,
    linkId: card.id,
  });
  saveDB(db);
  res.json({ success: true, giftCard: card });
});

app.get('/api/user/gift-cards', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Authentication required.' });
  const db = getDB();
  const em = session.email.toLowerCase();
  const cards = (db.giftCards || []).filter(
    (g) => g.recipientEmail.toLowerCase() === em || (g.purchasedByEmail && g.purchasedByEmail.toLowerCase() === em)
  );
  res.json({ giftCards: cards });
});

// Product Questions & Answers
app.get('/api/products/:id/questions', (req, res) => {
  const db = getDB();
  const list = (db.productQuestions || []).filter(
    (q) => q.productId === req.params.id && q.isPublic !== false
  );
  res.json({ questions: list });
});

app.post('/api/products/:id/questions', (req, res) => {
  const db = getDB();
  const prod = db.products.find((p) => p.id === req.params.id);
  if (!prod) return res.status(404).json({ error: 'Product not found.' });
  const { customerName, customerEmail, question } = req.body || {};
  if (!question || String(question).trim().length < 5) {
    return res.status(400).json({ error: 'Please write a clear question (min 5 characters).' });
  }
  const session = getUserFromToken(req);
  const qItem = {
    id: `qa-${Date.now()}`,
    productId: prod.id,
    customerName: String(customerName || session?.email?.split('@')[0] || 'Shopper').trim(),
    customerEmail: customerEmail ? String(customerEmail).trim().toLowerCase() : session?.email,
    question: String(question).trim(),
    createdAt: new Date().toISOString(),
    isPublic: true,
  };
  db.productQuestions.unshift(qItem);
  pushNotification(db, {
    audience: 'admin',
    category: 'promo',
    title: `New Question on ${prod.name}`,
    message: `${qItem.customerName}: "${qItem.question}"`,
    linkId: prod.id,
  });
  saveDB(db);
  res.json({ success: true, question: qItem });
});

// Returning-customer Recently Viewed & Consented Cart Recovery Sync
app.get('/api/user/recently-viewed', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  const db = getDB();
  const user = db.users.find((u) => u.id === session.userId);
  res.json({ recentlyViewedIds: user?.recentlyViewedIds || [] });
});

app.post('/api/user/recently-viewed', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  const productId = String(req.body?.productId || '').trim();
  if (!productId) return res.status(400).json({ error: 'Product ID required' });
  const db = getDB();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.recentlyViewedIds = [productId, ...(user.recentlyViewedIds || []).filter((id) => id !== productId)].slice(0, 12);
  saveDB(db);
  res.json({ recentlyViewedIds: user.recentlyViewedIds });
});

app.get('/api/user/vip-status', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  const db = getDB();
  res.json(getCustomerVipStatus(db, session.email, session.userId));
});

app.put('/api/user/consents', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  const db = getDB();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { abandonedCartConsent, marketingConsent } = req.body || {};
  if (abandonedCartConsent !== undefined) {
    user.abandonedCartConsent = Boolean(abandonedCartConsent);
    if (!user.abandonedCartConsent) {
      // Respect privacy: remove active abandoned cart record when consent is withdrawn
      db.abandonedCarts = (db.abandonedCarts || []).filter((c) => c.userId !== user.id);
    }
  }
  if (marketingConsent !== undefined) {
    user.marketingConsent = Boolean(marketingConsent);
  }
  saveDB(db);
  res.json({ success: true, user: sanitizeUserForPublic(user) });
});

app.post('/api/user/cart/sync', (req, res) => {
  const session = getUserFromToken(req);
  if (!session) return res.status(401).json({ error: 'Authentication required' });
  const db = getDB();
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const itemsInput = Array.isArray(req.body?.items) ? req.body.items : [];
  const savedCartItems: { productId: string; size: string; color: string; quantity: number }[] = itemsInput.map((i: any) => ({
    productId: String(i.productId),
    size: String(i.size || 'M'),
    color: String(i.color || 'Standard'),
    quantity: Math.max(1, Number(i.quantity) || 1),
  }));
  user.savedCart = savedCartItems;

  const now = new Date().toISOString();
  // STRICT CONSENT RULE: Only track in abandonedCarts queue if customer explicitly opted in
  if (user.abandonedCartConsent) {
    if (savedCartItems.length === 0) {
      db.abandonedCarts = (db.abandonedCarts || []).filter((c) => c.userId !== user.id || c.recoveredOrderId);
    } else {
      const detailedItems = savedCartItems
        .map((ci) => {
          const p = db.products.find((pr) => pr.id === ci.productId);
          if (!p) return null;
          return {
            productId: p.id,
            name: p.name,
            size: ci.size,
            color: ci.color,
            quantity: ci.quantity,
            price: getActiveFlashSaleForProduct(db, p, false).effectivePrice,
            image: p.images[0] || '',
          };
        })
        .filter((x: any): x is { productId: string; name: string; size: string; color: string; quantity: number; price: number; image: string } => Boolean(x));

      const subtotal = detailedItems.reduce((s: number, it) => s + it.price * it.quantity, 0);
      const existing = (db.abandonedCarts || []).find((c) => c.userId === user.id && !c.recoveredOrderId);
      if (existing) {
        existing.items = detailedItems;
        existing.subtotal = subtotal;
        existing.lastUpdatedAt = now;
        existing.consentGranted = true;
      } else {
        db.abandonedCarts.unshift({
          id: `abc-${Date.now()}`,
          userId: user.id,
          customerEmail: user.email,
          customerName: user.name,
          items: detailedItems,
          subtotal,
          consentGranted: true,
          consentUpdatedAt: now,
          lastUpdatedAt: now,
        });
      }
    }
  }
  saveDB(db);
  res.json({ success: true, abandonedCartTracked: Boolean(user.abandonedCartConsent) });
});

// Order Support & Complaint Tracking
app.post('/api/orders/:id/complaints', (req, res) => {
  const db = getDB();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const { category, subject, description, priority, customerEmail, customerName } = req.body || {};
  if (!subject || !description) {
    return res.status(400).json({ error: 'Complaint subject and description are required.' });
  }
  const session = getUserFromToken(req);
  const now = new Date().toISOString();
  const complaint = {
    id: `CMP-${Date.now().toString().slice(-6)}`,
    orderId: order.id,
    customerEmail: String(customerEmail || session?.email || order.customerEmail).trim().toLowerCase(),
    customerName: String(customerName || order.customerName).trim(),
    category: (category || 'other') as any,
    subject: String(subject).trim(),
    description: String(description).trim(),
    status: 'open' as const,
    priority: (priority || 'normal') as any,
    messages: [
      {
        id: `msg-${Date.now()}`,
        author: String(customerName || order.customerName).trim(),
        role: 'customer' as const,
        text: String(description).trim(),
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  db.complaints.unshift(complaint);
  pushNotification(db, {
    audience: 'admin',
    category: 'order',
    title: `Order Support Ticket ${complaint.id} (${order.id})`,
    message: `${complaint.customerName}: ${complaint.subject}`,
    linkId: complaint.id,
  });
  saveDB(db);
  res.json({ success: true, complaint });
});

app.get('/api/user/complaints', (req, res) => {
  const session = getUserFromToken(req);
  const emailQuery = String(req.query.email || session?.email || '').trim().toLowerCase();
  if (!emailQuery) return res.status(401).json({ error: 'Authentication or order email required.' });
  const db = getDB();
  const list = (db.complaints || []).filter((c) => c.customerEmail.toLowerCase() === emailQuery);
  res.json({ complaints: list });
});

app.post('/api/complaints/:id/messages', (req, res) => {
  const db = getDB();
  const comp = (db.complaints || []).find((c) => c.id === req.params.id);
  if (!comp) return res.status(404).json({ error: 'Support ticket not found.' });
  const { text, author } = req.body || {};
  if (!text || !String(text).trim()) return res.status(400).json({ error: 'Message text required.' });
  const session = getUserFromToken(req);
  const now = new Date().toISOString();
  comp.messages.push({
    id: `msg-${Date.now()}`,
    author: String(author || comp.customerName || session?.email || 'Customer').trim(),
    role: 'customer',
    text: String(text).trim(),
    createdAt: now,
  });
  comp.updatedAt = now;
  saveDB(db);
  res.json({ success: true, complaint: comp });
});

// AI Shopping Assistant with Human Support Escalation
app.post('/api/ai/shopping-assistant', async (req, res) => {
  const { message, history, escalateToHuman, customerName, customerEmail, orderId } = req.body || {};
  const db = getDB();
  const session = getUserFromToken(req);

  if (escalateToHuman) {
    const email = String(customerEmail || session?.email || '').trim().toLowerCase();
    const name = String(customerName || email.split('@')[0] || 'Shopper').trim();
    if (!email) {
      return res.status(400).json({ error: 'Please share your email so our human stylist team can respond.' });
    }
    const now = new Date().toISOString();
    const transcript = Array.isArray(history)
      ? history.map((h: any) => `${h.role === 'user' ? 'Customer' : 'Assistant'}: ${h.text}`).join('\n')
      : String(message || 'Requested human stylist support');

    if (orderId) {
      const comp = {
        id: `CMP-${Date.now().toString().slice(-6)}`,
        orderId: String(orderId).trim(),
        customerEmail: email,
        customerName: name,
        category: 'sizing_help' as const,
        subject: `AI Concierge Escalation for ${orderId}`,
        description: String(message || 'Shopper requested human specialist follow-up.'),
        status: 'escalated' as const,
        priority: 'high' as const,
        messages: [
          {
            id: `msg-${Date.now()}`,
            author: name,
            role: 'ai_escalation' as const,
            text: transcript,
            createdAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
      db.complaints.unshift(comp);
      pushNotification(db, {
        audience: 'admin',
        category: 'order',
        title: `Human Stylist Escalation: ${comp.id}`,
        message: `${name} (${email}) escalated chat regarding Order ${orderId}.`,
        linkId: comp.id,
      });
      saveDB(db);
      return res.json({
        success: true,
        escalated: true,
        ticketId: comp.id,
        whatsappNumber: db.settings.whatsappNumber,
        message: `Escalated to our human concierge desk (Ticket ${comp.id}). You can also chat directly on WhatsApp +91 ${db.settings.whatsappNumber}.`,
      });
    }

    const inq: SupportInquiry = {
      id: `inq-${Date.now()}`,
      name,
      email,
      subject: 'AI Shopping Concierge Escalation',
      message: `${String(message || '').trim()}\n\n--- Chat Context ---\n${transcript}`,
      status: 'open',
      createdAt: now,
    };
    db.supportInquiries.unshift(inq);
    pushNotification(db, {
      audience: 'admin',
      category: 'security',
      title: `Concierge Human Escalation (${inq.id})`,
      message: `${name} (${email}) requested a human stylist.`,
      linkId: inq.id,
    });
    saveDB(db);
    return res.json({
      success: true,
      escalated: true,
      ticketId: inq.id,
      whatsappNumber: db.settings.whatsappNumber,
      message: `Connected to our Zohra Luxe styling team (Reference ${inq.id}).`,
    });
  }

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const gemini = getGeminiClient();
  const visible = db.products.filter(isProductVisibleToPublic);
  if (!gemini) {
    return res.status(503).json({
      aiConfigured: false,
      error: 'AI Shopping Assistant (GEMINI_API_KEY) is not configured on the server. Use the Human Stylist Escalation button to connect directly with our boutique concierge.',
      whatsappNumber: db.settings.whatsappNumber,
    });
  }

  try {
    const catalogLines = visible
      .slice(0, 20)
      .map((p) => {
        const enriched = enrichProductForPublic(db, p, false);
        const priceDisplay = enriched.flashSalePrice ? `₹${enriched.flashSalePrice} (Flash Sale, reg ₹${p.discountedPrice})` : `₹${p.discountedPrice}`;
        return `${p.id} | ${p.name} | ${p.category} | Occasion:${p.occasion || 'Any'} | ${priceDisplay} | Stock:${p.stockQuantity} | Sizes:${p.sizes.join(',')} | Fabric:${p.fabric}`;
      })
      .join('\n');

    const convo = Array.isArray(history)
      ? history.slice(-6).map((h: any) => `${h.role === 'user' ? 'Shopper' : 'Concierge'}: ${h.text}`).join('\n')
      : '';

    const prompt = `You are Zohra Luxe's warm, knowledgeable women's ethnic fashion concierge.
Catalog inventory (ONLY cite products from this list with exact product IDs and INR prices; never invent SKUs, discounts, or tracking updates):
${catalogLines}

Store Policies:
- Free Express Shipping over ₹${db.settings.freeShippingThreshold}, Standard ₹${db.settings.standardShippingFee}
- ${db.settings.returnPolicyDays}-day easy return & exchange for unworn items with tags
- Wholesale B2B Support: +91 ${db.settings.whatsappNumber}

${convo ? `Recent conversation:\n${convo}\n` : ''}
Shopper question: ${String(message).trim()}

Answer concisely in English. If suggesting garments, list exact Product ID in brackets like [zk-101] so the UI can show quick-view cards. If the customer asks about order issues, refunds, or bespoke sizing, mention they can escalate to a human stylist immediately.`;

    const aiResponse = await gemini.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
    });

    const replyText = aiResponse.text || 'I can help you browse our curated ethnic collection or connect you with our boutique stylist.';
    const mentionedProducts = visible
      .filter((p) => replyText.includes(p.id) || replyText.toLowerCase().includes(p.name.toLowerCase()))
      .slice(0, 3)
      .map((p) => enrichProductForPublic(db, p, false))
      .map(({ costPrice: _cp, supplier: _sp, wholesalePrice: _wp, wholesaleMoq: _wm, ...pub }) => pub);

    res.json({
      success: true,
      aiConfigured: true,
      reply: replyText,
      suggestedProducts: mentionedProducts,
    });
  } catch (err) {
    console.error('AI shopping assistant error:', err);
    res.status(500).json({
      error: 'AI concierge encountered a temporary error. Please escalate to a human stylist below.',
      whatsappNumber: db.settings.whatsappNumber,
    });
  }
});

// =================== SECTION D & E: ADMIN GROWTH, CRM & ADVANCED BI ENDPOINTS ===================

// Lookbooks Admin CRUD
app.get('/api/admin/lookbooks', requirePermission('content.manage', 'products.manage'), (_req, res) => {
  const db = getDB();
  res.json({ lookbooks: db.lookbooks || [] });
});

app.post('/api/admin/lookbooks', requirePermission('content.manage', 'products.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const { title, occasion, subtitle, editorialNote, image, productIds, bundleDiscountPercent } = req.body || {};
  if (!title || !Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ error: 'Lookbook title and at least one product are required.' });
  }
  const lb = {
    id: `lb-${Date.now()}`,
    title: String(title).trim(),
    occasion: (occasion || 'Festive') as any,
    subtitle: String(subtitle || 'Curated editorial pairing').trim(),
    editorialNote: String(editorialNote || 'Styled by Zohra Luxe atelier').trim(),
    image: image || '/src/assets/images/category_anarkali_festive_1794109164992.jpg',
    productIds: productIds.map(String),
    bundleDiscountPercent: Math.min(40, Math.max(0, Number(bundleDiscountPercent) || 5)),
    active: true,
    createdAt: new Date().toISOString(),
  };
  db.lookbooks.unshift(lb);
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Created Lookbook', recordId: lb.id, after: lb, details: `Created lookbook "${lb.title}"` });
  saveDB(db);
  res.json({ success: true, lookbook: lb });
});

app.delete('/api/admin/lookbooks/:id', requirePermission('content.manage', 'products.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  db.lookbooks = (db.lookbooks || []).filter((l) => l.id !== req.params.id);
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Deleted Lookbook', recordId: req.params.id, details: `Removed lookbook ${req.params.id}` });
  saveDB(db);
  res.json({ success: true });
});

// Flash Sales Admin CRUD (Triggers Wishlist Price-Drop Notifications!)
app.get('/api/admin/flash-sales', requirePermission('coupons.manage', 'products.manage'), (_req, res) => {
  const db = getDB();
  res.json({ flashSales: db.flashSales || [] });
});

app.post('/api/admin/flash-sales', requirePermission('coupons.manage', 'products.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const { title, description, productIds, categories, discountPercent, startsAt, endsAt, vipEarlyAccessHours } = req.body || {};
  if (!title || !discountPercent || !startsAt || !endsAt) {
    return res.status(400).json({ error: 'Title, discount %, start time, and end time are required.' });
  }
  const rule = {
    id: `fs-${Date.now()}`,
    title: String(title).trim(),
    description: String(description || 'Limited-time atelier flash privilege').trim(),
    productIds: Array.isArray(productIds) ? productIds : [],
    categories: Array.isArray(categories) ? categories : [],
    discountPercent: Math.min(85, Math.max(1, Number(discountPercent))),
    startsAt: String(startsAt),
    endsAt: String(endsAt),
    vipEarlyAccessHours: Math.max(0, Number(vipEarlyAccessHours) || 0),
    active: true,
    createdAt: new Date().toISOString(),
  };
  db.flashSales.unshift(rule);

  // If Flash Sale is active now, notify price-drop subscribers
  const nowTs = Date.now();
  if (new Date(rule.startsAt).getTime() <= nowTs && new Date(rule.endsAt).getTime() >= nowTs) {
    for (const p of db.products) {
      const flash = getActiveFlashSaleForProduct(db, p, false, nowTs);
      if (flash.rule?.id === rule.id) {
        db.users.forEach((u) => {
          if (u.priceDropAlerts && u.priceDropAlerts[p.id] && flash.effectivePrice < u.priceDropAlerts[p.id]) {
            pushNotification(db, {
              audience: 'customer',
              userId: u.id,
              userEmail: u.email,
              category: 'promo',
              title: `Flash Sale Price Drop: ${p.name}`,
              message: `Now ₹${flash.effectivePrice.toLocaleString()} (${rule.title}) — limited time!`,
              linkId: p.id,
            });
          }
        });
      }
    }
  }

  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Created Flash Sale', recordId: rule.id, after: rule, details: `Created flash sale "${rule.title}" (${rule.discountPercent}% off)` });
  saveDB(db);
  res.json({ success: true, flashSale: rule });
});

app.patch('/api/admin/flash-sales/:id/toggle', requirePermission('coupons.manage', 'products.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const rule = (db.flashSales || []).find((f) => f.id === req.params.id);
  if (!rule) return res.status(404).json({ error: 'Flash sale not found.' });
  rule.active = !rule.active;
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Toggled Flash Sale', recordId: rule.id, after: { active: rule.active }, details: `${rule.title} active=${rule.active}` });
  saveDB(db);
  res.json({ success: true, flashSale: rule });
});

app.delete('/api/admin/flash-sales/:id', requirePermission('coupons.manage', 'products.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  db.flashSales = (db.flashSales || []).filter((f) => f.id !== req.params.id);
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Deleted Flash Sale', recordId: req.params.id, details: `Removed flash sale ${req.params.id}` });
  saveDB(db);
  res.json({ success: true });
});

// Bundle Offers Admin CRUD
app.get('/api/admin/bundles', requirePermission('coupons.manage', 'products.manage'), (_req, res) => {
  const db = getDB();
  res.json({ bundles: db.bundles || [] });
});

app.post('/api/admin/bundles', requirePermission('coupons.manage', 'products.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const { title, description, requiredProductIds, minItems, discountType, discountValue } = req.body || {};
  if (!title || !discountValue) return res.status(400).json({ error: 'Bundle title and discount value required.' });
  const bnd = {
    id: `bnd-${Date.now()}`,
    title: String(title).trim(),
    description: String(description || 'Automatic combo offer at checkout').trim(),
    requiredProductIds: Array.isArray(requiredProductIds) ? requiredProductIds : [],
    minItems: Math.max(2, Number(minItems) || 2),
    discountType: discountType === 'fixed' ? ('fixed' as const) : ('percentage' as const),
    discountValue: Number(discountValue),
    active: true,
    createdAt: new Date().toISOString(),
  };
  db.bundles.unshift(bnd);
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Created Bundle Offer', recordId: bnd.id, after: bnd, details: `Created bundle "${bnd.title}"` });
  saveDB(db);
  res.json({ success: true, bundle: bnd });
});

app.patch('/api/admin/bundles/:id/toggle', requirePermission('coupons.manage', 'products.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const bnd = (db.bundles || []).find((b) => b.id === req.params.id);
  if (!bnd) return res.status(404).json({ error: 'Bundle not found.' });
  bnd.active = !bnd.active;
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Toggled Bundle', recordId: bnd.id, details: `${bnd.title} active=${bnd.active}` });
  saveDB(db);
  res.json({ success: true, bundle: bnd });
});

// Digital Gift Cards Admin
app.get('/api/admin/gift-cards', requirePermission('coupons.manage', 'finance.view'), (_req, res) => {
  const db = getDB();
  res.json({ giftCards: db.giftCards || [] });
});

app.patch('/api/admin/gift-cards/:id/toggle', requirePermission('coupons.manage', 'finance.view'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const gc = (db.giftCards || []).find((g) => g.id === req.params.id);
  if (!gc) return res.status(404).json({ error: 'Gift card not found.' });
  gc.status = gc.status === 'disabled' ? (gc.currentBalance > 0 ? 'active' : 'redeemed') : 'disabled';
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Updated Gift Card Status', recordId: gc.code, details: `Gift card ${gc.code} status=${gc.status}` });
  saveDB(db);
  res.json({ success: true, giftCard: gc });
});

// VIP Tiers & Customer Tier Overrides
app.get('/api/admin/vip-tiers', requirePermission('customers.manage', 'customers.view'), (_req, res) => {
  const db = getDB();
  res.json({ vipTiers: db.vipTiers || [] });
});

app.put('/api/admin/vip-tiers', requirePermission('customers.manage', 'settings.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const { vipTiers } = req.body || {};
  if (!Array.isArray(vipTiers) || vipTiers.length === 0) {
    return res.status(400).json({ error: 'At least one VIP tier is required.' });
  }
  db.vipTiers = vipTiers;
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Updated VIP Tier Rules', details: `Configured ${vipTiers.length} VIP membership tiers.` });
  saveDB(db);
  res.json({ success: true, vipTiers: db.vipTiers });
});

app.patch('/api/admin/customers/:id/vip', requirePermission('customers.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const cust = db.users.find((u) => u.id === req.params.id && u.role === 'customer');
  if (!cust) return res.status(404).json({ error: 'Customer not found.' });
  const { vipTierOverride } = req.body || {};
  cust.vipTierOverride = vipTierOverride ? String(vipTierOverride) : undefined;
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Updated Customer VIP Tier', recordId: cust.id, after: { vipTierOverride: cust.vipTierOverride }, details: `Set VIP override for ${cust.email} to ${cust.vipTierOverride || 'Automatic'}` });
  saveDB(db);
  res.json({ success: true, customer: sanitizeUserForPublic(cust) });
});

// Marketing Campaigns Manager
app.get('/api/admin/campaigns', requirePermission('coupons.manage', 'reports.view'), (_req, res) => {
  const db = getDB();
  res.json({ campaigns: db.campaigns || [] });
});

app.post('/api/admin/campaigns', requirePermission('coupons.manage', 'content.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const { name, seasonOrFestival, channel, targetSegment, couponCode, budget, status, startsAt, endsAt } = req.body || {};
  if (!name || !seasonOrFestival) {
    return res.status(400).json({ error: 'Campaign name and season/festival label are required.' });
  }
  const camp = {
    id: `cmp-${Date.now()}`,
    name: String(name).trim(),
    seasonOrFestival: String(seasonOrFestival).trim(),
    channel: (channel || 'onsite') as any,
    targetSegment: (targetSegment || 'all') as any,
    couponCode: couponCode ? String(couponCode).trim().toUpperCase() : undefined,
    budget: Math.max(0, Number(budget) || 0),
    status: (status || 'active') as any,
    startsAt: startsAt || new Date().toISOString().slice(0, 10),
    endsAt: endsAt || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    impressions: 0,
    conversions: 0,
    revenueAttributed: 0,
    createdAt: new Date().toISOString(),
  };
  db.campaigns.unshift(camp);
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Created Marketing Campaign', recordId: camp.id, after: camp, details: `Created "${camp.name}" (${camp.seasonOrFestival})` });
  saveDB(db);
  res.json({ success: true, campaign: camp });
});

app.patch('/api/admin/campaigns/:id', requirePermission('coupons.manage', 'content.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const camp = (db.campaigns || []).find((c) => c.id === req.params.id);
  if (!camp) return res.status(404).json({ error: 'Campaign not found.' });
  if (req.body.status) camp.status = req.body.status;
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Updated Campaign', recordId: camp.id, details: `${camp.name} status=${camp.status}` });
  saveDB(db);
  res.json({ success: true, campaign: camp });
});

// Product Q&A Moderation & Answers
app.get('/api/admin/questions', requirePermission('products.manage', 'reviews.manage'), (_req, res) => {
  const db = getDB();
  const list = (db.productQuestions || []).map((q) => ({
    ...q,
    productName: db.products.find((p) => p.id === q.productId)?.name || q.productId,
  }));
  res.json({ questions: list });
});

app.patch('/api/admin/questions/:id', requirePermission('products.manage', 'reviews.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const q = (db.productQuestions || []).find((item) => item.id === req.params.id);
  if (!q) return res.status(404).json({ error: 'Question not found.' });
  const { answer, isPublic } = req.body || {};
  if (answer !== undefined && String(answer).trim()) {
    q.answer = String(answer).trim();
    q.answeredBy = actor.name || actor.email;
    q.answeredAt = new Date().toISOString();
    if (q.customerEmail) {
      pushNotification(db, {
        audience: 'customer',
        userEmail: q.customerEmail,
        category: 'promo',
        title: 'Answer Posted to Your Product Question',
        message: `Our stylist answered your question: "${q.answer.slice(0, 80)}"`,
        linkId: q.productId,
      });
    }
  }
  if (isPublic !== undefined) q.isPublic = Boolean(isPublic);
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Answered Product Q&A', recordId: q.id, details: `Answered Q&A ${q.id}` });
  saveDB(db);
  res.json({ success: true, question: q });
});

// Order Complaints & Support Tickets Queue
app.get('/api/admin/complaints', requirePermission('orders.view', 'orders.manage', 'customers.manage'), (_req, res) => {
  const db = getDB();
  res.json({ complaints: db.complaints || [] });
});

app.patch('/api/admin/complaints/:id', requirePermission('orders.manage', 'customers.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const comp = (db.complaints || []).find((c) => c.id === req.params.id);
  if (!comp) return res.status(404).json({ error: 'Complaint ticket not found.' });
  const { status, priority, replyText } = req.body || {};
  const now = new Date().toISOString();
  if (status && ['open', 'investigating', 'escalated', 'resolved'].includes(status)) comp.status = status;
  if (priority && ['normal', 'high', 'urgent'].includes(priority)) comp.priority = priority;
  if (replyText && String(replyText).trim()) {
    comp.messages.push({
      id: `msg-${Date.now()}`,
      author: actor.name || actor.email,
      role: 'admin',
      text: String(replyText).trim(),
      createdAt: now,
    });
    pushNotification(db, {
      audience: 'customer',
      userEmail: comp.customerEmail,
      category: 'order',
      title: `Support Reply (${comp.id})`,
      message: `${String(replyText).trim().slice(0, 90)}`,
      linkId: comp.orderId,
    });
  }
  comp.updatedAt = now;
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Updated Order Complaint', recordId: comp.id, after: { status: comp.status }, details: `Ticket ${comp.id} -> ${comp.status}` });
  saveDB(db);
  res.json({ success: true, complaint: comp });
});

// Consented Abandoned Cart Recovery Desk
app.get('/api/admin/abandoned-carts', requirePermission('customers.manage', 'customers.view'), (_req, res) => {
  const db = getDB();
  // Never expose unconsented users
  const consented = (db.abandonedCarts || []).filter((c) => c.consentGranted);
  res.json({ abandonedCarts: consented });
});

app.post('/api/admin/abandoned-carts/:id/send-recovery', requirePermission('customers.manage', 'notifications.manage'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const cartRec = (db.abandonedCarts || []).find((c) => c.id === req.params.id);
  if (!cartRec) return res.status(404).json({ error: 'Abandoned cart record not found.' });
  if (!cartRec.consentGranted) {
    return res.status(403).json({ error: 'Consent blocked: Cannot send abandoned cart outreach without explicit customer consent.' });
  }
  const customMessage = String(req.body?.message || `Your Zohra Luxe curated pieces (₹${cartRec.subtotal.toLocaleString()}) are waiting in your bag.`).trim();
  cartRec.recoverySentAt = new Date().toISOString();
  pushNotification(db, {
    audience: 'customer',
    userId: cartRec.userId,
    userEmail: cartRec.customerEmail,
    category: 'promo',
    title: 'Your Saved Atelier Bag',
    message: customMessage,
  });
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Sent Consented Cart Recovery', recordId: cartRec.id, details: `Notified ${cartRec.customerEmail} (explicit consent verified).` });
  saveDB(db);
  res.json({ success: true, abandonedCart: cartRec });
});

// Advanced Business Intelligence & Scheduled Reports
app.get('/api/admin/bi/overview', requirePermission('reports.view', 'finance.view', 'overview.view'), (_req, res) => {
  const db = getDB();
  res.json(computeBusinessIntelligence(db));
});

app.get('/api/admin/reports/schedules', requirePermission('reports.view', 'finance.view'), (_req, res) => {
  const db = getDB();
  res.json({ schedules: db.scheduledReports || [] });
});

app.post('/api/admin/reports/schedules', requirePermission('reports.view', 'finance.view'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const { name, frequency, sections, recipientEmail } = req.body || {};
  if (!name || !recipientEmail) return res.status(400).json({ error: 'Report name and recipient email required.' });
  const daysAhead = frequency === 'daily' ? 1 : frequency === 'monthly' ? 30 : 7;
  const sched = {
    id: `rep-${Date.now()}`,
    name: String(name).trim(),
    frequency: (frequency || 'weekly') as any,
    sections: Array.isArray(sections) && sections.length ? sections : ['pnl', 'retention', 'inventory_demand', 'forecast'],
    recipientEmail: String(recipientEmail).trim().toLowerCase(),
    enabled: true,
    nextRunAt: new Date(Date.now() + daysAhead * 86400000).toISOString(),
  };
  db.scheduledReports.unshift(sched);
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Created Report Schedule', recordId: sched.id, details: `Scheduled "${sched.name}" (${sched.frequency})` });
  saveDB(db);
  res.json({ success: true, schedule: sched });
});

app.post('/api/admin/reports/schedules/:id/run', requirePermission('reports.view', 'finance.view'), (req: AdminRequest, res) => {
  const db = getDB();
  const actor = req.adminUser!;
  const sched = (db.scheduledReports || []).find((s) => s.id === req.params.id);
  if (!sched) return res.status(404).json({ error: 'Report schedule not found.' });
  sched.lastGeneratedAt = new Date().toISOString();
  const bi = computeBusinessIntelligence(db);
  const pnl = computeProfitAndLoss(db);
  logAudit(db, { adminEmail: actor.email, actorId: actor.id, action: 'Generated Business Report', recordId: sched.id, details: `Generated snapshot for ${sched.name}` });
  saveDB(db);
  res.json({
    success: true,
    generatedAt: sched.lastGeneratedAt,
    schedule: sched,
    snapshot: { pnl, bi },
  });
});

app.delete('/api/admin/reports/schedules/:id', requirePermission('reports.view', 'finance.view'), (req: AdminRequest, res) => {
  const db = getDB();
  db.scheduledReports = (db.scheduledReports || []).filter((s) => s.id !== req.params.id);
  saveDB(db);
  res.json({ success: true });
});

// Per-Admin Dashboard Widget Customization
app.get('/api/admin/widgets', requireAdmin, (req: AdminRequest, res) => {
  const db = getDB();
  const key = req.adminUser!.email.toLowerCase();
  const widgets = db.adminWidgetPrefs?.[key] || DEFAULT_ADMIN_WIDGETS;
  res.json({ widgets });
});

app.put('/api/admin/widgets', requireAdmin, (req: AdminRequest, res) => {
  const db = getDB();
  const key = req.adminUser!.email.toLowerCase();
  const { widgets } = req.body || {};
  if (!Array.isArray(widgets)) return res.status(400).json({ error: 'Widgets array required.' });
  db.adminWidgetPrefs = db.adminWidgetPrefs || {};
  db.adminWidgetPrefs[key] = widgets;
  saveDB(db);
  res.json({ success: true, widgets: db.adminWidgetPrefs[key] });
});

// =================== VITE SPA & STARTUP ===================

async function startServer() {
  ensureOwnerBootstrapReady();

  // Automated backup scheduler every 6 hours if enabled
  setInterval(() => {
    try {
      const db = getDB();
      createBackupFile(db, 'scheduler@zohraluxe.com', 'scheduled');
      saveDB(db);
    } catch (err) {
      console.error('Scheduled backup failed:', err);
    }
  }, 6 * 60 * 60 * 1000);

  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.resolve('dist');

  app.use('/src/assets/images', express.static(path.resolve('src/assets/images')));

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
    console.log(`[ZOHRA LUXE] Server active at http://0.0.0.0:${port}`);
    console.log(`[SECURITY] Primary Owner: ${SUPER_ADMIN_EMAIL}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
