import crypto from 'crypto';
import type { Order, Product, ReturnExchangeRequest, User } from '../src/types.ts';
import type { DatabaseSchema } from './db.ts';
import { pushNotification, recalcProductStock, recordStockMovement } from './db.ts';

// =================== INTEGRATION CONFIG CHECKS ===================

export function getIntegrationsStatus() {
  const googleClientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const razorpayKeyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const razorpayKeySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const razorpayWebhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  const shiprocketToken = (process.env.SHIPROCKET_API_TOKEN || '').trim();
  const smtpHost = (process.env.SMTP_HOST || '').trim();
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const whatsappToken = (process.env.WHATSAPP_API_TOKEN || '').trim();

  return {
    googleOAuthConfigured: Boolean(googleClientId),
    googleClientId: googleClientId || null,
    razorpayConfigured: Boolean(razorpayKeyId && razorpayKeySecret),
    razorpayKeyId: razorpayKeyId || null,
    razorpayWebhookConfigured: Boolean(razorpayWebhookSecret),
    shiprocketConfigured: Boolean(shiprocketToken),
    smtpConfigured: Boolean(smtpHost && smtpUser),
    geminiConfigured: Boolean(geminiKey),
    whatsappApiConfigured: Boolean(whatsappToken),
  };
}

// =================== VARIANT INVENTORY LEDGER ===================

export function getVariantStock(product: Product, size: string, color: string): number {
  const key = `${size}::${color}`;
  if (product.variantStock && typeof product.variantStock[key] === 'number') {
    return product.variantStock[key];
  }
  // Fallback if only single color or unkeyed total
  if (product.variantStock && Object.keys(product.variantStock).length > 0) {
    const matchKey = Object.keys(product.variantStock).find(
      (k) => k.toLowerCase() === key.toLowerCase()
    );
    if (matchKey) return product.variantStock[matchKey];
    return 0;
  }
  return product.stockQuantity;
}

export function adjustVariantStock(
  db: DatabaseSchema,
  params: {
    product: Product;
    size: string;
    color: string;
    delta: number;
    reason: 'order' | 'cancellation' | 'return_restock' | 'manual_adjustment' | 'import' | 'initial';
    referenceId?: string;
    actorEmail: string;
  }
): { ok: boolean; error?: string; previousStock: number; newStock: number } {
  const { product, size, color, delta, reason, referenceId, actorEmail } = params;
  const key = `${size}::${color}`;

  if (!product.variantStock) product.variantStock = {};
  const exactKey =
    Object.keys(product.variantStock).find((k) => k.toLowerCase() === key.toLowerCase()) || key;
  const prevVariant = Number(product.variantStock[exactKey] ?? 0);

  if (delta < 0 && prevVariant + delta < 0) {
    return {
      ok: false,
      error: `Insufficient stock for ${product.name} (${size}, ${color}). Available: ${prevVariant}, requested: ${Math.abs(delta)}`,
      previousStock: prevVariant,
      newStock: prevVariant,
    };
  }

  const nextVariant = Math.max(0, prevVariant + delta);
  product.variantStock[exactKey] = nextVariant;
  recalcProductStock(product);

  recordStockMovement(db, {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    variantKey: exactKey,
    delta,
    previousStock: prevVariant,
    newStock: nextVariant,
    reason,
    referenceId,
    actorEmail,
  });

  const threshold = Number(product.lowStockThreshold ?? 10);
  if (delta < 0 && product.stockQuantity <= threshold) {
    pushNotification(db, {
      audience: 'admin',
      category: 'stock',
      title: product.stockQuantity === 0 ? `Out of Stock: ${product.name}` : `Low Stock Alert: ${product.name}`,
      message: `${product.name} (${product.sku}) now has ${product.stockQuantity} total units remaining (${exactKey}: ${nextVariant}).`,
      linkId: product.id,
    });
  }

  return { ok: true, previousStock: prevVariant, newStock: nextVariant };
}

// =================== RAZORPAY REAL CRYPTO & API HELPERS ===================

export function verifyRazorpaySignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): boolean {
  const secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(String(params.razorpaySignature || ''), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret || !signatureHeader) return false;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signatureHeader.trim(), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function createRazorpayGatewayOrder(amountInr: number, receiptId: string) {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!keyId || !keySecret) {
    return { configured: false as const, error: 'Razorpay credentials not configured.' };
  }
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const resp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(amountInr * 100), // paise
      currency: 'INR',
      receipt: receiptId,
      payment_capture: 1,
    }),
  });
  const data: any = await resp.json();
  if (!resp.ok) {
    return {
      configured: true as const,
      ok: false as const,
      error: data?.error?.description || 'Failed to create Razorpay order.',
    };
  }
  return { configured: true as const, ok: true as const, gatewayOrder: data, keyId };
}

export async function createRazorpayRefund(paymentId: string, amountInr: number) {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!keyId || !keySecret) {
    return { configured: false as const };
  }
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const resp = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: Math.round(amountInr * 100) }),
  });
  const data: any = await resp.json();
  if (!resp.ok) {
    return { configured: true as const, ok: false as const, error: data?.error?.description || 'Gateway refund failed' };
  }
  return { configured: true as const, ok: true as const, refund: data };
}

// =================== PROFIT & LOSS (HONEST REAL CALCULATIONS) ===================

export function computeProfitAndLoss(db: DatabaseSchema, fromIso?: string, toIso?: string) {
  const fromTs = fromIso ? new Date(fromIso).getTime() : 0;
  const toTs = toIso ? new Date(toIso).getTime() : Number.MAX_SAFE_INTEGER;

  const ordersInRange = db.orders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= fromTs && t <= toTs;
  });

  const nonCancelled = ordersInRange.filter((o) => o.orderStatus !== 'Cancelled');
  let grossProductSales = 0;
  let totalDiscounts = 0;
  let totalShippingCollected = 0;
  let netOrderRevenue = 0;
  let recordedCogs = 0;
  let unitsSold = 0;
  let unitsWithRecordedCost = 0;
  let unitsMissingCost = 0;

  for (const ord of nonCancelled) {
    grossProductSales += Number(ord.subtotal) || 0;
    totalDiscounts += (Number(ord.discount) || 0) + (Number(ord.loyaltyDiscount) || 0);
    totalShippingCollected += Number(ord.shipping) || 0;
    netOrderRevenue += Number(ord.total) || 0;

    for (const item of ord.items) {
      const qty = Number(item.quantity) || 0;
      unitsSold += qty;
      const prod = db.products.find((p) => p.id === item.productId);
      const unitCost =
        item.costPrice !== undefined && item.costPrice > 0
          ? item.costPrice
          : prod && prod.costPrice > 0
          ? prod.costPrice
          : 0;
      if (unitCost > 0) {
        recordedCogs += unitCost * qty;
        unitsWithRecordedCost += qty;
      } else {
        unitsMissingCost += qty;
      }
    }
  }

  const refundedOrders = ordersInRange.filter(
    (o) => o.paymentStatus === 'refunded' || o.orderStatus === 'Refunded'
  );
  const totalRefunds = refundedOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);

  const expensesInRange = db.expenses.filter((e) => {
    const t = new Date(e.date || e.createdAt).getTime();
    return t >= fromTs && t <= toTs;
  });
  const totalRecordedExpenses = expensesInRange.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const realizedNetRevenue = Math.max(0, netOrderRevenue - totalRefunds);
  const grossProfitBeforeExpenses = realizedNetRevenue - recordedCogs;
  const netProfit = grossProfitBeforeExpenses - totalRecordedExpenses;

  const productsMissingCostCount = db.products.filter((p) => !p.costPrice || p.costPrice <= 0).length;

  return {
    period: { from: fromIso || null, to: toIso || null },
    ordersCount: ordersInRange.length,
    activeOrdersCount: nonCancelled.length,
    refundedOrdersCount: refundedOrders.length,
    grossProductSales,
    totalDiscounts,
    totalShippingCollected,
    totalRefunds,
    realizedNetRevenue,
    recordedCogs,
    totalRecordedExpenses,
    grossProfitBeforeExpenses,
    netProfit,
    unitsSold,
    unitsWithRecordedCost,
    unitsMissingCost,
    productsMissingCostCount,
    costDataComplete: unitsMissingCost === 0 && productsMissingCostCount === 0,
    expensesBreakdown: expensesInRange,
  };
}

// =================== CSV BUILDER & PARSER ===================

export function escapeCsvCell(val: any): string {
  const str = String(val ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(headers: string[], rows: any[][]): string {
  return [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\r\n');
}

export function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export function sanitizeUserForPublic(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    adminRole: user.adminRole,
    status: user.status,
    addresses: user.addresses || [],
    wishlist: user.wishlist || [],
    loyaltyPoints: user.loyaltyPoints || 0,
    loyaltyHistory: user.loyaltyHistory || [],
    referralCode: user.referralCode,
    birthdayMonth: user.birthdayMonth,
    birthdayConsent: user.birthdayConsent,
    stockAlerts: user.stockAlerts || [],
    priceDropAlerts: user.priceDropAlerts || {},
    abandonedCartConsent: Boolean(user.abandonedCartConsent),
    marketingConsent: Boolean(user.marketingConsent),
    vipTierOverride: user.vipTierOverride,
    recentlyViewedIds: user.recentlyViewedIds || [],
  };
}

export function sanitizeOrderForPublic(order: Order) {
  const { internalNotes: _hidden, ...rest } = order;
  return rest;
}

export function sanitizeReturnForCustomer(ret: ReturnExchangeRequest) {
  return ret;
}
