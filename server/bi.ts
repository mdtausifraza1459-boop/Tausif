import type {
  BundleOffer,
  FlashSaleRule,
  Order,
  Product,
  User,
  VipTierConfig,
} from '../src/types.ts';
import type { DatabaseSchema, InternalUser } from './db.ts';
import { getVariantStock } from './commerce.ts';

export interface VipStatusResult {
  tier: VipTierConfig;
  nextTier: VipTierConfig | null;
  lifetimeSpend: number;
  orderCount: number;
  isFirstOrder: boolean;
  isReturningCustomer: boolean;
  spendToNextTier: number;
  ordersToNextTier: number;
  isVipMember: boolean;
}

export function getCustomerVipStatus(
  db: DatabaseSchema,
  email?: string,
  userId?: string
): VipStatusResult {
  const tiers = [...(db.vipTiers || [])].sort((a, b) => a.minLifetimeSpend - b.minLifetimeSpend);
  const fallbackTier: VipTierConfig = tiers[0] || {
    id: 'tier-pearl',
    name: 'Pearl Member',
    minLifetimeSpend: 0,
    minOrders: 0,
    discountPercent: 0,
    freeShippingAlways: false,
    pointsMultiplier: 1,
    earlyAccessFlashSales: false,
    badgeColor: '#63615C',
    perks: [],
  };

  const normalizedEmail = (email || '').trim().toLowerCase();
  const user: InternalUser | undefined = db.users.find(
    (u) =>
      (userId && u.id === userId) ||
      (normalizedEmail && u.email.toLowerCase() === normalizedEmail)
  );

  const nonCancelledOrders = db.orders.filter(
    (o) =>
      o.orderStatus !== 'Cancelled' &&
      o.orderStatus !== 'Refunded' &&
      ((userId && o.userId === userId) ||
        (normalizedEmail && o.customerEmail.toLowerCase() === normalizedEmail))
  );

  const lifetimeSpend = nonCancelledOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const orderCount = nonCancelledOrders.length;

  let activeTier = fallbackTier;
  if (user?.vipTierOverride) {
    const overridden = tiers.find((t) => t.id === user.vipTierOverride || t.name === user.vipTierOverride);
    if (overridden) activeTier = overridden;
  } else {
    for (const t of tiers) {
      if (lifetimeSpend >= t.minLifetimeSpend && orderCount >= t.minOrders) {
        activeTier = t;
      }
    }
  }

  const activeIdx = tiers.findIndex((t) => t.id === activeTier.id);
  const nextTier = activeIdx >= 0 && activeIdx < tiers.length - 1 ? tiers[activeIdx + 1] : null;

  return {
    tier: activeTier,
    nextTier,
    lifetimeSpend,
    orderCount,
    isFirstOrder: orderCount === 0,
    isReturningCustomer: orderCount >= 1,
    spendToNextTier: nextTier ? Math.max(0, nextTier.minLifetimeSpend - lifetimeSpend) : 0,
    ordersToNextTier: nextTier ? Math.max(0, nextTier.minOrders - orderCount) : 0,
    isVipMember: activeTier.discountPercent > 0 || activeTier.earlyAccessFlashSales,
  };
}

export function getActiveFlashSaleForProduct(
  db: DatabaseSchema,
  product: Product,
  userHasEarlyAccess = false,
  nowTs = Date.now()
): {
  rule: FlashSaleRule | null;
  effectivePrice: number;
  discountPercent: number;
} {
  let bestPrice = product.discountedPrice;
  let bestRule: FlashSaleRule | null = null;
  let bestDiscountPct = 0;

  for (const rule of db.flashSales || []) {
    if (!rule.active) continue;
    const startTs = new Date(rule.startsAt).getTime();
    const endTs = new Date(rule.endsAt).getTime();
    if (isNaN(startTs) || isNaN(endTs)) continue;

    const earlyMs = userHasEarlyAccess && rule.vipEarlyAccessHours ? rule.vipEarlyAccessHours * 3600000 : 0;
    if (nowTs < startTs - earlyMs || nowTs > endTs) continue;

    const matchesProduct =
      (Array.isArray(rule.productIds) && rule.productIds.includes(product.id)) ||
      (Array.isArray(rule.categories) &&
        rule.categories.some((c) => c.toLowerCase() === (product.category || '').toLowerCase()));

    if (!matchesProduct) continue;

    const candidatePrice = Math.max(
      1,
      Math.round(product.discountedPrice * (1 - Math.min(90, Math.max(1, rule.discountPercent)) / 100))
    );
    if (candidatePrice < bestPrice) {
      bestPrice = candidatePrice;
      bestRule = rule;
      bestDiscountPct = rule.discountPercent;
    }
  }

  return {
    rule: bestRule,
    effectivePrice: bestPrice,
    discountPercent: bestDiscountPct,
  };
}

export function enrichProductForPublic(
  db: DatabaseSchema,
  product: Product,
  userHasEarlyAccess = false
): Product {
  const flash = getActiveFlashSaleForProduct(db, product, userHasEarlyAccess);
  return {
    ...product,
    flashSalePrice: flash.rule ? flash.effectivePrice : undefined,
    flashSaleId: flash.rule ? flash.rule.id : undefined,
    flashSaleEndsAt: flash.rule ? flash.rule.endsAt : undefined,
  };
}

export interface EvaluatedCartLine {
  product: Product;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  originalUnitPrice: number;
  flashSaleApplied: boolean;
  lineTotal: number;
}

export interface CartPricingEvaluation {
  ok: boolean;
  error?: string;
  lines: EvaluatedCartLine[];
  subtotal: number;
  appliedBundle: BundleOffer | null;
  bundleDiscount: number;
  vipStatus: VipStatusResult;
  vipDiscount: number;
  couponCode?: string;
  couponDiscount: number;
  couponError?: string;
  loyaltyPointsAvailable: number;
  pointsRedeemed: number;
  loyaltyDiscount: number;
  giftCardCode?: string;
  giftCardDiscount: number;
  giftCardError?: string;
  shipping: number;
  freeShippingReason?: string;
  total: number;
  pointsToEarn: number;
}

export function evaluateCartPricing(
  db: DatabaseSchema,
  params: {
    items: { productId: string; size?: string; color?: string; quantity: number }[];
    customerEmail?: string;
    userId?: string;
    couponCode?: string;
    giftCardCode?: string;
    redeemPoints?: number;
    validateStock?: boolean;
  }
): CartPricingEvaluation {
  const rawItems = Array.isArray(params.items) ? params.items : [];
  const vipStatus = getCustomerVipStatus(db, params.customerEmail, params.userId);
  const earlyAccess = Boolean(vipStatus.tier.earlyAccessFlashSales);

  const user = db.users.find(
    (u) =>
      (params.userId && u.id === params.userId) ||
      (params.customerEmail && u.email.toLowerCase() === params.customerEmail.trim().toLowerCase())
  );

  const lines: EvaluatedCartLine[] = [];
  let subtotal = 0;
  let totalItemUnits = 0;

  for (const item of rawItems) {
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const prod = db.products.find((p) => p.id === item.productId);
    if (!prod) {
      return {
        ok: false,
        error: `Product ${item.productId} is no longer available.`,
        lines: [],
        subtotal: 0,
        appliedBundle: null,
        bundleDiscount: 0,
        vipStatus,
        vipDiscount: 0,
        couponDiscount: 0,
        loyaltyPointsAvailable: user?.loyaltyPoints || 0,
        pointsRedeemed: 0,
        loyaltyDiscount: 0,
        giftCardDiscount: 0,
        shipping: 0,
        total: 0,
        pointsToEarn: 0,
      };
    }

    const size = item.size || prod.sizes[0] || 'M';
    const color = item.color || prod.colors[0]?.name || 'Standard';

    if (params.validateStock) {
      const available = getVariantStock(prod, size, color);
      if (available < qty) {
        return {
          ok: false,
          error:
            available === 0
              ? `${prod.name} (${size}, ${color}) is out of stock.`
              : `Only ${available} left for ${prod.name} (${size}, ${color}).`,
          lines: [],
          subtotal: 0,
          appliedBundle: null,
          bundleDiscount: 0,
          vipStatus,
          vipDiscount: 0,
          couponDiscount: 0,
          loyaltyPointsAvailable: user?.loyaltyPoints || 0,
          pointsRedeemed: 0,
          loyaltyDiscount: 0,
          giftCardDiscount: 0,
          shipping: 0,
          total: 0,
          pointsToEarn: 0,
        };
      }
    }

    const flash = getActiveFlashSaleForProduct(db, prod, earlyAccess);
    const unitPrice = flash.effectivePrice;
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    totalItemUnits += qty;

    lines.push({
      product: prod,
      size,
      color,
      quantity: qty,
      unitPrice,
      originalUnitPrice: prod.discountedPrice,
      flashSaleApplied: Boolean(flash.rule),
      lineTotal,
    });
  }

  if (lines.length === 0) {
    return {
      ok: false,
      error: 'Your bag is empty.',
      lines: [],
      subtotal: 0,
      appliedBundle: null,
      bundleDiscount: 0,
      vipStatus,
      vipDiscount: 0,
      couponDiscount: 0,
      loyaltyPointsAvailable: user?.loyaltyPoints || 0,
      pointsRedeemed: 0,
      loyaltyDiscount: 0,
      giftCardDiscount: 0,
      shipping: 0,
      total: 0,
      pointsToEarn: 0,
    };
  }

  // 1. Evaluate Best Eligible Bundle Discount
  const cartProductIds = new Set(lines.map((l) => l.product.id));
  let bestBundle: BundleOffer | null = null;
  let bundleDiscount = 0;

  for (const bnd of db.bundles || []) {
    if (!bnd.active) continue;
    const minItemsOk = totalItemUnits >= (bnd.minItems || 2);
    const requiredOk =
      !Array.isArray(bnd.requiredProductIds) ||
      bnd.requiredProductIds.length === 0 ||
      bnd.requiredProductIds.every((pid) => cartProductIds.has(pid));
    if (!minItemsOk || !requiredOk) continue;

    const amt =
      bnd.discountType === 'percentage'
        ? Math.round((subtotal * bnd.discountValue) / 100)
        : Math.min(subtotal, Math.round(bnd.discountValue));
    if (amt > bundleDiscount) {
      bundleDiscount = amt;
      bestBundle = bnd;
    }
  }

  // 2. Evaluate VIP Tier Privilege Discount
  let vipDiscount = 0;
  const afterBundle = Math.max(0, subtotal - bundleDiscount);
  if (vipStatus.tier.discountPercent > 0 && afterBundle > 0) {
    vipDiscount = Math.round((afterBundle * vipStatus.tier.discountPercent) / 100);
  }

  // 3. Evaluate Coupon with Full Eligibility & Limits
  let couponDiscount = 0;
  let couponError: string | undefined;
  let validCouponCode: string | undefined;

  if (params.couponCode && params.couponCode.trim()) {
    const cleanCode = params.couponCode.trim().toUpperCase();
    const coupon = db.coupons.find((c) => c.code.toUpperCase() === cleanCode);
    const normalizedEmail = (params.customerEmail || '').trim().toLowerCase();

    if (!coupon || !coupon.isActive) {
      couponError = 'Invalid or inactive promo code.';
    } else if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) {
      couponError = 'This promo code has expired.';
    } else if (subtotal < coupon.minOrderValue) {
      couponError = `Minimum order of ₹${coupon.minOrderValue.toLocaleString()} required for ${coupon.code}.`;
    } else if (
      coupon.usageLimitTotal !== undefined &&
      coupon.usageLimitTotal > 0 &&
      (coupon.usedCount || 0) >= coupon.usageLimitTotal
    ) {
      couponError = 'This promo code has reached its total redemption limit.';
    } else if (
      coupon.usageLimitPerUser !== undefined &&
      coupon.usageLimitPerUser > 0 &&
      normalizedEmail &&
      ((coupon.usedByEmails?.[normalizedEmail] || 0) >= coupon.usageLimitPerUser)
    ) {
      couponError = `You have already used ${coupon.code} the maximum allowed times.`;
    } else if (coupon.firstOrderOnly && !vipStatus.isFirstOrder) {
      couponError = `${coupon.code} is valid exclusively on your first order.`;
    } else if (coupon.returningCustomerOnly && !vipStatus.isReturningCustomer) {
      couponError = `${coupon.code} is an appreciation offer for returning customers.`;
    } else if (coupon.vipOnly && !vipStatus.isVipMember) {
      couponError = `${coupon.code} is reserved for Emerald Circle & Royal Zohra VIP members.`;
    } else {
      let eligibleSubtotal = subtotal;
      if (Array.isArray(coupon.eligibleCategories) && coupon.eligibleCategories.length > 0) {
        const lowerCats = new Set(coupon.eligibleCategories.map((c) => c.toLowerCase()));
        eligibleSubtotal = lines
          .filter((l) => lowerCats.has((l.product.category || '').toLowerCase()))
          .reduce((s, l) => s + l.lineTotal, 0);
        if (eligibleSubtotal <= 0) {
          couponError = `${coupon.code} applies only to ${coupon.eligibleCategories.join(', ')}.`;
        }
      }
      if (!couponError) {
        validCouponCode = coupon.code;
        couponDiscount =
          coupon.discountType === 'percentage'
            ? Math.round((eligibleSubtotal * coupon.discountValue) / 100)
            : coupon.discountValue;
        if (coupon.maxDiscountAmount && couponDiscount > coupon.maxDiscountAmount) {
          couponDiscount = coupon.maxDiscountAmount;
        }
        couponDiscount = Math.min(couponDiscount, Math.max(0, afterBundle - vipDiscount));
      }
    }
  }

  // 4. Loyalty Points Redemption
  const loyaltyPointsAvailable = user?.loyaltyPoints || 0;
  let pointsRedeemed = 0;
  let loyaltyDiscount = 0;
  const remainingBeforeLoyalty = Math.max(0, afterBundle - vipDiscount - couponDiscount);
  if (user && params.redeemPoints && Number(params.redeemPoints) > 0) {
    const requested = Math.floor(Number(params.redeemPoints));
    pointsRedeemed = Math.min(requested, loyaltyPointsAvailable, remainingBeforeLoyalty);
    loyaltyDiscount = pointsRedeemed;
  }

  // 5. Shipping Calculation
  const freeThreshold = Number(db.settings?.freeShippingThreshold ?? 1499);
  const standardFee = Number(db.settings?.standardShippingFee ?? 99);
  let shipping = standardFee;
  let freeShippingReason: string | undefined;

  if (vipStatus.tier.freeShippingAlways) {
    shipping = 0;
    freeShippingReason = `${vipStatus.tier.name} Complimentary Express Shipping`;
  } else if (subtotal >= freeThreshold) {
    shipping = 0;
    freeShippingReason = `Complimentary Shipping Over ₹${freeThreshold.toLocaleString()}`;
  }

  const preGiftTotal = Math.max(0, remainingBeforeLoyalty - loyaltyDiscount + shipping);

  // 6. Digital Gift Card Validation
  let giftCardDiscount = 0;
  let giftCardError: string | undefined;
  let validGiftCardCode: string | undefined;

  if (params.giftCardCode && params.giftCardCode.trim()) {
    const cleanGc = params.giftCardCode.trim().toUpperCase();
    const gc = (db.giftCards || []).find((g) => g.code.toUpperCase() === cleanGc);
    if (!gc) {
      giftCardError = 'Gift card code not found.';
    } else if (gc.status !== 'active' || gc.currentBalance <= 0) {
      giftCardError = 'This gift card has zero balance or is inactive.';
    } else if (gc.expiresAt && new Date(gc.expiresAt).getTime() < Date.now()) {
      giftCardError = 'This gift card has expired.';
    } else {
      validGiftCardCode = gc.code;
      giftCardDiscount = Math.min(preGiftTotal, Math.round(gc.currentBalance));
    }
  }

  const total = Math.max(0, preGiftTotal - giftCardDiscount);
  const pointsMultiplier = vipStatus.tier.pointsMultiplier || 1;
  const pointsToEarn = Math.max(1, Math.round((total / 100) * pointsMultiplier));

  return {
    ok: true,
    lines,
    subtotal,
    appliedBundle: bestBundle,
    bundleDiscount,
    vipStatus,
    vipDiscount,
    couponCode: validCouponCode,
    couponDiscount,
    couponError,
    loyaltyPointsAvailable,
    pointsRedeemed,
    loyaltyDiscount,
    giftCardCode: validGiftCardCode,
    giftCardDiscount,
    giftCardError,
    shipping,
    freeShippingReason,
    total,
    pointsToEarn,
  };
}

// =================== SMART GARMENT-MEASUREMENT SIZE ENGINE ===================

export function recommendGarmentSize(
  product: Product | undefined,
  input: {
    bustIn?: number;
    waistIn?: number;
    hipIn?: number;
    heightInches?: number;
    weightKg?: number;
    fitPreference?: 'snug' | 'regular' | 'relaxed';
  }
) {
  let bust = Number(input.bustIn) || 0;
  let waist = Number(input.waistIn) || 0;
  let hip = Number(input.hipIn) || 0;

  if (!bust && input.weightKg && input.heightInches) {
    const bmiFactor = Number(input.weightKg) / Math.pow(Number(input.heightInches) * 0.0254, 2);
    bust = Math.round(28 + Math.max(16, Math.min(40, bmiFactor)) * 0.42);
    waist = bust - 6;
    hip = bust + 3;
  }

  const easeAllowance =
    input.fitPreference === 'snug' ? 1 : input.fitPreference === 'relaxed' ? 3 : 2;
  const targetBust = bust + easeAllowance;

  const availableSizes = product?.sizes?.length ? product.sizes : ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const chart = product?.measurements || {
    XS: { bustIn: 34, waistIn: 28, hipIn: 37, lengthIn: 44 },
    S: { bustIn: 36, waistIn: 30, hipIn: 39, lengthIn: 45 },
    M: { bustIn: 38, waistIn: 32, hipIn: 41, lengthIn: 46 },
    L: { bustIn: 40, waistIn: 34, hipIn: 43, lengthIn: 46 },
    XL: { bustIn: 42, waistIn: 36, hipIn: 45, lengthIn: 47 },
    XXL: { bustIn: 44, waistIn: 38, hipIn: 47, lengthIn: 47 },
  };

  let bestSize = availableSizes[0] || 'M';
  let bestDiff = Infinity;

  for (const s of availableSizes) {
    const gm = chart[s];
    if (!gm) continue;
    const bustDiff = Math.abs(gm.bustIn - targetBust);
    const hipPenalty = hip > 0 && gm.hipIn < hip + 1 ? 6 : 0;
    const waistPenalty = waist > 0 && gm.waistIn < waist + 1 ? 4 : 0;
    const score = bustDiff + hipPenalty + waistPenalty;
    if (score < bestDiff) {
      bestDiff = score;
      bestSize = s;
    }
  }

  const matchedSpec = chart[bestSize] || null;
  const variantStockForSize = product
    ? product.colors.reduce((sum, c) => sum + getVariantStock(product, bestSize, c.name), 0)
    : undefined;

  return {
    recommendedSize: bestSize,
    garmentMeasurements: matchedSpec,
    targetBustWithEase: Math.round(targetBust * 10) / 10,
    fitPreference: input.fitPreference || 'regular',
    availableStockInSize: variantStockForSize,
    notes: matchedSpec
      ? `Recommended ${bestSize} (${matchedSpec.bustIn}" garment bust · ${matchedSpec.lengthIn}" length) includes a comfortable ${easeAllowance}" atelier drape allowance.`
      : `Recommended ${bestSize} based on Zohra Luxe tailored ease.`,
  };
}

// =================== ADVANCED BUSINESS INTELLIGENCE (HONEST REAL METRICS) ===================

export function computeBusinessIntelligence(db: DatabaseSchema) {
  const now = Date.now();
  const DAY_MS = 86400000;
  const activeOrders = db.orders.filter((o) => o.orderStatus !== 'Cancelled');

  // 1. Customer Retention & Repeat Purchase Report
  const ordersByEmail: Record<string, Order[]> = {};
  for (const o of activeOrders) {
    const em = (o.customerEmail || '').trim().toLowerCase();
    if (!em) continue;
    if (!ordersByEmail[em]) ordersByEmail[em] = [];
    ordersByEmail[em].push(o);
  }

  const customerEmails = Object.keys(ordersByEmail);
  const repeatCustomers = customerEmails.filter((em) => ordersByEmail[em].length >= 2);
  const oneTimeCustomers = customerEmails.filter((em) => ordersByEmail[em].length === 1);
  const retentionRatePercent =
    customerEmails.length > 0 ? Math.round((repeatCustomers.length / customerEmails.length) * 1000) / 10 : 0;

  let totalDaysBetweenOrders = 0;
  let intervalPairs = 0;
  const repeatLeaderboard = repeatCustomers
    .map((em) => {
      const sorted = [...ordersByEmail[em]].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      for (let i = 1; i < sorted.length; i++) {
        const diffDays =
          (new Date(sorted[i].createdAt).getTime() - new Date(sorted[i - 1].createdAt).getTime()) / DAY_MS;
        totalDaysBetweenOrders += Math.max(0, diffDays);
        intervalPairs++;
      }
      const totalSpend = sorted.reduce((s, o) => s + (Number(o.total) || 0), 0);
      return {
        email: em,
        name: sorted[sorted.length - 1].customerName,
        orderCount: sorted.length,
        totalSpend,
        lastOrderAt: sorted[sorted.length - 1].createdAt,
      };
    })
    .sort((a, b) => b.totalSpend - a.totalSpend);

  const avgDaysBetweenOrders =
    intervalPairs > 0 ? Math.round((totalDaysBetweenOrders / intervalPairs) * 10) / 10 : null;

  // 2. Customer Segmentation
  const segments = {
    newCustomers: 0,
    repeatCustomers: 0,
    vipMembers: 0,
    atRisk: 0,
    highSpenders: 0,
    abandonedCartConsented: 0,
    marketingConsented: 0,
  };

  const segmentedCustomers = db.users
    .filter((u) => u.role === 'customer')
    .map((u) => {
      const em = u.email.toLowerCase();
      const userOrders = ordersByEmail[em] || [];
      const totalSpend = userOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const lastOrderTs = userOrders.length
        ? Math.max(...userOrders.map((o) => new Date(o.createdAt).getTime()))
        : 0;
      const daysSinceLastOrder = lastOrderTs ? Math.round((now - lastOrderTs) / DAY_MS) : null;
      const vip = getCustomerVipStatus(db, em, u.id);

      const tags: string[] = [];
      if (userOrders.length <= 1) {
        segments.newCustomers++;
        tags.push('New');
      } else {
        segments.repeatCustomers++;
        tags.push('Repeat');
      }
      if (vip.isVipMember) {
        segments.vipMembers++;
        tags.push(vip.tier.name);
      }
      if (daysSinceLastOrder !== null && daysSinceLastOrder > 60) {
        segments.atRisk++;
        tags.push('At-Risk');
      }
      if (totalSpend >= 10000) {
        segments.highSpenders++;
        tags.push('High Spender');
      }
      if (u.abandonedCartConsent) segments.abandonedCartConsented++;
      if (u.marketingConsent) segments.marketingConsented++;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        ordersCount: userOrders.length,
        totalSpend,
        vipTier: vip.tier.name,
        vipTierId: vip.tier.id,
        vipTierOverride: u.vipTierOverride,
        daysSinceLastOrder,
        abandonedCartConsent: Boolean(u.abandonedCartConsent),
        marketingConsent: Boolean(u.marketingConsent),
        tags,
      };
    });

  // 3. Product Return Analysis
  const returnsByProduct: Record<string, { productName: string; count: number; reasons: Record<string, number> }> = {};
  const returnsByReason: Record<string, number> = {};
  for (const r of db.returnRequests || []) {
    const key = r.productId || r.itemName || 'Unspecified';
    if (!returnsByProduct[key]) {
      returnsByProduct[key] = { productName: r.itemName || key, count: 0, reasons: {} };
    }
    returnsByProduct[key].count++;
    const reason = r.reason || 'Unspecified';
    returnsByProduct[key].reasons[reason] = (returnsByProduct[key].reasons[reason] || 0) + 1;
    returnsByReason[reason] = (returnsByReason[reason] || 0) + 1;
  }

  const totalUnitsOrdered = activeOrders.reduce(
    (s, o) => s + o.items.reduce((is, i) => is + (Number(i.quantity) || 0), 0),
    0
  );
  const returnRatePercent =
    totalUnitsOrdered > 0
      ? Math.round(((db.returnRequests?.length || 0) / totalUnitsOrdered) * 1000) / 10
      : 0;

  // 4. Category Performance & Product Profitability / Comparison
  const productPerfMap: Record<
    string,
    {
      productId: string;
      sku: string;
      name: string;
      category: string;
      unitsSold: number;
      revenue: number;
      cogs: number;
      missingCostUnits: number;
      returnsCount: number;
      currentStock: number;
      rating: number;
    }
  > = {};

  for (const p of db.products) {
    productPerfMap[p.id] = {
      productId: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      unitsSold: 0,
      revenue: 0,
      cogs: 0,
      missingCostUnits: 0,
      returnsCount: 0,
      currentStock: p.stockQuantity,
      rating: p.rating,
    };
  }

  const recent30Cutoff = now - 30 * DAY_MS;
  const recent7Cutoff = now - 7 * DAY_MS;
  const recent30UnitsByProduct: Record<string, number> = {};
  let revenueLast30 = 0;
  let revenueLast7 = 0;
  let ordersLast30 = 0;

  for (const ord of activeOrders) {
    const ts = new Date(ord.createdAt).getTime();
    if (ts >= recent30Cutoff) {
      revenueLast30 += Number(ord.total) || 0;
      ordersLast30++;
    }
    if (ts >= recent7Cutoff) {
      revenueLast7 += Number(ord.total) || 0;
    }

    for (const item of ord.items) {
      const qty = Number(item.quantity) || 0;
      const lineRev = (Number(item.price) || 0) * qty;
      const entry = productPerfMap[item.productId];
      if (entry) {
        entry.unitsSold += qty;
        entry.revenue += lineRev;
        const prod = db.products.find((p) => p.id === item.productId);
        const unitCost =
          item.costPrice && item.costPrice > 0
            ? item.costPrice
            : prod && prod.costPrice > 0
            ? prod.costPrice
            : 0;
        if (unitCost > 0) entry.cogs += unitCost * qty;
        else entry.missingCostUnits += qty;
      }
      if (ts >= recent30Cutoff) {
        recent30UnitsByProduct[item.productId] = (recent30UnitsByProduct[item.productId] || 0) + qty;
      }
    }
  }

  for (const r of db.returnRequests || []) {
    if (r.productId && productPerfMap[r.productId]) {
      productPerfMap[r.productId].returnsCount++;
    }
  }

  const productComparison = Object.values(productPerfMap)
    .map((p) => {
      const grossProfit = p.revenue - p.cogs;
      const marginPercent = p.revenue > 0 ? Math.round((grossProfit / p.revenue) * 1000) / 10 : 0;
      const returnRate = p.unitsSold > 0 ? Math.round((p.returnsCount / p.unitsSold) * 1000) / 10 : 0;
      return {
        ...p,
        grossProfit,
        marginPercent,
        returnRate,
        costComplete: p.missingCostUnits === 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const categoryPerformanceMap: Record<string, { category: string; unitsSold: number; revenue: number; productCount: number }> = {};
  for (const p of db.products) {
    if (!categoryPerformanceMap[p.category]) {
      categoryPerformanceMap[p.category] = { category: p.category, unitsSold: 0, revenue: 0, productCount: 0 };
    }
    categoryPerformanceMap[p.category].productCount++;
  }
  for (const perf of productComparison) {
    if (!categoryPerformanceMap[perf.category]) {
      categoryPerformanceMap[perf.category] = { category: perf.category, unitsSold: 0, revenue: 0, productCount: 0 };
    }
    categoryPerformanceMap[perf.category].unitsSold += perf.unitsSold;
    categoryPerformanceMap[perf.category].revenue += perf.revenue;
  }

  // 5. Historical Sales Forecast (Explicitly Marked as Estimate)
  const avgDaily30 = revenueLast30 / 30;
  const avgDaily7 = revenueLast7 / 7;
  const blendedDailyEstimate = activeOrders.length > 0 ? avgDaily7 * 0.4 + avgDaily30 * 0.6 : 0;
  const projectedNext30Days = Math.round(blendedDailyEstimate * 30);
  const trendDirection: 'upward' | 'steady' | 'softening' | 'insufficient_data' =
    ordersLast30 < 2
      ? 'insufficient_data'
      : avgDaily7 > avgDaily30 * 1.08
      ? 'upward'
      : avgDaily7 < avgDaily30 * 0.92
      ? 'softening'
      : 'steady';

  const salesForecast = {
    isEstimate: true,
    disclaimer: 'Statistical estimate derived from historical non-cancelled orders. Not a guaranteed projection.',
    basedOnOrderCount: activeOrders.length,
    trailing7DaysRevenue: Math.round(revenueLast7),
    trailing30DaysRevenue: Math.round(revenueLast30),
    estimatedDailyRunRate: Math.round(blendedDailyEstimate),
    estimatedNext30DaysRevenue: projectedNext30Days,
    confidenceLevel: ordersLast30 >= 15 ? 'moderate' : ordersLast30 >= 3 ? 'low' : 'very_low',
    trendDirection,
  };

  // 6. Coupon & Campaign Analytics
  const couponPerformance = db.coupons.map((c) => {
    const attributedOrders = activeOrders.filter(
      (o) => o.couponCode && o.couponCode.toUpperCase() === c.code.toUpperCase()
    );
    const revenue = attributedOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const totalDiscountGiven = attributedOrders.reduce((s, o) => s + (Number(o.discount) || 0), 0);
    return {
      code: c.code,
      isActive: c.isActive,
      usedCount: c.usedCount || attributedOrders.length,
      usageLimitTotal: c.usageLimitTotal,
      revenue,
      totalDiscountGiven,
      conversionOrders: attributedOrders.length,
    };
  });

  // 7. Inventory Demand Alerts
  const inventoryDemandAlerts = db.products
    .map((p) => {
      const units30d = recent30UnitsByProduct[p.id] || 0;
      const dailyVelocity = Math.round((units30d / 30) * 100) / 100;
      const daysRemaining = dailyVelocity > 0 ? Math.round(p.stockQuantity / dailyVelocity) : null;
      const threshold = p.lowStockThreshold ?? 10;
      const urgency: 'critical' | 'warning' | 'healthy' =
        p.stockQuantity === 0 || (daysRemaining !== null && daysRemaining <= 7)
          ? 'critical'
          : p.stockQuantity <= threshold || (daysRemaining !== null && daysRemaining <= 21)
          ? 'warning'
          : 'healthy';
      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        currentStock: p.stockQuantity,
        unitsSoldLast30d: units30d,
        dailyVelocity,
        estimatedDaysOfStock: daysRemaining,
        urgency,
      };
    })
    .filter((a) => a.urgency !== 'healthy' || a.unitsSoldLast30d > 0)
    .sort((a, b) => a.currentStock - b.currentStock);

  // 8. Staff Activity Summary
  const staffMap: Record<string, { email: string; actionsCount: number; blockedCount: number; lastActionAt: string; recentActions: string[] }> = {};
  for (const log of db.activityLogs || []) {
    const em = log.adminEmail || 'unknown';
    if (!staffMap[em]) {
      staffMap[em] = { email: em, actionsCount: 0, blockedCount: 0, lastActionAt: log.timestamp, recentActions: [] };
    }
    staffMap[em].actionsCount++;
    if (log.result === 'blocked' || log.result === 'failure') staffMap[em].blockedCount++;
    if (staffMap[em].recentActions.length < 3) staffMap[em].recentActions.push(log.action);
  }

  // 9. Automated Business Alerts
  const automatedAlerts: { id: string; severity: 'critical' | 'warning' | 'info'; title: string; detail: string; category: string }[] = [];

  for (const item of inventoryDemandAlerts.filter((i) => i.urgency === 'critical').slice(0, 5)) {
    automatedAlerts.push({
      id: `alert-stock-${item.productId}`,
      severity: 'critical',
      category: 'Inventory Demand',
      title: item.currentStock === 0 ? `Out of Stock: ${item.name}` : `Urgent Restock: ${item.name}`,
      detail:
        item.currentStock === 0
          ? `${item.sku} has 0 units available.`
          : `Only ${item.currentStock} units remaining (${item.dailyVelocity}/day velocity, ~${item.estimatedDaysOfStock} days left).`,
    });
  }

  const openComplaints = (db.complaints || []).filter((c) => c.status !== 'resolved');
  if (openComplaints.length > 0) {
    automatedAlerts.push({
      id: 'alert-complaints',
      severity: openComplaints.some((c) => c.priority === 'urgent' || c.priority === 'high') ? 'critical' : 'warning',
      category: 'Customer Support',
      title: `${openComplaints.length} Open Order Support Ticket(s)`,
      detail: 'Unresolved customer complaints or AI escalations awaiting team response.',
    });
  }

  const unansweredQ = (db.productQuestions || []).filter((q) => !q.answer);
  if (unansweredQ.length > 0) {
    automatedAlerts.push({
      id: 'alert-qa',
      severity: 'info',
      category: 'Catalog Q&A',
      title: `${unansweredQ.length} Unanswered Customer Product Question(s)`,
      detail: 'Answering customer fit and fabric questions helps improve conversion.',
    });
  }

  const missingCogsCount = db.products.filter((p) => !p.costPrice || p.costPrice <= 0).length;
  if (missingCogsCount > 0) {
    automatedAlerts.push({
      id: 'alert-cogs',
      severity: 'info',
      category: 'Profitability',
      title: `${missingCogsCount} Product(s) Missing Cost Price (COGS)`,
      detail: 'Record costPrice in Products/Inventory for exact margin accuracy.',
    });
  }

  return {
    retention: {
      totalOrderingCustomers: customerEmails.length,
      repeatCustomerCount: repeatCustomers.length,
      oneTimeCustomerCount: oneTimeCustomers.length,
      retentionRatePercent,
      avgDaysBetweenOrders,
      repeatLeaderboard: repeatLeaderboard.slice(0, 15),
    },
    segments: {
      summary: segments,
      customers: segmentedCustomers,
    },
    returnsAnalysis: {
      totalReturnRequests: db.returnRequests?.length || 0,
      returnRatePercent,
      byProduct: Object.values(returnsByProduct),
      byReason: returnsByReason,
    },
    salesForecast,
    categoryPerformance: Object.values(categoryPerformanceMap).sort((a, b) => b.revenue - a.revenue),
    productComparison,
    couponPerformance,
    campaignAnalytics: db.campaigns || [],
    inventoryDemandAlerts,
    staffActivity: Object.values(staffMap).sort((a, b) => b.actionsCount - a.actionsCount),
    automatedAlerts,
  };
}
