import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { deviceLanguage } from '@/lib/locale';
import de from '@/locales/de.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import tr from '@/locales/tr.json';

/** English first: it is the default and the fallback for missing keys. */
export const SUPPORTED_LANGUAGES = ['en', 'tr', 'de', 'es', 'fr'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Each language named in itself, as shown in the language picker. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
};

export function isSupportedLanguage(value: unknown): value is Language {
  return (SUPPORTED_LANGUAGES as readonly unknown[]).includes(value);
}

/** The device language when we support it, English otherwise. */
export function systemLanguage(): Language {
  const device = deviceLanguage();
  return isSupportedLanguage(device) ? device : 'en';
}

export function applyLanguage(preference: 'system' | Language) {
  return i18n.changeLanguage(preference === 'system' ? systemLanguage() : preference);
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
    de: { translation: de },
    es: { translation: es },
    fr: { translation: fr },
  },
  lng: systemLanguage(),
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false },
});

export default i18n;
