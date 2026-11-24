'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo } from 'react';
import type { Key, Lang } from '.';

type Ctx = { lang: Lang; dict: Record<Key, string>; chosen: boolean };
const LangContext = createContext<Ctx | null>(null);

/** Gets only the chosen language's strings from the server (not all 12), so the phone downloads little. */
export function LangProvider({ value, children }: { value: Ctx; children: React.ReactNode }) {
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useT() {
  const ctx = useContext(LangContext)!;
  const router = useRouter();
  const t = useCallback(
    (key: Key, vars?: Record<string, string | number>) => {
      const s = ctx.dict[key] ?? key;
      return vars
        ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
        : s;
    },
    [ctx.dict],
  );
  /** Remembers the language on this phone (1 year), saves it to the account if signed in, re-renders. */
  const setLang = useCallback(
    (code: Lang) => {
      document.cookie = `fs_lang=${code}; path=/; max-age=31536000; samesite=lax`;
      fetch('/api/fs/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ language: code }),
      }).catch(() => {});
      router.refresh();
    },
    [router],
  );
  return useMemo(
    () => ({ lang: ctx.lang, chosen: ctx.chosen, t, setLang }),
    [ctx.lang, ctx.chosen, t, setLang],
  );
}
