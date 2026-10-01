import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Language } from '../types';
import {
  TranslationSchema,
  translations,
  getTranslation,
  t as translateHelper,
  formatCurrency as formatCurrencyHelper,
  formatDate as formatDateHelper,
  formatNumber as formatNumberHelper,
} from '../lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  tDict: TranslationSchema;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | Date) => string;
  formatNumber: (num: number) => string;
}

const STORAGE_KEY = 'farm2home_language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'en' || saved === 'te' || saved === 'hi' || saved === 'ta')) {
        return saved as Language;
      }
    } catch {
      // ignore storage access errors in restricted iframe
    }
    return 'en';
  });

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // ignore storage access errors
    }
  };

  const tDict = useMemo(() => {
    return getTranslation(language);
  }, [language]);

  const t = useMemo(() => {
    return (path: string, params?: Record<string, string | number>) =>
      translateHelper(language, path, params);
  }, [language]);

  const formatCurrency = useMemo(() => {
    return (amount: number) => formatCurrencyHelper(amount, language);
  }, [language]);

  const formatDate = useMemo(() => {
    return (date: string | Date) => formatDateHelper(date, language);
  }, [language]);

  const formatNumber = useMemo(() => {
    return (num: number) => formatNumberHelper(num, language);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      tDict,
      formatCurrency,
      formatDate,
      formatNumber,
    }),
    [language, t, tDict, formatCurrency, formatDate, formatNumber]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback if used outside Provider
    return {
      language: 'en',
      setLanguage: () => {},
      t: (path: string, params?: Record<string, string | number>) =>
        translateHelper('en', path, params),
      tDict: translations.en,
      formatCurrency: (amount: number) => formatCurrencyHelper(amount, 'en'),
      formatDate: (date: string | Date) => formatDateHelper(date, 'en'),
      formatNumber: (num: number) => formatNumberHelper(num, 'en'),
    };
  }
  return context;
};

export const useTranslation = useLanguage;
