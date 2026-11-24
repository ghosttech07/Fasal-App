/**
 * Languages offered across India: English plus the 11 most widely spoken Indian languages among farmers.
 * Adding a language = add it here + a translation catalogue in web/src/i18n; no other code change (NFR-07).
 * shortcut: Urdu, Kashmiri and other right-to-left / smaller languages are not offered yet; add with RTL layout.
 */
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'or', 'pa', 'as'] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/** Fallback chain for missing strings/templates: requested → English (never another Indian language). */
export function languageFallbackChain(lang: LanguageCode): LanguageCode[] {
  return lang === 'en' ? ['en'] : [lang, 'en'];
}

export interface LanguageMeta {
  code: LanguageCode;
  /** Name written in its own script, shown on the language picker (F-01). */
  nativeName: string;
  englishName: string;
  /** BCP-47 locale used for Intl number/date formatting. */
  locale: string;
  script: 'Latin' | 'Devanagari' | 'Bengali' | 'Telugu' | 'Tamil' | 'Gujarati' | 'Kannada' | 'Malayalam' | 'Odia' | 'Gurmukhi';
}

const meta = (
  code: LanguageCode,
  nativeName: string,
  englishName: string,
  script: LanguageMeta['script'],
): LanguageMeta => ({ code, nativeName, englishName, locale: `${code}-IN`, script });

export const LANGUAGES: Readonly<Record<LanguageCode, LanguageMeta>> = {
  en: meta('en', 'English', 'English', 'Latin'),
  hi: meta('hi', 'हिन्दी', 'Hindi', 'Devanagari'),
  bn: meta('bn', 'বাংলা', 'Bengali', 'Bengali'),
  te: meta('te', 'తెలుగు', 'Telugu', 'Telugu'),
  mr: meta('mr', 'मराठी', 'Marathi', 'Devanagari'),
  ta: meta('ta', 'தமிழ்', 'Tamil', 'Tamil'),
  gu: meta('gu', 'ગુજરાતી', 'Gujarati', 'Gujarati'),
  kn: meta('kn', 'ಕನ್ನಡ', 'Kannada', 'Kannada'),
  ml: meta('ml', 'മലയാളം', 'Malayalam', 'Malayalam'),
  or: meta('or', 'ଓଡ଼ିଆ', 'Odia', 'Odia'),
  pa: meta('pa', 'ਪੰਜਾਬੀ', 'Punjabi', 'Gurmukhi'),
  as: meta('as', 'অসমীয়া', 'Assamese', 'Bengali'),
};

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}
