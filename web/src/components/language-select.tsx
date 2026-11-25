'use client';

import { Languages } from 'lucide-react';
import { LANG_LIST, type Lang } from '@/i18n';
import { useT } from '@/i18n/client';

/** Change the app language any time; each option is written in its own script. */
export function LanguageSelect() {
  const { t, lang, setLang } = useT();
  return (
    <label className="lang-row">
      <Languages size={20} aria-hidden="true" />
      <span>{t('c.language')}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        aria-label={t('c.language')}
      >
        {LANG_LIST.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
