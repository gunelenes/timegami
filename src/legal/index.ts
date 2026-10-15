import type { Language } from '@/lib/i18n';

import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import tr from './tr.json';

/**
 * Privacy notice (KVKK aydınlatma metni + GDPR) and terms of use. One source for the in-app screens
 * and the hosted pages the stores link to (`npm run legal:build`). Drafts: have them reviewed legally.
 */
export interface LegalDocument {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
}

export type LegalKind = 'privacy' | 'terms';

/** Bump when the texts change materially: everyone sees the first-launch notice again. */
export const LEGAL_VERSION = 1;

export const CONTACT_EMAIL = 'enesgunel@enesgunel.com';

const DOCUMENTS: Record<Language, Record<LegalKind, LegalDocument>> = { en, tr, de, es, fr };

export function legalDocument(kind: LegalKind, language: string): LegalDocument {
  return (DOCUMENTS[language as Language] ?? DOCUMENTS.en)[kind];
}

export { DOCUMENTS as LEGAL_DOCUMENTS };
