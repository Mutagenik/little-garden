import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { en, type Dictionary } from './en';
import type { LanguageCode } from '../lib/types';

/** Register new languages here. */
export const dictionaries: Record<LanguageCode, Dictionary> = { en };

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
export type TranslationKey = Leaves<Dictionary>;
export type TParams = Record<string, string | number>;
export type TFunction = (key: TranslationKey, params?: TParams) => string;

export function translate(dict: Dictionary, key: TranslationKey, params?: TParams): string {
  let node: unknown = dict;
  for (const part of key.split('.')) node = (node as Record<string, unknown>)?.[part];
  let text = typeof node === 'string' ? node : key;
  if (params) for (const [k, v] of Object.entries(params)) text = text.split(`{${k}}`).join(String(v));
  return text;
}

interface I18nValue {
  t: TFunction;
  locale: string;
  language: LanguageCode;
}

const I18nContext = createContext<I18nValue>({
  t: (key, params) => translate(en, key, params),
  locale: en.meta.locale,
  language: 'en',
});

export function I18nProvider({ language, children }: { language: LanguageCode; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => {
    const dict = dictionaries[language] ?? en;
    return { t: (key, params) => translate(dict, key, params), locale: dict.meta.locale, language };
  }, [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
