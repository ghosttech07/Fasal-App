/**
 * MVP languages. Docs listed en/hi/mr/te; the build brief limits the start to English, Hindi + one
 * regional language. Marathi was chosen because the pilot geography is Marathwada (docs Q-03).
 * Adding a language = add the code here + translation catalogues; no other code change (NFR-07).
 */
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr'] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/** Fallback chain for missing strings/templates: requested → Hindi → English (docs FS-1001). */
export function languageFallbackChain(lang: LanguageCode): LanguageCode[] {
  const chain: LanguageCode[] = [lang];
  if (lang !== 'hi') chain.push('hi');
  if (lang !== 'en') chain.push('en');
  return chain;
}

export interface LanguageMeta {
  code: LanguageCode;
  /** Name written in its own script, shown on the language picker (F-01). */
  nativeName: string;
  englishName: string;
  /** BCP-47 locale used for Intl number/date formatting. */
  locale: string;
  script: 'Latin' | 'Devanagari';
}

export const LANGUAGES: Readonly<Record<LanguageCode, LanguageMeta>> = {
  en: {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    locale: 'en-IN',
    script: 'Latin',
  },
  hi: {
    code: 'hi',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
    locale: 'hi-IN',
    script: 'Devanagari',
  },
  mr: {
    code: 'mr',
    nativeName: 'मराठी',
    englishName: 'Marathi',
    locale: 'mr-IN',
    script: 'Devanagari',
  },
};

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}
