import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { missingRanges } from '@/domain';
import { tapFeedback } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';

const VISIBLE_RANGES = 24;

/** Cells still to fill, as tappable ranges ("03:12–03:15"). Collapsed until opened. */
export function MissingList({
  filled,
  cellCount,
  labelOf,
  onCellPress,
}: {
  filled: Set<number>;
  cellCount: number;
  labelOf: (cell: number) => string;
  onCellPress: (cell: number) => void;
}) {
  const { t } = useTranslation();
  const { colors, definition } = useAppTheme();
  const [open, setOpen] = useState(false);
  const ranges = useMemo(() => missingRanges(filled, cellCount), [filled, cellCount]);
  const missing = cellCount - filled.size;

  if (missing === 0) {
    return (
      <Card>
        <ThemedText type="smallBold" themeColor="success" style={styles.center}>
          {t('room.missingNone')}
        </ThemedText>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          tapFeedback();
          setOpen(!open);
        }}
        style={styles.header}>
        <ThemedText type="heading" style={styles.title}>
          {t('room.missingTitle')}
        </ThemedText>
        <ThemedText type="heading" themeColor="action">
          {missing}
        </ThemedText>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={20} color={colors.textSecondary} />
      </Pressable>
      {open && (
        <View style={styles.chips}>
          {ranges.slice(0, VISIBLE_RANGES).map((range) => (
            <Pressable
              key={range.first}
              accessibilityRole="button"
              onPress={() => onCellPress(range.first)}
              style={[styles.chip, { backgroundColor: colors.backgroundSelected, borderRadius: definition.radius.sm }]}>
              <ThemedText type="caption">
                {range.first === range.last ? labelOf(range.first) : `${labelOf(range.first)} – ${labelOf(range.last)}`}
              </ThemedText>
            </Pressable>
          ))}
          {ranges.length > VISIBLE_RANGES && (
            <ThemedText type="caption" themeColor="textSecondary" style={styles.more}>
              {t('room.missingMore', { count: ranges.length - VISIBLE_RANGES })}
            </ThemedText>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  more: {
    alignSelf: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
