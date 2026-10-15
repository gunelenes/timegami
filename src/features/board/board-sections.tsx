import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { GridSection } from '@/domain';
import { BoardGrid, type CellStatus } from '@/features/board/board-grid';
import { tapFeedback } from '@/lib/haptics';
import { useAppTheme } from '@/theme/theme-provider';

interface BoardSectionsProps {
  sections: GridSection[];
  filled: Set<number>;
  nowCell: number | null;
  locale: string;
  statusOf: (cell: number) => CellStatus;
  labelOf: (cell: number) => string;
  onCellPress: (cell: number) => void;
  zoomHint?: string;
}

/**
 * Large boards as a list of progress bars (e.g. one per weekday). Only the opened section draws
 * its cells; the one holding "now" starts open, so the player lands on today.
 */
export function BoardSections({ sections, filled, nowCell, locale, statusOf, labelOf, onCellPress, zoomHint }: BoardSectionsProps) {
  const { t } = useTranslation();
  const nowIndex = nowCell === null ? -1 : sections.findIndex((s) => nowCell >= s.first && nowCell < s.first + s.count);
  const [open, setOpen] = useState<number | null>(nowIndex >= 0 ? nowIndex : null);

  const counts = useMemo(() => {
    const result = sections.map(() => 0);
    for (const cell of filled) {
      const i = sections.findIndex((s) => cell >= s.first && cell < s.first + s.count);
      if (i >= 0) result[i]++;
    }
    return result;
  }, [sections, filled]);

  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });

  return (
    <View style={styles.list}>
      {sections.map((section, i) => {
        const expanded = open === i;
        return (
          <View key={section.first} style={styles.section}>
            <SectionRow
              label={section.label}
              isNow={i === nowIndex}
              nowLabel={t('room.current')}
              ratio={counts[i] / section.count}
              value={percent.format(Math.floor((counts[i] / section.count) * 100) / 100)}
              expanded={expanded}
              onPress={() => {
                tapFeedback();
                setOpen(expanded ? null : i);
              }}
            />
            {expanded && (
              <BoardGrid layout={section.layout} statusOf={statusOf} labelOf={labelOf} onCellPress={onCellPress} zoomHint={zoomHint} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function SectionRow({
  label,
  isNow,
  nowLabel,
  ratio,
  value,
  expanded,
  onPress,
}: {
  label: string;
  isNow: boolean;
  nowLabel: string;
  ratio: number;
  value: string;
  expanded: boolean;
  onPress: () => void;
}) {
  const { colors, definition } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${label}, ${value}`}
      onPress={onPress}
      style={[
        styles.row,
        { borderRadius: definition.radius.md, backgroundColor: expanded ? colors.backgroundSelected : 'transparent' },
      ]}>
      <View style={styles.rowHeader}>
        <ThemedText type="smallBold" style={styles.rowLabel} numberOfLines={1}>
          {label}
        </ThemedText>
        {isNow && (
          <View style={[styles.nowBadge, { backgroundColor: colors.action, borderRadius: definition.radius.sm }]}>
            <ThemedText type="caption" style={{ color: colors.onAction }}>
              {nowLabel}
            </ThemedText>
          </View>
        )}
        <ThemedText type="smallBold" themeColor="accent">
          {value}
        </ThemedText>
        <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={18} color={colors.textSecondary} />
      </View>
      <View style={[styles.track, { backgroundColor: colors.cellEmpty }]}>
        <View style={[styles.bar, { width: `${Math.min(100, ratio * 100)}%`, backgroundColor: colors.accent }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  row: {
    minHeight: 52,
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
  },
  nowBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  track: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  bar: {
    height: 10,
    borderRadius: 5,
  },
});
