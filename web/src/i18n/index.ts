import {
  isLanguageCode,
  LANGUAGES,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from '@fasalshield/shared';
import { en, type Dict, type Key } from './en';
import { as } from './as';
import { bn } from './bn';
import { gu } from './gu';
import { hi } from './hi';
import { kn } from './kn';
import { ml } from './ml';
import { mr } from './mr';
import { or } from './or';
import { pa } from './pa';
import { ta } from './ta';
import { te } from './te';
import * as b2 from './b2';

export type { Key };
export type Lang = LanguageCode;
export const LANG_COOKIE = 'fs_lang';
export const LANG_LIST = SUPPORTED_LANGUAGES.map((c) => LANGUAGES[c]);

// Batch 1 (welcome, sign-in) + batch 2 (setup, buying, home, policy), merged per language.
const B1: Record<Exclude<Lang, 'en'>, Dict> = { hi, bn, te, mr, ta, gu, kn, ml, or, pa, as };
const DICTS = Object.fromEntries(
  (Object.keys(B1) as Exclude<Lang, 'en'>[]).map((l) => [l, { ...B1[l], ...b2[l] }]),
) as Record<Lang, Dict>;
DICTS.en = en;

export const asLang = (v: unknown): Lang => (isLanguageCode(v) ? v : 'en');

/** The chosen language's strings over English, so a missing translation shows English, never a blank. */
export function dictFor(lang: Lang): Record<Key, string> {
  return { ...en, ...DICTS[lang] } as Record<Key, string>;
}

export type T = (key: Key, vars?: Record<string, string | number>) => string;

export function makeT(dict: Record<Key, string>): T {
  return (key, vars) => {
    const s = dict[key] ?? en[key];
    return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
  };
}
