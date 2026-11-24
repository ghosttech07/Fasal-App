import { cookies } from 'next/headers';
import { asLang, dictFor, LANG_COOKIE, makeT } from '.';

/** Language and translator for server components (from the farmer's language cookie). */
export async function getT() {
  const lang = asLang((await cookies()).get(LANG_COOKIE)?.value);
  return { lang, t: makeT(dictFor(lang)) };
}
