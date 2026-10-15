import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/theme/theme-provider';

/**
 * Icon background, also the native splash colour (app.json). Fixed across themes like any logo;
 * the store/device files live in `assets/brand/`.
 */
export const LOGO_BACKGROUND = '#FFC93C';

/** The "clock check" mark: a tilted cell whose clock hands form a check, meeting at the clock's centre. */
export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect x={0} y={0} width={100} height={100} rx={22} fill={LOGO_BACKGROUND} />
      <G transform="rotate(-8 50 50)">
        <Rect x={21} y={25} width={58} height={58} rx={15} fill="#E0A800" />
        <Rect x={21} y={20} width={58} height={58} rx={15} fill="#FFFFFF" />
        <Path d="M34 49 L46 61 L68 36" stroke="#6C3BFF" strokeWidth={8.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Circle cx={46} cy={61} r={5} fill="#F0434A" />
      </G>
    </Svg>
  );
}

/** Mark + "Time·gami" wordmark, as on the store listing. */
export function Wordmark({ size = 36, color }: { size?: number; color?: string }) {
  const { colors } = useAppTheme();
  const text = { fontSize: size, lineHeight: size * 1.2 };
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="Timegami" style={styles.row}>
      <LogoMark size={size * 1.2} />
      <ThemedText type="title" style={[styles.text, text, { color: color ?? colors.text }]}>
        Time<ThemedText type="title" style={[text, { color: color ?? colors.accent }]}>gami</ThemedText>
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  text: {
    letterSpacing: -0.5,
  },
});
