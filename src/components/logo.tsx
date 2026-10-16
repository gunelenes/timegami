import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useAppTheme } from '@/theme/theme-provider';

/**
 * Icon background, also the native splash colour (app.json). Fixed across themes like any logo;
 * the store/device files live in `assets/brand/` (regenerate with `npm run brand:build`).
 */
export const LOGO_BACKGROUND = '#FFC93C';

const LOGO_COLORS = {
  filled: '#6C3BFF',
  empty: '#FFE7A3',
  now: '#FFFFFF',
  centre: '#F0434A',
};

/** First/last column of each row of the 9×9 grid that forms the disc. Keep in sync with scripts/build-brand-assets.js. */
const RING_ROWS: [number, number][] = [[2, 6], [1, 7], [0, 8], [0, 8], [0, 8], [0, 8], [0, 8], [1, 7], [2, 6]];
const CELL_START = 12.8;
const CELL_STEP = 8.445;
const CELL_SIZE = 6.84;

type RingCell = { x: number; y: number; fill: string };

/** Cells filled clockwise from 12 o'clock up to ~250°, then a white "now" slice, the rest still empty. */
const RING_CELLS: RingCell[] = RING_ROWS.flatMap(([from, to], row) =>
  Array.from({ length: to - from + 1 }, (_, i) => {
    const col = from + i;
    const x = CELL_START + col * CELL_STEP;
    const y = CELL_START + row * CELL_STEP;
    const dx = x + CELL_SIZE / 2 - 50;
    const dy = y + CELL_SIZE / 2 - 50;
    let angle = col === 4 && row <= 4 ? 0 : (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    const fill = angle <= 248 ? LOGO_COLORS.filled : angle <= 272 ? LOGO_COLORS.now : LOGO_COLORS.empty;
    return { x, y, fill };
  }),
);

/** The "cell ring" mark: a disc of grid cells filling up like a clock, with the clock's centre dot. */
export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rect x={0} y={0} width={100} height={100} rx={22} fill={LOGO_BACKGROUND} />
      {RING_CELLS.map((cell, i) => (
        <Rect key={i} x={cell.x} y={cell.y} width={CELL_SIZE} height={CELL_SIZE} rx={1.6} fill={cell.fill} />
      ))}
      <Circle cx={50} cy={50} r={4.2} fill={LOGO_COLORS.centre} stroke={LOGO_BACKGROUND} strokeWidth={1.6} />
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
