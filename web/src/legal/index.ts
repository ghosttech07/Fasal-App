import type { Lang } from '@/i18n';
import type { LegalSet } from './types';
import { en } from './en';
import { hi } from './hi';
import { mr } from './mr';
import { bn } from './bn';
import { te } from './te';
import { ta } from './ta';
import { gu } from './gu';
import { kn } from './kn';
import { ml } from './ml';
import { or } from './or';
import { pa } from './pa';
import { as } from './as';
import { ur } from './ur';

export * from './types';
export const LEGAL: Record<Lang, LegalSet> = { en, hi, mr, bn, te, ta, gu, kn, ml, or, pa, as, ur };
