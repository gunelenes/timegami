import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Svg, { Rect } from 'react-native-svg';

import { LogoMark } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { NO_CELL, type GridLayout } from '@/domain';
import { useAppTheme } from '@/theme/theme-provider';

/** Story-sized (9:16) export; drawn at 360×640 and captured at 1080×1920. */
const WIDTH = 360;
const HEIGHT = 640;
const GRID_WIDTH = WIDTH - 2 * Spacing.four - 2 * Spacing.three;
const GRID_MAX_HEIGHT = 240;

export const canShareImage = Platform.OS === 'ios' || Platform.OS === 'android';

export interface ShareImageData {
  emoji: string;
  name: string;
  percent: string;
  detail: string;
  /** Whole grid for normal boards; null for sectioned boards, which show one bar per section. */
  layout: GridLayout | null;
  sections: { label: string; ratio: number }[] | null;
  colorsOf: (cell: number) => string[];
}

/**
 * Renders the share card off-screen whenever `request` changes, captures it and opens the share sheet.
 */
export function ShareImage({ request, data }: { request: number; data: ShareImageData }) {
  const { t } = useTranslation();
  const ref = useRef<View>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (request === 0 || !canShareImage) return;
    setRendering(true);
  }, [request]);

  useEffect(() => {
    if (!rendering) return;
    // Give the SVG grid a moment to paint before taking the picture.
    const timer = setTimeout(async () => {
      try {
        const uri = await captureRef(ref, { format: 'png', quality: 1, width: WIDTH * 3, height: HEIGHT * 3, result: 'tmpfile' });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('room.shareImage') });
      } catch (e) {
        console.error(e);
        Alert.alert(t('errors.generic'));
      } finally {
        setRendering(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [rendering, t]);

  if (!rendering) return null;
  return (
    <View style={styles.offscreen} pointerEvents="none">
      <ShareCard ref={ref} data={data} />
    </View>
  );
}

function ShareCard({ ref, data }: { ref: React.Ref<View>; data: ShareImageData }) {
  const { t } = useTranslation();
  const { colors, definition } = useAppTheme();
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <LinearGradient colors={[colors.accent, colors.accentShadow]} style={StyleSheet.absoluteFill} />
      <View style={styles.brand}>
        <LogoMark size={64} />
        <ThemedText type="title" style={[styles.brandText, { color: colors.onAccent }]}>
          Timegami
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: colors.onAccent, opacity: 0.85 }}>
          {t('home.tagline')}
        </ThemedText>
      </View>

      <View style={[styles.panel, { backgroundColor: colors.backgroundElement, borderRadius: definition.radius.lg }]}>
        <ThemedText type="heading" numberOfLines={2} style={styles.center}>
          {data.emoji} {data.name}
        </ThemedText>
        <ThemedText type="title" themeColor="accent" style={styles.percent}>
          {data.percent}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {data.detail}
        </ThemedText>
        {data.layout ? (
          <GridPicture layout={data.layout} colorsOf={data.colorsOf} empty={colors.cellEmpty} />
        ) : (
          <SectionBars sections={data.sections ?? []} color={colors.accent} track={colors.cellEmpty} />
        )}
      </View>

      <ThemedText type="caption" style={[styles.footer, { color: colors.onAccent }]}>
        timegami
      </ThemedText>
    </View>
  );
}

function GridPicture({ layout, colorsOf, empty }: { layout: GridLayout; colorsOf: (cell: number) => string[]; empty: string }) {
  const rows = layout.rows.length;
  const size = Math.min(GRID_WIDTH / layout.columns, GRID_MAX_HEIGHT / rows);
  const gap = size > 4 ? size * 0.12 : 0;
  const inner = size - gap;
  return (
    <Svg width={size * layout.columns} height={size * rows}>
      {layout.rows.flatMap((row, r) =>
        row.cells.map((cell, c) => {
          if (cell === NO_CELL) return null;
          const fills = colorsOf(cell);
          const x = c * size;
          const y = r * size;
          if (fills.length === 0) return <Rect key={cell} x={x} y={y} width={inner} height={inner} fill={empty} />;
          const stripe = inner / fills.length;
          return fills.map((fill, i) => <Rect key={`${cell}-${i}`} x={x + i * stripe} y={y} width={stripe} height={inner} fill={fill} />);
        }),
      )}
    </Svg>
  );
}

function SectionBars({ sections, color, track }: { sections: { label: string; ratio: number }[]; color: string; track: string }) {
  return (
    <View style={styles.bars}>
      {sections.map((s) => (
        <View key={s.label} style={styles.barRow}>
          <ThemedText type="caption" style={styles.barLabel} numberOfLines={1}>
            {s.label}
          </ThemedText>
          <View style={[styles.barTrack, { backgroundColor: track }]}>
            <View style={[styles.barFill, { width: `${Math.min(100, s.ratio * 100)}%`, backgroundColor: color }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -10_000,
    top: 0,
  },
  card: {
    width: WIDTH,
    height: HEIGHT,
    padding: Spacing.four,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.three,
  },
  brandText: {
    fontSize: 40,
    lineHeight: 46,
  },
  panel: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  percent: {
    fontSize: 56,
    lineHeight: 62,
  },
  center: {
    textAlign: 'center',
  },
  bars: {
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  barLabel: {
    width: 90,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: 5,
  },
  footer: {
    textAlign: 'center',
    letterSpacing: 2,
    opacity: 0.85,
  },
});
