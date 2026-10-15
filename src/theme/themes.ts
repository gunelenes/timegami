import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { Platform } from 'react-native';

export interface ThemeColors {
  text: string;
  textSecondary: string;
  background: string;
  /** Cards, inputs and other raised surfaces. */
  backgroundElement: string;
  backgroundSelected: string;
  border: string;
  /** Brand colour: primary buttons, selections, links. */
  accent: string;
  /** Solid ledge under accent buttons. */
  accentShadow: string;
  onAccent: string;
  /** The "It happened now!" button. */
  action: string;
  actionShadow: string;
  onAction: string;
  success: string;
  successSoft: string;
  danger: string;
  highlight: string;
  onHighlight: string;
  cellEmpty: string;
}

export type ThemeColor = keyof ThemeColors;

export interface ThemeFonts {
  display: string;
  displayBold: string;
  body: string;
  bodyBold: string;
  bodyHeavy: string;
  mono: string;
}

export interface ThemePalette {
  colors: ThemeColors;
  /** Background tints for room icons, picked per room. */
  roomTints: readonly string[];
  /** Particle colours for the "new cell" celebration. */
  confetti: readonly string[];
}

export interface ThemeDefinition {
  id: ThemeId;
  light: ThemePalette;
  dark: ThemePalette;
  fonts: ThemeFonts;
  /** Font files to load before first render, keyed by the family names used in `fonts`. */
  fontAssets: Record<string, number>;
  radius: { sm: number; md: number; lg: number };
  /** Height of the solid ledge under buttons and cards; 0 for a flat look. */
  depth: number;
}

const mono = Platform.select({ ios: 'ui-monospace', web: 'monospace', default: 'monospace' });

const playful: ThemeDefinition = {
  id: 'playful',
  light: {
    colors: {
      text: '#1E1240',
      textSecondary: '#5B4F7A',
      background: '#F3EFFF',
      backgroundElement: '#FFFFFF',
      backgroundSelected: '#E4DCFF',
      border: '#E4DCFF',
      accent: '#6C3BFF',
      accentShadow: '#4A1FD6',
      onAccent: '#FFFFFF',
      action: '#F0434A',
      actionShadow: '#B8242A',
      onAction: '#FFFFFF',
      success: '#0B7A60',
      successSoft: '#C9F5E8',
      danger: '#D92D33',
      highlight: '#FFC93C',
      onHighlight: '#1E1240',
      cellEmpty: '#EEE9FF',
    },
    roomTints: ['#FFE9A8', '#C9F5E8', '#FFD6D7', '#DCD3FF', '#CDEBFF', '#FFE0C2'],
    confetti: ['#6C3BFF', '#F0434A', '#FFC93C', '#19C39C', '#56B4E9'],
  },
  dark: {
    colors: {
      text: '#F4F0FF',
      textSecondary: '#B9AEDB',
      background: '#150C2B',
      backgroundElement: '#231843',
      backgroundSelected: '#33265E',
      border: '#33265E',
      accent: '#7C55FF',
      accentShadow: '#4F2BCC',
      onAccent: '#FFFFFF',
      action: '#F0434A',
      actionShadow: '#A11E24',
      onAction: '#FFFFFF',
      success: '#3DDBB3',
      successSoft: '#123F35',
      danger: '#FF6B70',
      highlight: '#FFC93C',
      onHighlight: '#1E1240',
      cellEmpty: '#2E2254',
    },
    roomTints: ['#4A3A12', '#123F35', '#4A1C24', '#33265E', '#173A52', '#4A2E14'],
    confetti: ['#9B7BFF', '#FF5A5F', '#FFC93C', '#3DDBB3', '#56B4E9'],
  },
  fonts: {
    display: 'Fredoka_600SemiBold',
    displayBold: 'Fredoka_700Bold',
    body: 'Nunito_600SemiBold',
    bodyBold: 'Nunito_700Bold',
    bodyHeavy: 'Nunito_800ExtraBold',
    mono,
  },
  fontAssets: {
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  },
  radius: { sm: 12, md: 18, lg: 24 },
  depth: 5,
};

/** Add new looks here (e.g. "neon", "paper"); screens only read tokens, never theme ids. */
export const THEMES = { playful } as const;

export type ThemeId = 'playful';
export const DEFAULT_THEME_ID: ThemeId = 'playful';
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

/** Fonts of every theme, loaded once at startup so switching themes never waits. */
export const ALL_FONT_ASSETS: Record<string, number> = Object.assign({}, ...THEME_IDS.map((id) => THEMES[id].fontAssets));
