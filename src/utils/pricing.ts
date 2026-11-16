import type { Product, SizePricingEntry } from '../types.ts';

export const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

function findSizePricingKey(
  map: Record<string, SizePricingEntry> | undefined,
  size: string
): string | undefined {
  if (!map || !size) return undefined;
  if (map[size]) return size;
  const target = size.trim().toLowerCase();
  return Object.keys(map).find((k) => k.trim().toLowerCase() === target);
}

export function getSizePricingEntry(
  product: Partial<Pick<Product, 'originalPrice' | 'discountedPrice'>> & Pick<Product, 'sizePricing'>,
  size?: string
): { originalPrice: number; discountedPrice: number; available: boolean } {
  const fallbackSell = Math.max(0, Number(product.discountedPrice) || 0);
  const fallbackMrp = Math.max(fallbackSell, Number(product.originalPrice) || fallbackSell);

  if (!size) {
    return { originalPrice: fallbackMrp, discountedPrice: fallbackSell, available: true };
  }

  const key = findSizePricingKey(product.sizePricing, size);
  if (!key || !product.sizePricing?.[key]) {
    return { originalPrice: fallbackMrp, discountedPrice: fallbackSell, available: true };
  }

  const raw = product.sizePricing[key];
  const sell = Number(raw.discountedPrice) > 0 ? Math.round(Number(raw.discountedPrice)) : fallbackSell;
  const rawMrp = Number(raw.originalPrice) > 0 ? Math.round(Number(raw.originalPrice)) : fallbackMrp;
  const mrp = Math.max(sell, rawMrp);

  return {
    originalPrice: mrp,
    discountedPrice: sell,
    available: raw.available !== false,
  };
}

export function getSizeTotalStock(
  product: Pick<Product, 'sizes' | 'colors' | 'variantStock' | 'stockQuantity' | 'inStock'>,
  size: string,
  color?: string
): number {
  if (product.inStock === false) return 0;
  const matrix = product.variantStock || {};
  const keys = Object.keys(matrix);
  if (keys.length === 0) {
    return Math.max(0, Number(product.stockQuantity) || 0);
  }

  const normSize = size.trim().toLowerCase();
  if (color) {
    const normColor = color.trim().toLowerCase();
    const matchKey = keys.find((k) => {
      const [s, c] = k.split('::');
      return s?.trim().toLowerCase() === normSize && c?.trim().toLowerCase() === normColor;
    });
    if (matchKey !== undefined) {
      return Math.max(0, Number(matrix[matchKey]) || 0);
    }
    return 0;
  }

  const sizeKeys = keys.filter((k) => k.split('::')[0]?.trim().toLowerCase() === normSize);
  if (sizeKeys.length === 0) {
    return Math.max(0, Number(product.stockQuantity) || 0);
  }
  return sizeKeys.reduce((sum, k) => sum + Math.max(0, Number(matrix[k]) || 0), 0);
}

export function isSizeAvailableForPurchase(
  product: Pick<Product, 'sizes' | 'colors' | 'variantStock' | 'stockQuantity' | 'inStock' | 'sizePricing'>,
  size: string,
  color?: string
): boolean {
  if (!size || product.inStock === false) return false;
  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    const existsInSizes = product.sizes.some((s) => s.trim().toLowerCase() === size.trim().toLowerCase());
    if (!existsInSizes) return false;
  }
  const pricing = getSizePricingEntry(product, size);
  if (!pricing.available) return false;
  return getSizeTotalStock(product, size, color) > 0;
}

export function applyFlashDiscountToAmount(
  baseAmount: number,
  product: Pick<Product, 'discountedPrice' | 'flashSalePrice' | 'flashSaleDiscountPercent'>,
  overrideFlashPercent?: number
): number {
  const cleanBase = Math.max(1, Math.round(Number(baseAmount) || 0));
  const pct =
    overrideFlashPercent && overrideFlashPercent > 0
      ? overrideFlashPercent
      : product.flashSaleDiscountPercent && product.flashSaleDiscountPercent > 0
      ? product.flashSaleDiscountPercent
      : 0;

  if (pct > 0) {
    return Math.max(1, Math.round(cleanBase * (1 - Math.min(90, pct) / 100)));
  }

  if (
    product.flashSalePrice &&
    product.flashSalePrice > 0 &&
    product.discountedPrice > 0 &&
    product.flashSalePrice < product.discountedPrice
  ) {
    const ratio = product.flashSalePrice / product.discountedPrice;
    return Math.max(1, Math.round(cleanBase * ratio));
  }

  return cleanBase;
}

export function getStartingSize(
  product: Pick<Product, 'sizes' | 'colors' | 'variantStock' | 'stockQuantity' | 'inStock' | 'originalPrice' | 'discountedPrice' | 'sizePricing'>
): string {
  const sizes = Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes : ['M'];
  const purchasable = sizes.filter((sz) => isSizeAvailableForPurchase(product, sz));
  const candidates = purchasable.length > 0 ? purchasable : sizes.filter((sz) => getSizePricingEntry(product, sz).available);
  const pool = candidates.length > 0 ? candidates : sizes;

  let bestSize = pool[0];
  let bestPrice = getSizePricingEntry(product, bestSize).discountedPrice;

  for (const sz of pool) {
    const price = getSizePricingEntry(product, sz).discountedPrice;
    if (price < bestPrice) {
      bestPrice = price;
      bestSize = sz;
    }
  }
  return bestSize;
}

export function getEffectiveSizePrice(
  product: Pick<
    Product,
    'sizes' | 'colors' | 'variantStock' | 'stockQuantity' | 'inStock' | 'originalPrice' | 'discountedPrice' | 'sizePricing' | 'flashSalePrice' | 'flashSaleDiscountPercent'
  >,
  size?: string,
  overrideFlashPercent?: number
): number {
  const targetSize = size || getStartingSize(product);
  const base = getSizePricingEntry(product, targetSize).discountedPrice;
  return applyFlashDiscountToAmount(base, product, overrideFlashPercent);
}

export function getEffectiveOriginalPrice(
  product: Pick<Product, 'sizes' | 'colors' | 'variantStock' | 'stockQuantity' | 'inStock' | 'originalPrice' | 'discountedPrice' | 'sizePricing'>,
  size?: string
): number {
  const targetSize = size || getStartingSize(product);
  return getSizePricingEntry(product, targetSize).originalPrice;
}

export function getProductPriceRange(
  product: Pick<
    Product,
    'sizes' | 'colors' | 'variantStock' | 'stockQuantity' | 'inStock' | 'originalPrice' | 'discountedPrice' | 'sizePricing' | 'flashSalePrice' | 'flashSaleDiscountPercent'
  >,
  overrideFlashPercent?: number
): { min: number; max: number; hasRange: boolean } {
  const sizes = Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes : ['M'];
  const availableSizes = sizes.filter((sz) => getSizePricingEntry(product, sz).available);
  const pool = availableSizes.length > 0 ? availableSizes : sizes;

  const prices = pool.map((sz) => getEffectiveSizePrice(product, sz, overrideFlashPercent));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, hasRange: max > min };
}

export function getSizeDiscountPercent(originalPrice: number, sellingPrice: number): number {
  if (originalPrice > sellingPrice && originalPrice > 0) {
    return Math.round(((originalPrice - sellingPrice) / originalPrice) * 100);
  }
  return 0;
}

export function normalizeSizePricingPayload(
  rawSizePricing: Record<string, any> | undefined,
  sizes: string[],
  fallbackOriginalPrice: number,
  fallbackDiscountedPrice: number
): Record<string, SizePricingEntry> {
  const cleanMrp = Math.max(1, Math.round(Number(fallbackOriginalPrice) || 1));
  const cleanSell = Math.max(1, Math.min(cleanMrp, Math.round(Number(fallbackDiscountedPrice) || cleanMrp)));
  const out: Record<string, SizePricingEntry> = {};

  for (const sz of sizes) {
    const srcKey = findSizePricingKey(rawSizePricing as Record<string, SizePricingEntry> | undefined, sz);
    const entry = srcKey ? rawSizePricing?.[srcKey] : undefined;
    const sell = entry && Number(entry.discountedPrice) > 0 ? Math.round(Number(entry.discountedPrice)) : cleanSell;
    const rawEntryMrp = entry && Number(entry.originalPrice) > 0 ? Math.round(Number(entry.originalPrice)) : cleanMrp;
    const mrp = Math.max(sell, rawEntryMrp);
    out[sz] = {
      originalPrice: mrp,
      discountedPrice: sell,
      available: entry ? entry.available !== false : true,
    };
  }
  return out;
}

const SIZE_SORT_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'];

export function buildProgressiveSizePricing(
  sizes: string[],
  baseOriginalPrice: number,
  baseDiscountedPrice: number
): Record<string, SizePricingEntry> {
  const cleanSell = Math.max(199, Math.round(Number(baseDiscountedPrice) || 999));
  const cleanMrp = Math.max(cleanSell, Math.round(Number(baseOriginalPrice) || cleanSell));
  const list = Array.isArray(sizes) && sizes.length > 0 ? sizes : ['M'];

  if (list.length === 1) {
    return {
      [list[0]]: {
        originalPrice: cleanMrp,
        discountedPrice: cleanSell,
        available: true,
      },
    };
  }

  // Order recognized sizes from smallest to largest while mapping back to original keys
  const indexed = list.map((sz, origIdx) => {
    const rank = SIZE_SORT_ORDER.indexOf(sz.trim().toUpperCase());
    return { sz, origIdx, rank: rank === -1 ? 100 + origIdx : rank };
  });
  const sorted = [...indexed].sort((a, b) => a.rank - b.rank || a.origIdx - b.origIdx);

  const step = cleanSell >= 2500 ? 100 : 50;
  // Center near 'M' (or midpoint) so smaller sizes are cheaper and larger sizes cost more
  const mPos = sorted.findIndex((x) => x.sz.trim().toUpperCase() === 'M');
  const anchorPos = mPos !== -1 ? mPos : Math.floor((sorted.length - 1) / 2);
  const mrpRatio = cleanSell > 0 ? cleanMrp / cleanSell : 1.4;

  const out: Record<string, SizePricingEntry> = {};
  sorted.forEach((item, pos) => {
    const delta = (pos - anchorPos) * step;
    const sizeSell = Math.max(199, cleanSell + delta);
    const sizeMrp = Math.max(
      sizeSell,
      Math.round((cleanMrp + Math.round(delta * mrpRatio)) / 10) * 10 - 1
    );
    out[item.sz] = {
      originalPrice: Math.max(sizeSell, sizeMrp),
      discountedPrice: sizeSell,
      available: true,
    };
  });

  // Preserve original key iteration order
  const orderedOut: Record<string, SizePricingEntry> = {};
  for (const sz of list) {
    orderedOut[sz] = out[sz];
  }
  return orderedOut;
}

