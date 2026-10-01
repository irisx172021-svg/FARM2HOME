import { Language } from '../types';
import { TranslationSchema } from './translations/types';
import { en } from './translations/en';
import { te } from './translations/te';
import { hi } from './translations/hi';
import { ta } from './translations/ta';

export * from './translations/types';

export const translations: Record<Language, TranslationSchema> = {
  en,
  te,
  hi,
  ta,
};

/**
 * Returns the dictionary for the requested language.
 * Uses a Proxy fallback so if any individual key or nested namespace property is missing or undefined in te/hi/ta,
 * it seamlessly and gracefully falls back to the English translation without ever returning undefined or raw keys.
 */
export function getTranslation(lang: Language): TranslationSchema {
  const selected = translations[lang] || translations.en;
  if (lang === 'en') return selected;

  function createFallbackProxy<T extends object>(target: T, fallback: T): T {
    return new Proxy(target, {
      get(obj, prop) {
        const val = (obj as any)[prop];
        const fbVal = (fallback as any)[prop];

        if (val !== undefined && val !== null && val !== '') {
          if (typeof val === 'object' && !Array.isArray(val) && typeof fbVal === 'object') {
            return createFallbackProxy(val, fbVal);
          }
          return val;
        }

        if (fbVal !== undefined) {
          if (typeof fbVal === 'object' && !Array.isArray(fbVal)) {
            return createFallbackProxy({}, fbVal);
          }
          return fbVal;
        }

        return '';
      },
    });
  }

  return createFallbackProxy(selected, translations.en);
}

/**
 * Helper to interpolate string params like {count}, {unit}, {item}
 */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return Object.entries(params).reduce((res, [key, val]) => {
    return res.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
  }, template);
}

/**
 * Safe translation lookup helper supporting dot-paths, e.g.
 * t('te', 'cropPlanner.title') or t('hi', 'addToCart')
 */
export function t(
  lang: Language,
  path: string,
  params?: Record<string, string | number>
): string {
  const dict = getTranslation(lang);
  const parts = path.split('.');

  let current: any = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      current = undefined;
      break;
    }
  }

  // Fallback to English dict if not found
  if (current === undefined || current === null || current === '') {
    let fbCurrent: any = translations.en;
    for (const part of parts) {
      if (fbCurrent && typeof fbCurrent === 'object' && part in fbCurrent) {
        fbCurrent = fbCurrent[part];
      } else {
        fbCurrent = undefined;
        break;
      }
    }
    current = fbCurrent;
  }

  if (typeof current === 'string') {
    return interpolate(current, params);
  }

  return path;
}

/**
 * Currency formatter - respects Indian Rupee format ₹ with locale digit separators
 */
export function formatCurrency(amount: number, _lang?: Language): string {
  if (isNaN(amount)) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Number formatter respecting locale where suitable
 */
export function formatNumber(num: number, _lang?: Language): string {
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
}

/**
 * Date formatter for the given language
 */
export function formatDate(date: string | Date, lang: Language = 'en'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);

    const localeMap: Record<Language, string> = {
      en: 'en-IN',
      te: 'te-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
    };

    return d.toLocaleDateString(localeMap[lang] || 'en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(date);
  }
}
