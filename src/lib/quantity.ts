import { Language } from '../types.js';
import { getTranslation } from './translations.js';

export type CanonicalUnit =
  | 'piece'
  | 'unit'
  | 'kg'
  | 'g'
  | 'bunch'
  | 'crate'
  | 'box'
  | 'L';

/**
 * Standardizes raw unit string into its singular canonical form
 */
export function normalizeUnit(rawUnit?: string): CanonicalUnit {
  if (!rawUnit || typeof rawUnit !== 'string') {
    return 'unit';
  }

  const u = rawUnit.trim().toLowerCase();

  // Weight
  if (u === 'kg' || u === 'kgs' || u === 'kilogram' || u === 'kilograms') {
    return 'kg';
  }
  if (u === 'g' || u === 'gm' || u === 'gms' || u === 'gram' || u === 'grams') {
    return 'g';
  }

  // Liquid
  if (
    u === 'l' ||
    u === 'ltr' ||
    u === 'liter' ||
    u === 'liters' ||
    u === 'litre' ||
    u === 'litres'
  ) {
    return 'L';
  }

  // Count / Bundles
  if (u === 'bunch' || u === 'bunches') {
    return 'bunch';
  }
  if (u === 'crate' || u === 'crates') {
    return 'crate';
  }
  if (u === 'box' || u === 'boxes') {
    return 'box';
  }
  if (u === 'piece' || u === 'pieces' || u === 'pc' || u === 'pcs') {
    return 'piece';
  }
  if (u === 'unit' || u === 'units') {
    return 'unit';
  }

  // Fallback to piece if matches known aliases, otherwise unit
  return 'unit';
}

/**
 * Checks if the unit is discrete / count-based (must be integer quantity)
 */
export function isCountBasedUnit(unit?: string): boolean {
  const norm = normalizeUnit(unit);
  return (
    norm === 'piece' ||
    norm === 'unit' ||
    norm === 'bunch' ||
    norm === 'crate' ||
    norm === 'box'
  );
}

/**
 * Validates requested quantity against unit semantics
 */
export function isValidQuantityForUnit(
  quantity: number,
  unit?: string
): { valid: boolean; error?: string } {
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) {
    return { valid: false, error: 'Quantity must be a positive number' };
  }

  const norm = normalizeUnit(unit);
  if (isCountBasedUnit(norm)) {
    if (!Number.isInteger(quantity)) {
      return {
        valid: false,
        error: `Quantity for ${formatUnit(norm, 2)} must be a whole integer`,
      };
    }
  }

  return { valid: true };
}

/**
 * Returns formatted unit string respecting singular/plural and localization
 */
export function formatUnit(
  rawUnit?: string,
  quantity: number = 1,
  language: Language = 'en'
): string {
  const norm = normalizeUnit(rawUnit);
  const isSingular = quantity === 1;

  if (language === 'en') {
    switch (norm) {
      case 'piece':
        return isSingular ? 'piece' : 'pieces';
      case 'unit':
        return isSingular ? 'unit' : 'units';
      case 'bunch':
        return isSingular ? 'bunch' : 'bunches';
      case 'crate':
        return isSingular ? 'crate' : 'crates';
      case 'box':
        return isSingular ? 'box' : 'boxes';
      case 'kg':
        return 'kg';
      case 'g':
        return 'g';
      case 'L':
        return 'L';
      default:
        return isSingular ? 'unit' : 'units';
    }
  }

  // Non-English localization
  try {
    const t = getTranslation(language);
    switch (norm) {
      case 'kg':
        return t.units?.kg || 'kg';
      case 'g':
        return t.units?.gram || 'g';
      case 'L':
        return t.units?.liter || 'L';
      case 'bunch':
        return t.units?.bunch || 'bunch';
      case 'piece':
        return t.units?.piece || (isSingular ? 'piece' : 'pieces');
      case 'unit':
        return isSingular ? 'unit' : (t.common?.units || 'units');
      case 'crate':
        return isSingular ? 'crate' : 'crates';
      case 'box':
        return isSingular ? 'box' : 'boxes';
      default:
        return isSingular ? 'unit' : 'units';
    }
  } catch {
    return isSingular ? norm : `${norm}s`;
  }
}

/**
 * Format quantity with proper unit:
 * e.g. "1 piece", "2 pieces", "25 kg", "2.5 kg", "1 bunch", "2 bunches"
 */
export function formatQuantity(
  quantity: number,
  rawUnit?: string,
  language: Language = 'en'
): string {
  const cleanQty = Number.isInteger(quantity)
    ? quantity.toString()
    : (Math.round(quantity * 100) / 100).toString();

  const unitStr = formatUnit(rawUnit, quantity, language);
  return `${cleanQty} ${unitStr}`;
}

/**
 * Format stock message cleanly avoiding malformed artifacts like "{count} {unit} in stock":
 * e.g. "80 pieces in stock", "25 kg in stock", "18 crates in stock"
 */
export function formatStock(
  stock: number,
  rawUnit?: string,
  language: Language = 'en'
): string {
  if (stock <= 0) {
    try {
      const t = getTranslation(language);
      return t.customer?.outOfStock || 'Out of stock';
    } catch {
      return 'Out of stock';
    }
  }

  if (language === 'en') {
    return `${formatQuantity(stock, rawUnit, 'en')} in stock`;
  }

  // Localized stock template with clean interpolation
  try {
    const t = getTranslation(language);
    const template = t.customer?.inStock || '{count} {unit} in stock';
    const unitStr = formatUnit(rawUnit, stock, language);
    return template
      .replace('{count}', String(stock))
      .replace('{unit}', unitStr)
      .trim();
  } catch {
    return `${formatQuantity(stock, rawUnit, 'en')} in stock`;
  }
}

/**
 * Format "Only X left" badge with proper unit and interpolation
 */
export function formatOnlyLeft(
  stock: number,
  rawUnit?: string,
  language: Language = 'en'
): string {
  if (language === 'en') {
    return `Only ${formatQuantity(stock, rawUnit, 'en')} left`;
  }

  try {
    const t = getTranslation(language);
    const template = t.customer?.onlyLeft || 'Only {count} {unit} left';
    const unitStr = formatUnit(rawUnit, stock, language);
    return template
      .replace('{count}', String(stock))
      .replace('{unit}', unitStr)
      .trim();
  } catch {
    return `Only ${formatQuantity(stock, rawUnit, 'en')} left`;
  }
}

/**
 * Format Price per unit: e.g. "₹130/kg", "₹42/piece"
 */
export function formatPricePerUnit(
  price: number,
  rawUnit?: string,
  language: Language = 'en'
): string {
  const unit = normalizeUnit(rawUnit);
  return `₹${price}/${unit}`;
}

/**
 * Format order item summary: e.g. "Vine Tomatoes (2 kg)"
 */
export function formatOrderItemSummary(
  title: string,
  quantity: number,
  rawUnit?: string,
  language: Language = 'en'
): string {
  return `${title} (${formatQuantity(quantity, rawUnit, language)})`;
}
