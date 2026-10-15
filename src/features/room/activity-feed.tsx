import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { recentActivity } from '@/domain';
import type { MarkDoc, Member } from '@/features/rooms/api';
import { formatAgo } from '@/lib/format';
import { useAppTheme } from '@/theme/theme-provider';

const LIMIT = 8;

/** "Ahmet captured 03:47 · 5 min ago" — the latest marks of everyone in the room. */
export function ActivityFeed({
  marks,
  members,
  now,
  labelOf,
  onCellPress,
}: {
  marks: MarkDoc[];
  members: Map<string, Member>;
  now: number;
  labelOf: (cell: number) => string;
  onCellPress: (cell: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const items = recentActivity(marks, LIMIT);

  return (
    <Card style={styles.card}>
      <ThemedText type="heading">{t('room.activityTitle')}</ThemedText>
      {items.length === 0 && <ThemedText themeColor="textSecondary">{t('room.activityEmpty')}</ThemedText>}
      {items.map(({ mark, firstFill }) => {
        const member = members.get(mark.uid);
        return (
          <Pressable key={mark.id} accessibilityRole="button" onPress={() => onCellPress(mark.cellIndex)} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: member?.color ?? colors.textSecondary }]} />
            <ThemedText type="small" style={styles.text} numberOfLines={2}>
              <ThemedText type="smallBold">{member?.nickname ?? '?'}</ThemedText>{' '}
              {t(firstFill ? 'room.activityNew' : 'room.activityRepeat', { cell: labelOf(mark.cellIndex) })}
            </ThemedText>
            {firstFill && <Icon name="star" size={16} color={colors.highlight} />}
            <ThemedText type="caption" themeColor="textSecondary">
              {formatAgo(t, mark.occurredAt, now)}
            </ThemedText>
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  item: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  text: {
    flex: 1,
  },
});
