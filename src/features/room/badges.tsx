import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Burst } from '@/components/motion';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { BadgeId } from '@/domain';
import { useAppTheme } from '@/theme/theme-provider';

export const BADGE_EMOJI: Record<BadgeId, string> = {
  firstCell: '🌱',
  quarter: '🥉',
  half: '🥈',
  complete: '🏆',
  nightOwl: '🦉',
  fullHour: '⏰',
  streak7: '🔥',
  streak30: '🌋',
};

export function BadgesCard({ available, earned }: { available: BadgeId[]; earned: Set<BadgeId> }) {
  const { t } = useTranslation();
  const { colors, definition } = useAppTheme();
  const count = available.filter((id) => earned.has(id)).length;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="heading" style={styles.title}>
          {t('badges.title')}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {count} / {available.length}
        </ThemedText>
      </View>
      <View style={styles.grid}>
        {available.map((id) => {
          const has = earned.has(id);
          return (
            <View
              key={id}
              accessible
              accessibilityLabel={`${t(`badges.${id}.name`)}: ${t(`badges.${id}.description`)}${has ? '' : ` (${t('badges.locked')})`}`}
              style={[
                styles.badge,
                { borderRadius: definition.radius.md, backgroundColor: has ? colors.backgroundSelected : colors.background },
              ]}>
              <ThemedText style={[styles.emoji, !has && styles.locked]}>{BADGE_EMOJI[id]}</ThemedText>
              <ThemedText type="caption" themeColor={has ? 'text' : 'textSecondary'} style={styles.center} numberOfLines={2}>
                {t(`badges.${id}.name`)}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

/** Full-screen moment for a newly earned badge. */
export function BadgeCelebration({ badge, onClose }: { badge: BadgeId | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { palette } = useAppTheme();
  return (
    <Modal visible={badge !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {badge && (
          <Card style={styles.celebration}>
            <View style={styles.burst}>
              <ThemedText style={styles.bigEmoji}>{BADGE_EMOJI[badge]}</ThemedText>
              <Burst trigger={1} colors={palette.confetti} />
            </View>
            <ThemedText type="caption" themeColor="accent">
              {t('badges.newBadge')}
            </ThemedText>
            <ThemedText type="subtitle" style={styles.center}>
              {t(`badges.${badge}.name`)}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              {t(`badges.${badge}.description`)}
            </ThemedText>
            <Button title={t('badges.great')} onPress={onClose} style={styles.button} />
          </Card>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  badge: {
    width: '23%',
    flexGrow: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  emoji: {
    fontSize: 28,
    lineHeight: 36,
  },
  locked: {
    opacity: 0.25,
  },
  center: {
    textAlign: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,10,40,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  celebration: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  burst: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigEmoji: {
    fontSize: 80,
    lineHeight: 96,
  },
  button: {
    alignSelf: 'stretch',
    marginTop: Spacing.three,
  },
});
