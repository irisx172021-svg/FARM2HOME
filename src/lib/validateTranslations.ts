import { TranslationSchema } from './translations/types';
import { en } from './translations/en';
import { te } from './translations/te';
import { hi } from './translations/hi';
import { ta } from './translations/ta';
import { Language } from '../types';

export interface MissingTranslationReport {
  language: Language;
  missingKeys: string[];
  emptyKeys: string[];
}

/**
 * Recursively inspects a target translation dictionary against the baseline English dictionary.
 * Reports any keys that are missing or empty string.
 */
export function validateLanguageDictionary(
  lang: Language,
  targetDict: Record<string, any>,
  baselineDict: Record<string, any> = en,
  prefix: string = ''
): MissingTranslationReport {
  const missingKeys: string[] = [];
  const emptyKeys: string[] = [];

  for (const key of Object.keys(baselineDict)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const baseVal = baselineDict[key];
    const targetVal = targetDict[key];

    if (targetVal === undefined || targetVal === null) {
      missingKeys.push(fullPath);
    } else if (typeof baseVal === 'object' && baseVal !== null && !Array.isArray(baseVal)) {
      if (typeof targetVal !== 'object' || targetVal === null) {
        missingKeys.push(fullPath);
      } else {
        const subReport = validateLanguageDictionary(lang, targetVal, baseVal, fullPath);
        missingKeys.push(...subReport.missingKeys);
        emptyKeys.push(...subReport.emptyKeys);
      }
    } else if (typeof targetVal === 'string' && targetVal.trim() === '') {
      emptyKeys.push(fullPath);
    }
  }

  return {
    language: lang,
    missingKeys,
    emptyKeys,
  };
}

export function validateAllTranslations(): Record<Language, MissingTranslationReport> {
  return {
    en: validateLanguageDictionary('en', en, en),
    te: validateLanguageDictionary('te', te, en),
    hi: validateLanguageDictionary('hi', hi, en),
    ta: validateLanguageDictionary('ta', ta, en),
  };
}
