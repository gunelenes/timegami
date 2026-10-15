import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { applyLanguage, isSupportedLanguage, type Language } from '@/lib/i18n';
import { DEFAULT_THEME_ID, THEMES, type ThemeId } from '@/theme/themes';

export type Appearance = 'system' | 'light' | 'dark';
export type LanguagePreference = 'system' | Language;

export interface Preferences {
  language: LanguagePreference;
  appearance: Appearance;
  themeId: ThemeId;
  /** Local 20:00 reminders for streak rooms not marked today. */
  streakReminders: boolean;
  /** Version of the privacy notice last shown at first launch; 0 = never. See LEGAL_VERSION. */
  legalNoticeSeen: number;
}

const STORAGE_KEY = 'timegami.preferences.v1';
const DEFAULTS: Preferences = { language: 'system', appearance: 'system', themeId: DEFAULT_THEME_ID, streakReminders: false, legalNoticeSeen: 0 };

interface PreferencesContextValue extends Preferences {
  /** False until stored preferences are read; the app waits behind the splash screen. */
  ready: boolean;
  update: (changes: Partial<Preferences>) => void;
  /** Back to defaults, as after a fresh install (used by account deletion). */
  reset: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue>({ ...DEFAULTS, ready: false, update: () => {}, reset: async () => {} });

/** Drops unknown or outdated values so a bad stored value can never break startup. */
function sanitize(raw: unknown): Preferences {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Preferences, unknown>>;
  return {
    language: p.language === 'system' || isSupportedLanguage(p.language) ? p.language : DEFAULTS.language,
    appearance: p.appearance === 'light' || p.appearance === 'dark' ? p.appearance : DEFAULTS.appearance,
    themeId: typeof p.themeId === 'string' && p.themeId in THEMES ? (p.themeId as ThemeId) : DEFAULTS.themeId,
    streakReminders: p.streakReminders === true,
    legalNoticeSeen: typeof p.legalNoticeSeen === 'number' ? p.legalNoticeSeen : 0,
  };
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => (json ? sanitize(JSON.parse(json)) : DEFAULTS))
      .catch(() => DEFAULTS)
      .then(async (loaded) => {
        setPrefs(loaded);
        await applyLanguage(loaded.language);
        setReady(true);
      });
  }, []);

  const update = (changes: Partial<Preferences>) => {
    const next = { ...prefs, ...changes };
    setPrefs(next);
    if (changes.language) applyLanguage(changes.language);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const reset = async () => {
    setPrefs(DEFAULTS);
    await applyLanguage(DEFAULTS.language);
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  return <PreferencesContext.Provider value={{ ...prefs, ready, update, reset }}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  return useContext(PreferencesContext);
}
