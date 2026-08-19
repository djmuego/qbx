import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createTranslator, translateVars, type TranslateFn, type TranslateVarsFn } from './translate';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale, SUPPORTED_LOCALES } from './types';
import { useAuth } from '../context/AuthContext';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
  tv: TranslateVarsFn;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
  return SUPPORTED_LOCALES.includes(raw as Locale) ? (raw as Locale) : DEFAULT_LOCALE;
}

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  useEffect(() => {
    if (profile?.locale && SUPPORTED_LOCALES.includes(profile.locale as Locale)) {
      setLocaleState(profile.locale as Locale);
      localStorage.setItem(LOCALE_STORAGE_KEY, profile.locale);
    }
  }, [profile?.locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useMemo(() => createTranslator(locale), [locale]);
  const tv = useMemo(
    () => (key: string, vars: Record<string, string | number>, fallback?: string) =>
      translateVars(locale, key, vars, fallback),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t, tv }), [locale, setLocale, t, tv]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
