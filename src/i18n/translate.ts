import ru from './messages/ru';
import en from './messages/en';
import type { Locale } from './types';
import { DEFAULT_LOCALE } from './types';

const CATALOG: Record<Locale, Record<string, unknown>> = { ru, en };

type Path = string;

function resolvePath(tree: unknown, path: Path): string | undefined {
  const parts = path.split('.');
  let node: unknown = tree;
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function translate(locale: Locale, key: Path, fallback?: string): string {
  const primary = resolvePath(CATALOG[locale], key);
  if (primary) return interpolate(primary, {});
  if (locale !== DEFAULT_LOCALE) {
    const ruFallback = resolvePath(CATALOG[DEFAULT_LOCALE], key);
    if (ruFallback) return interpolate(ruFallback, {});
  }
  return fallback ?? key;
}

export function translateVars(locale: Locale, key: Path, vars: Record<string, string | number>, fallback?: string): string {
  const raw = resolvePath(CATALOG[locale], key)
    ?? (locale !== DEFAULT_LOCALE ? resolvePath(CATALOG[DEFAULT_LOCALE], key) : undefined)
    ?? fallback
    ?? key;
  return interpolate(raw, vars);
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ''));
}

export function createTranslator(locale: Locale) {
  return (key: Path, fallback?: string) => translate(locale, key, fallback);
}

export function createTranslatorWithVars(locale: Locale) {
  const t = createTranslator(locale);
  return Object.assign(t, {
    vars: (key: Path, vars: Record<string, string | number>, fallback?: string) =>
      translateVars(locale, key, vars, fallback),
  });
}

export type TranslateFn = ReturnType<typeof createTranslator>;

export type TranslateVarsFn = (key: Path, vars: Record<string, string | number>, fallback?: string) => string;
