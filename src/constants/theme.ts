/**
 * Layout constants shared by every theme. Colours, fonts, radii and depth live in
 * `src/theme/themes.ts` and are read through `useAppTheme()` / `useTheme()`.
 */

export type { ThemeColor } from '@/theme/themes';

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 800;
