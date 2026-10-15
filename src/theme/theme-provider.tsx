import { createContext, useContext, type ReactNode } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePreferences } from '@/lib/preferences';
import { DEFAULT_THEME_ID, THEMES, type ThemeColors, type ThemeDefinition, type ThemePalette } from '@/theme/themes';

export interface AppTheme {
  definition: ThemeDefinition;
  scheme: 'light' | 'dark';
  colors: ThemeColors;
  palette: ThemePalette;
}

function resolve(definition: ThemeDefinition, scheme: 'light' | 'dark'): AppTheme {
  const palette = definition[scheme];
  return { definition, scheme, colors: palette.colors, palette };
}

const ThemeContext = createContext<AppTheme>(resolve(THEMES[DEFAULT_THEME_ID], 'light'));

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { themeId, appearance } = usePreferences();
  const system = useColorScheme();
  const scheme = appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;
  const definition = THEMES[themeId] ?? THEMES[DEFAULT_THEME_ID];
  return <ThemeContext.Provider value={resolve(definition, scheme)}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  return useContext(ThemeContext);
}
