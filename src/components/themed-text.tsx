import { Text, type TextProps, type TextStyle } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useAppTheme } from '@/theme/theme-provider';
import type { ThemeFonts } from '@/theme/themes';

type TextType = 'default' | 'title' | 'subtitle' | 'heading' | 'small' | 'smallBold' | 'caption' | 'link' | 'code';

export type ThemedTextProps = TextProps & {
  type?: TextType;
  themeColor?: ThemeColor;
};

/** Custom font families carry their own weight, so no `fontWeight` here (it breaks them on Android). */
const TYPES: Record<TextType, { font: keyof ThemeFonts; size: number; lineHeight: number }> = {
  title: { font: 'displayBold', size: 44, lineHeight: 50 },
  subtitle: { font: 'display', size: 28, lineHeight: 34 },
  heading: { font: 'display', size: 22, lineHeight: 28 },
  default: { font: 'body', size: 16, lineHeight: 24 },
  small: { font: 'body', size: 14, lineHeight: 20 },
  smallBold: { font: 'bodyHeavy', size: 14, lineHeight: 20 },
  caption: { font: 'bodyHeavy', size: 12, lineHeight: 16 },
  link: { font: 'bodyHeavy', size: 15, lineHeight: 22 },
  code: { font: 'mono', size: 12, lineHeight: 16 },
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const { colors, definition } = useAppTheme();
  const spec = TYPES[type];
  const base: TextStyle = {
    color: colors[themeColor ?? (type === 'link' ? 'accent' : 'text')],
    fontFamily: definition.fonts[spec.font],
    fontSize: spec.size,
    lineHeight: spec.lineHeight,
  };
  return <Text style={[base, style]} {...rest} />;
}
