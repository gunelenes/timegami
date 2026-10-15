import { getCalendars, getLocales } from 'expo-localization';

/** The player's current IANA time zone; passed explicitly into all domain time calculations. */
export function deviceTimeZone(): string {
  return getCalendars()[0]?.timeZone ?? 'UTC';
}

/** BCP 47 tag used for date and weekday names, e.g. "tr-TR". */
export function deviceLocale(): string {
  return getLocales()[0]?.languageTag ?? 'en-US';
}

export function deviceLanguage(): string {
  return getLocales()[0]?.languageCode ?? 'en';
}

/**
 * Locale for dates and weekday names in the chosen app language. Keeps the device region
 * when it matches (e.g. "en-GB"), otherwise uses the bare language ("de").
 */
export function appLocale(language: string): string {
  const device = getLocales()[0];
  return device?.languageCode === language ? device.languageTag : language;
}
