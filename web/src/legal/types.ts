/** One legal page: title and its sections (heading + paragraphs). Bracketed items are filled in once the insurer signs. */
export type LegalDoc = { title: string; sections: [string, string[]][] };
export type LegalSet = {
  /** The word for "Version" in this language. */
  version: string;
  /** Shown on translated pages: the English text is the legally binding one until a reviewed translation replaces it. */
  note?: string;
  docs: { terms: LegalDoc; privacy: LegalDoc; grievance: LegalDoc };
};
export const LEGAL_VERSION = 1;
export const LEGAL_UPDATED = '2026-11-25';
