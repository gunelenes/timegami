import { useAppTheme } from '@/theme/theme-provider';
import type { ThemeColors } from '@/theme/themes';

/** Colours of the active theme and light/dark scheme. */
export function useTheme(): ThemeColors {
  return useAppTheme().colors;
}
